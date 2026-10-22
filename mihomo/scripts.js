const BUILTIN_PROXIES = ["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"];
const DEFAULT_RELAY_COUNTRIES = ["HK", "TW", "JP", "SG", "US"];
const RELAY_REGIONS = {
  HK: { name: "香港", aliases: /香港|hong\s*kong/i, codes: "hk|hkg" },
  TW: { name: "台湾", aliases: /台湾|台灣|台北|臺北|taiwan|taipei/i, codes: "tw|twn|tpe|tsa|khh" },
  JP: { name: "日本", aliases: /日本|东京|東京|大阪|japan|tokyo|osaka/i, codes: "jp|jpn|nrt|hnd|kix|itm|tyo" },
  SG: { name: "新加坡", aliases: /新加坡|狮城|獅城|singapore/i, codes: "sg|sgp|sin" },
  US: { name: "美国", aliases: /美国|美國|美西|美东|美東|united states|america|los angeles|san jose|seattle|new york/i, codes: "us|usa|lax|sfo|sjc|sea|nyc|jfk|ewr|iad|ord|dfw|atl" },
};

async function operator(input = {}) {
  if (!input || Array.isArray(input) || typeof input !== "object") {
    throw new Error("必须作为 Sub-Store“文件”的脚本操作使用");
  }

  const args = typeof $arguments === "undefined" ? {} : $arguments;
  const source = typeof args.source === "string" ? args.source.trim() : "";
  const type = String(args.type || "subscription").trim().toLowerCase();
  if (!source) throw new Error("缺少脚本参数 source");
  if (!["subscription", "collection"].includes(type)) {
    throw new Error("type 只能是 subscription 或 collection");
  }

  const config = ProxyUtils.yaml.parse(input.$content, { merge: true });
  if (!config || Array.isArray(config) || typeof config !== "object") {
    throw new Error("文件内容必须是 Mihomo YAML 配置对象");
  }
  if (config.proxies != null && !Array.isArray(config.proxies)) {
    throw new Error("模板中的 proxies 必须是数组");
  }

  if (config["proxy-groups"] != null && !Array.isArray(config["proxy-groups"])) {
    throw new Error("模板中的 proxy-groups 必须是数组");
  }
  const landings = parseStringList(args.landings, "landings");
  const relayCountries = parseRelayCountries(args.relay);
  const requests = [
    { type, name: source },
    ...landings.map((name) => ({ type: "subscription", name })),
  ];
  const results = await Promise.all(requests.map(async (request) => {
    try {
      const content = await produceArtifact({ ...request, platform: "ClashMeta" });
      const proxies = ProxyUtils.yaml.parse(content)?.proxies;
      if (!Array.isArray(proxies) || proxies.length === 0) {
        throw new Error("Sub-Store 没有生成可用的 Mihomo 节点");
      }
      for (const proxy of proxies) {
        if (!proxy || typeof proxy.name !== "string" || !proxy.name.trim() ||
            typeof proxy.type !== "string" || !proxy.type) {
          throw new Error("Sub-Store 返回的节点缺少 name 或 type");
        }
      }
      return { ...request, proxies };
    } catch (error) {
      return { ...request, error: String(error?.message || error) };
    }
  }));
  if (results[0].error) throw new Error(`主来源读取失败：${results[0].error}`);
  for (const result of results.slice(1)) {
    if (result.error) reportWarning(`落地订阅 ${result.name} 读取失败，已跳过：${result.error}`);
  }
  const generated = buildRelayNodes(config, results.filter((result) => !result.error), {
    relayCountries,
    relayTag: typeof args.relayTag === "string" && args.relayTag.trim()
      ? args.relayTag.trim() : "🔗 中转选择",
  });
  // 链路辅助节点不加入模板的地区组，避免绕过落地节点直接选择链尾。
  const visibleProxies = [...(config.proxies || []), ...generated.proxies];
  config.proxies = [...visibleProxies, ...generated.helpers];

  // 移除空 URL 的 HTTP 订阅占位，避免 Mihomo 加载失败；保留有效 provider。
  const providers = config["proxy-providers"];
  if (providers && typeof providers === "object") {
    for (const [name, provider] of Object.entries(providers)) {
      if (provider?.type === "http" && !String(provider.url ?? "").trim()) {
        delete providers[name];
      }
    }
    if (Object.keys(providers).length === 0) delete config["proxy-providers"];
  }

  fillProxyGroups(config, visibleProxies);
  if (generated.groups.length > 0) {
    config["proxy-groups"] = [...(config["proxy-groups"] || []), ...generated.groups];
  }
  validateProxyGraph(config);
  return { ...input, $content: ProxyUtils.yaml.stringify(config) };
}

