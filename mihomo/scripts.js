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

  const content = await produceArtifact({
    type,
    name: source,
    platform: "ClashMeta",
  });
  const proxies = ProxyUtils.yaml.parse(content)?.proxies;
  if (!Array.isArray(proxies) || proxies.length === 0) {
    throw new Error("Sub-Store 没有生成可用的 Mihomo 节点");
  }

  // 保留模板中的直连等节点，再追加订阅节点。
  config.proxies = [...(config.proxies || []), ...proxies];

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

  fillProxyGroups(config);
  return { ...input, $content: ProxyUtils.yaml.stringify(config) };
}

function fillProxyGroups(config) {
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
    const names = config.proxies
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