function parseStringList(value, label) {
  if (value == null || value === "") return [];
  let values = value;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith("[")) {
      try { values = JSON.parse(text); }
      catch (error) { throw new Error(`${label} 不是有效的 JSON 数组：${error.message}`); }
    } else {
      values = text.split(/[\n,]+/);
    }
  }
  if (!Array.isArray(values) || values.some((item) => typeof item !== "string")) {
    throw new Error(`${label} 必须是名称字符串、字符串数组或 JSON 数组字符串`);
  }
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function parseRelayCountries(value) {
  const countries = parseStringList(value, "relay").map((code) => {
    const iso = code.toUpperCase() === "UK" ? "GB" : code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) throw new Error(`relay 包含无效国家代码 ${code}`);
    return iso;
  });
  return countries.length ? [...new Set(countries)] : [...DEFAULT_RELAY_COUNTRIES];
}

function buildRelayNodes(config, sources, options) {
  const landingNames = new Set(sources.slice(1).flatMap((source) =>
    source.proxies.map((proxy) => proxy.name),
  ));
  const byName = new Map();
  for (const source of sources) {
    for (const proxy of source.proxies) {
      if (byName.has(proxy.name)) {
        reportWarning(`重复节点名 ${proxy.name}，保留首次读取的节点；如非同一节点请先重命名`);
        continue;
      }
      byName.set(proxy.name, { ...proxy });
    }
  }
  const usedNames = new Set(BUILTIN_PROXIES);
  for (const item of [...(config.proxies || []), ...(config["proxy-groups"] || []), ...byName.values()]) {
    if (!item || typeof item.name !== "string" || !item.name.trim()) {
      throw new Error("节点或代理组缺少 name");
    }
    if (usedNames.has(item.name)) {
      throw new Error(`节点、模板或内置名称冲突：${item.name}；请先重命名`);
    }
    usedNames.add(item.name);
  }
  usedNames.add("GLOBAL");
  for (const name of Object.keys(config["proxy-providers"] || {})) usedNames.add(name);
  const allocateName = (base) => {
    let name = base;
    let suffix = 2;
    while (usedNames.has(name)) name = `${base} (${suffix++})`;
    usedNames.add(name);
    return name;
  };
  const ordinary = [...byName.values()].filter((proxy) => !landingNames.has(proxy.name));
  const landingByName = new Map([...byName].filter(([name]) => landingNames.has(name)));
  const plans = [];
  for (const proxy of landingByName.values()) {
    try {
      plans.push(resolveLandingChain(proxy, landingByName));
    } catch (error) {
      reportWarning(`已跳过落地节点 ${proxy.name}：${error.message}`);
    }
  }
  if (!ordinary.length && !plans.length) throw new Error("没有可用的 Mihomo 节点");
  if (!plans.length) return { proxies: ordinary, helpers: [], groups: [] };

  const relayNodes = ordinary.filter(isNetworkProxy);
  if (!relayNodes.length) throw new Error("没有可作为中转的普通节点，无法生成落地节点链路");
  const groups = [];
  const countryGroups = [];
  const countryByName = new Map(relayNodes.map((proxy) =>
    [proxy.name, detectRelayCountry(proxy.name, options.relayCountries)],
  ));
  for (const iso of options.relayCountries) {
    const members = relayNodes.filter((proxy) => countryByName.get(proxy.name) === iso)
      .map((proxy) => proxy.name);
    if (!members.length) continue;
    const flag = String.fromCodePoint(...[...iso].map((letter) => 127397 + letter.charCodeAt(0)));
    const name = allocateName(`${flag} ${RELAY_REGIONS[iso]?.name || iso} · 中转`);
    groups.push({ name, type: "select", proxies: members });
    countryGroups.push(name);
  }
  const relayName = allocateName(options.relayTag);
  groups.push({ name: relayName, type: "select", proxies: [...countryGroups, ...relayNodes.map((proxy) => proxy.name)] });
  const landings = [];
  const helpers = [];
  for (const plan of plans) {
    const selector = allocateName(`🔗 ${plan[0].name} · 中转选择`);
    // 首项即默认选择；每个落地节点可以独立选中转，也可跟随总中转组。
    groups.push({ name: selector, type: "select", proxies: [relayName, ...countryGroups] });
    const chain = plan.map((proxy, index) => ({
      ...proxy,
      name: index === 0 ? proxy.name : allocateName(`${plan[0].name} · ${proxy.name} · 链路`),
    }));
    for (const [index, proxy] of chain.entries()) {
      proxy["dialer-proxy"] = chain[index + 1]?.name || selector;
    }
    landings.push(chain[0]);
    // 复制已有链路的辅助节点，避免多个落地节点共享链尾时相互覆盖中转选择。
    helpers.push(...chain.slice(1));
  }
  return { proxies: [...ordinary, ...landings], helpers, groups };
}

function isNetworkProxy(proxy) {
  return !["direct", "reject", "reject-drop", "pass", "dns"].includes(proxy.type.toLowerCase());
}

function resolveLandingChain(root, landingByName) {
  const chain = [];
  const visited = new Set();
  let current = root;
  while (current) {
    if (visited.has(current.name)) throw new Error("原有 dialer-proxy 链存在循环");
    if (!isNetworkProxy(current)) throw new Error("落地链包含不能作为代理出口的节点");
    visited.add(current.name);
    chain.push(current);
    const next = current["dialer-proxy"];
    if (next == null || next === "") return chain;
    if (typeof next !== "string" || !landingByName.has(next)) {
      throw new Error("原有 dialer-proxy 指向落地节点集合之外，无法安全追加中转");
    }
    current = landingByName.get(next);
  }
  throw new Error("无法解析原有 dialer-proxy 链");
}

function detectRelayCountry(name, countries) {
  const flag = name.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0];
  if (flag) return [...flag].map((letter) => String.fromCharCode(letter.codePointAt(0) - 127397)).join("");
  for (const [iso, region] of Object.entries(RELAY_REGIONS)) {
    const codes = new RegExp(`(?:^|[^a-z])(?:${region.codes})(?:\\d+)?(?=$|[^a-z])`, "i");
    if (region.aliases.test(name) || codes.test(name)) return iso;
  }
  try {
    const iso = String(ProxyUtils.getISO(name) || "").toUpperCase();
    if (/^[A-Z]{2}$/.test(iso)) return iso === "UK" ? "GB" : iso;
  } catch (_) { /* 未提供 getISO 时仍可按国家代码分组。 */ }
  return countries.find((iso) => new RegExp(`(?:^|[^a-z])${iso}(?:\\d+)?(?=$|[^a-z])`, "i").test(name));
}

function validateProxyGraph(config) {
  const graph = new Map();
  const builtins = new Set([...BUILTIN_PROXIES, "GLOBAL"]);
  for (const proxy of config.proxies) {
    const dialer = proxy["dialer-proxy"];
    graph.set(proxy.name, dialer == null || dialer === "" ? [] : [dialer]);
  }
  const providers = new Set(Object.keys(config["proxy-providers"] || {}));
  for (const group of config["proxy-groups"] || []) {
    const members = group.proxies || [];
    const uses = group["include-all-providers"] ? [...providers] : group.use || [];
    if (!Array.isArray(members) || !Array.isArray(uses)) throw new Error(`代理组 ${group.name} 的 proxies/use 必须是数组`);
    if (!members.length && !uses.length) throw new Error(`代理组 ${group.name} 没有成员`);
    for (const name of uses) {
      if (!providers.has(name)) throw new Error(`代理组 ${group.name} 引用了不存在的 provider ${name}`);
    }
    graph.set(group.name, members);
  }
  const visiting = new Set();
  const visited = new Set();
  const path = [];
  const visit = (name) => {
    if (visiting.has(name)) {
      throw new Error(`代理链路存在循环：${[...path.slice(path.indexOf(name)), name].join(" -> ")}`);
    }
    if (visited.has(name) || !graph.has(name)) return;
    visiting.add(name);
    path.push(name);
    for (const dependency of graph.get(name)) {
      if (typeof dependency !== "string" || (!graph.has(dependency) && !builtins.has(dependency))) {
        throw new Error(`${name} 引用了不存在的代理或组 ${String(dependency)}`);
      }
      visit(dependency);
    }
    path.pop();
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of graph.keys()) visit(name);
}

function reportWarning(message) {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`[mihomo] ${message}`);
  }
}

function fillProxyGroups(config, candidates = config.proxies) {
  const groups = config["proxy-groups"] || [];
  if (!Array.isArray(groups)) throw new Error("模板中的 proxy-groups 必须是数组");
  const providerNames = Object.keys(config["proxy-providers"] || {});

  for (const group of groups) {
    if (!group?.["include-all"] && !group?.["include-all-proxies"]) continue;
    if (group.proxies != null && !Array.isArray(group.proxies)) {
      throw new Error(`代理组 ${group.name} 的 proxies 必须是数组`);
    }
    if (group.use != null && !Array.isArray(group.use)) {
      throw new Error(`代理组 ${group.name} 的 use 必须是数组`);
    }
    const include = createGroupMatcher(group.filter, true, `${group.name}.filter`);
    const exclude = createGroupMatcher(
      group["exclude-filter"], false, `${group.name}.exclude-filter`,
    );
    const names = candidates
      .map((proxy) => proxy.name)
      .filter((name) => typeof name === "string" && include(name));
    group.proxies = [...new Set([...(group.proxies || []), ...names])]
      .filter((name) => !exclude(name));

    // 将动态引入改成明确的成员列表；已有的远程 provider 仍通过 use 引入。
    if (group["include-all"] || group["include-all-providers"]) {
      group.use = [...providerNames];
    }
    delete group["include-all"];
    delete group["include-all-proxies"];
    delete group["include-all-providers"];
    if (!group.use?.length) {
      delete group.use;
      delete group.filter;
      delete group["exclude-filter"];
      // 与 Mihomo 自动分组为空时的默认行为一致，避免生成无成员的策略组。
      if (group.proxies.length === 0) {
        group.proxies = [group["empty-fallback"] || "COMPATIBLE"];
      }
    }
  }
}

function createGroupMatcher(pattern, fallback, label) {
  if (pattern == null || pattern === "") return () => fallback;
  try {
    // 模板使用 Mihomo 的 (?i)；转换为 JS 的 i 标志，兼容旧模板中的内嵌写法。
    const expressions = String(pattern).split("`").map((part) =>
      new RegExp(part.replace(/\(\?i\)/g, ""), "i"),
    );
    return (name) => expressions.some((expression) => expression.test(name));
  } catch (error) {
    throw new Error(`代理组 ${label} 的正则无法用于节点分组：${error.message}`);
  }
}
