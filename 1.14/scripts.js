const COUNTRY_NAMES = {
  AE: "阿联酋",
  AR: "阿根廷",
  AT: "奥地利",
  AU: "澳大利亚",
  BE: "比利时",
  BR: "巴西",
  CA: "加拿大",
  CH: "瑞士",
  CL: "智利",
  CN: "中国",
  CZ: "捷克",
  DE: "德国",
  DK: "丹麦",
  ES: "西班牙",
  FI: "芬兰",
  FR: "法国",
  GB: "英国",
  GR: "希腊",
  HK: "香港",
  HU: "匈牙利",
  ID: "印度尼西亚",
  IE: "爱尔兰",
  IL: "以色列",
  IN: "印度",
  IS: "冰岛",
  IT: "意大利",
  JP: "日本",
  KR: "韩国",
  LU: "卢森堡",
  MO: "澳门",
  MX: "墨西哥",
  MY: "马来西亚",
  NL: "荷兰",
  NO: "挪威",
  NZ: "新西兰",
  PH: "菲律宾",
  PL: "波兰",
  PT: "葡萄牙",
  RO: "罗马尼亚",
  RU: "俄罗斯",
  SA: "沙特阿拉伯",
  SE: "瑞典",
  SG: "新加坡",
  TH: "泰国",
  TR: "土耳其",
  TW: "台湾",
  UA: "乌克兰",
  US: "美国",
  VN: "越南",
  ZA: "南非",
};

const DEFAULT_MAIN_COUNTRIES = [
  "HK",
  "TW",
  "JP",
  "SG",
  "KR",
  "US",
  "GB",
  "DE",
  "FR",
  "CA",
  "AU",
];

const DEFAULT_RELAY_COUNTRIES = ["HK", "TW", "JP", "SG", "US"];

const DIRECT_OUTBOUND_TAG = "direct";

const SERVICE_SELECTORS = [
  { tag: "🤖 AI 服务", defaultRoute: "proxy" },
  { tag: "✈️ Telegram", defaultRoute: "proxy" },
  { tag: "🔍 Google", defaultRoute: "proxy" },
  { tag: "🍎 Apple", defaultRoute: "direct" },
  { tag: "📺 哔哩哔哩", defaultRoute: "direct" },
  { tag: "🎬 Netflix", defaultRoute: "proxy" },
  { tag: "🎮 巴哈姆特", defaultRoute: "proxy" },
  { tag: "▶️ YouTube", defaultRoute: "proxy" },
  { tag: "🇨🇳 国内服务", defaultRoute: "direct" },
];

const RESERVED_OUTBOUND_TAGS = new Set([
  DIRECT_OUTBOUND_TAG,
  ...SERVICE_SELECTORS.map((service) => service.tag),
]);

const COUNTRY_MATCHERS = [
  {
    iso: "HK",
    flag: "🇭🇰",
    codes: ["hk", "hkg"],
    aliases: ["香港", "hong kong", "hongkong"],
  },
  {
    iso: "TW",
    flag: "🇹🇼",
    codes: ["tw", "twn", "tpe", "tsa", "khh"],
    aliases: ["台湾", "台灣", "台北", "臺北", "taiwan", "taipei", "kaohsiung"],
  },
  {
    iso: "JP",
    flag: "🇯🇵",
    codes: ["jp", "jpn", "nrt", "hnd", "kix", "itm", "tyo"],
    aliases: ["日本", "东京", "東京", "大阪", "japan", "tokyo", "osaka"],
  },
  {
    iso: "SG",
    flag: "🇸🇬",
    codes: ["sg", "sgp", "sin"],
    aliases: ["新加坡", "狮城", "獅城", "singapore"],
  },
  {
    iso: "KR",
    flag: "🇰🇷",
    codes: ["kr", "kor", "icn", "gmp", "sel"],
    aliases: ["韩国", "韓國", "首尔", "首爾", "south korea", "korea", "seoul"],
  },
  {
    iso: "US",
    flag: "🇺🇸",
    codes: [
      "us",
      "usa",
      "lax",
      "sfo",
      "sjc",
      "sea",
      "nyc",
      "jfk",
      "ewr",
      "iad",
      "ord",
      "dfw",
      "atl",
    ],
    aliases: [
      "美国",
      "美國",
      "美西",
      "美东",
      "美東",
      "洛杉矶",
      "洛杉磯",
      "圣何塞",
      "聖何塞",
      "西雅图",
      "西雅圖",
      "纽约",
      "紐約",
      "达拉斯",
      "達拉斯",
      "united states",
      "america",
      "california",
      "los angeles",
      "san jose",
      "seattle",
      "new york",
      "dallas",
      "chicago",
    ],
  },
  {
    iso: "GB",
    flag: "🇬🇧",
    codes: ["gb", "gbr", "uk", "lhr", "lgw", "lon"],
    aliases: [
      "英国",
      "英國",
      "伦敦",
      "倫敦",
      "united kingdom",
      "great britain",
      "britain",
      "england",
      "london",
    ],
  },
  {
    iso: "DE",
    flag: "🇩🇪",
    codes: ["de", "deu", "fra", "muc", "ber"],
    aliases: [
      "德国",
      "德國",
      "法兰克福",
      "法蘭克福",
      "慕尼黑",
      "柏林",
      "germany",
      "frankfurt",
      "munich",
      "berlin",
    ],
  },
  {
    iso: "FR",
    flag: "🇫🇷",
    codes: ["fr", "fra", "cdg", "ory", "par"],
    aliases: ["法国", "法國", "巴黎", "france", "paris"],
  },
  {
    iso: "CA",
    flag: "🇨🇦",
    codes: ["ca", "can", "yyz", "yvr", "yul"],
    aliases: [
      "加拿大",
      "多伦多",
      "多倫多",
      "温哥华",
      "溫哥華",
      "蒙特利尔",
      "蒙特利爾",
      "canada",
      "toronto",
      "vancouver",
      "montreal",
    ],
  },
  {
    iso: "AU",
    flag: "🇦🇺",
    codes: ["au", "aus", "syd", "mel", "bne", "per"],
    aliases: [
      "澳大利亚",
      "澳大利亞",
      "澳洲",
      "悉尼",
      "墨尔本",
      "墨爾本",
      "布里斯班",
      "珀斯",
      "australia",
      "sydney",
      "melbourne",
      "brisbane",
      "perth",
    ],
  },
];

async function operator(input = {}) {
  if (!input || Array.isArray(input) || typeof input !== "object") {
    throw new Error("country-groups 必须作为“文件”的脚本操作使用");
  }

  const args = typeof $arguments === "undefined" ? {} : $arguments;
  const diagnosticEnabled = toBoolean(args.diagnostic, false);
  const fail = (details) =>
    handleFailure(input, diagnosticEnabled, details);
  const sourceName = nonEmptyString(args.source, "");
  if (!sourceName) {
    return fail({
      sourceType: String(args.type ?? "subscription"),
      sourceName: "",
      error: "缺少脚本参数 source",
    });
  }

  let sourceType;
  try {
    sourceType = normalizeSourceType(args.type);
  } catch (error) {
    return fail({
      sourceType: String(args.type ?? ""),
      sourceName,
      error: String(error?.message || error),
    });
  }

  let landingSubscriptions;
  try {
    landingSubscriptions = parseStringList(args.landings);
  } catch (error) {
    return fail({
      sourceType,
      sourceName,
      error: String(error?.message || error),
    });
  }

  const sourceRequests = [
    { role: "ordinary", type: sourceType, name: sourceName },
    ...landingSubscriptions.map((name) => ({
      role: "landing",
      type: "subscription",
      name,
    })),
  ];
  const sourceResults = await Promise.all(
    sourceRequests.map(async (source) => {
      try {
        const proxies = await produceArtifact({
          type: source.type,
          name: source.name,
          platform: "JSON",
          produceType: "internal",
        });
        if (!Array.isArray(proxies)) {
          throw new Error("Sub-Store 没有返回内部节点数组");
        }
        return {
          ...source,
          proxies: proxies.map((proxy) =>
            attachSourceSubscription(proxy, source),
          ),
        };
      } catch (error) {
        return { ...source, error: String(error?.message || error) };
      }
    }),
  );
  const primarySource = sourceResults[0];
  if (primarySource.error) {
    return fail({
      sourceType,
      sourceName,
      error: `读取或解析节点失败：${primarySource.error}`,
    });
  }

  const failedLandingSources = sourceResults
    .slice(1)
    .filter((source) => source.error);
  if (failedLandingSources.length > 0) {
    reportWarning(
      `以下落地订阅读取失败，已跳过并继续生成：${failedLandingSources
        .map((source) => `${source.name}: ${source.error}`)
        .join("；")}`,
    );
  }

  const sourceRecords = sourceResults
    .filter((source) => !source.error)
    .flatMap((source) =>
      source.proxies.map((proxy) => ({
        proxy,
        role: source.role,
      })),
    );
  const landingNodeNames = new Set();
  for (const source of sourceResults.slice(1)) {
    if (source.error) continue;
    for (const proxy of source.proxies) {
      const name = String(proxy?.name || "");
      if (name) landingNodeNames.add(name);
    }
  }
  const proxies = sourceRecords.map((record) => record.proxy);

  let conversion;
  try {
    conversion = produceCompatibleNodes(proxies, args, (proxy) =>
      ProxyUtils.produce([proxy], "sing-box", "internal", {
        "include-unsupported-proxy": toBoolean(args.includeUnsupported, false),
      }),
    );
  } catch (error) {
    return fail({
      sourceType,
      sourceName,
      proxies,
      parsed: true,
      error: String(error?.message || error),
    });
  }
  const sourceNodes = conversion.bundles.map((bundle) => {
    const source = sourceRecords[bundle.index];
    const name = String(bundle.proxy.name || "");
    const role = landingNodeNames.has(name) ? "landing" : source.role;
    return {
      name,
      role,
      producedTags: bundle.items.map((item) => item.tag),
    };
  });
  let config;
  try {
    const generatedConfig = buildConfig(
      sourceNodes,
      conversion.produced,
      args,
      (name) => ProxyUtils.getISO(name),
    );
    const template = parseConfigTemplate(input.$content);
    config = mergeConfigTemplate(template, generatedConfig);
  } catch (error) {
    return fail({
      sourceType,
      sourceName,
      proxies,
      conversion,
      parsed: true,
      error: String(error?.message || error),
    });
  }

  return { ...input, $content: JSON.stringify(config, null, 2) };
}

function parseConfigTemplate(content) {
  const text = String(content ?? "").trim();
  if (
    !text ||
    /^(?:\/\/\s*)?(?:填入文件内容|paste file content here)\s*$/i.test(text)
  ) {
    return undefined;
  }

  let template;
  try {
    template = JSON.parse(text);
  } catch (error) {
    throw new Error(`文件内容不是有效的 sing-box JSON 模板：${error.message}`);
  }
  if (!template || Array.isArray(template) || typeof template !== "object") {
    throw new Error("sing-box JSON 模板的顶层必须是对象");
  }
  for (const key of ["outbounds", "endpoints"]) {
    if (template[key] != null && !Array.isArray(template[key])) {
      throw new Error(`sing-box JSON 模板的 ${key} 必须是数组`);
    }
  }
  return template;
}

function mergeConfigTemplate(template, generatedConfig) {
  if (!template) {
    validateConfigReferences(generatedConfig);
    return generatedConfig;
  }

  const {
    outbounds: templateOutbounds = [],
    endpoints: templateEndpoints = [],
    ...base
  } = template;
  const generatedOutbounds = generatedConfig.outbounds || [];
  const generatedEndpoints = generatedConfig.endpoints || [];
  const config = {
    ...base,
    outbounds: [...generatedOutbounds, ...templateOutbounds],
  };
  const endpoints = [...generatedEndpoints, ...templateEndpoints];
  if (endpoints.length > 0) config.endpoints = endpoints;

  assertUniqueConfigTags(config.outbounds, config.endpoints || []);
  validateConfigReferences(config);
  return config;
}

function assertUniqueConfigTags(outbounds, endpoints) {
  const seen = new Map();
  for (const [kind, items] of [
    ["outbound", outbounds],
    ["endpoint", endpoints],
  ]) {
    for (const item of items) {
      if (!item || typeof item.tag !== "string" || item.tag.length === 0) {
        throw new Error(`模板中的 ${kind} 缺少 tag`);
      }
      if (seen.has(item.tag)) {
        throw new Error(
          `模板与脚本输出存在重复 tag ${JSON.stringify(item.tag)}（${seen.get(item.tag)} / ${kind}）`,
        );
      }
      seen.set(item.tag, kind);
    }
  }
}

function validateConfigReferences(config) {
  const outbounds = Array.isArray(config.outbounds) ? config.outbounds : [];
  const endpoints = Array.isArray(config.endpoints) ? config.endpoints : [];
  const connectionTags = new Set(
    [...outbounds, ...endpoints].map((item) => item?.tag).filter(Boolean),
  );
  const dnsTags = new Set(
    (config.dns?.servers || []).map((item) => item?.tag).filter(Boolean),
  );
  const ruleSetTags = new Set(
    (config.route?.rule_set || []).flatMap((item) =>
      Array.isArray(item?.tag) ? item.tag : item?.tag ? [item.tag] : [],
    ),
  );
  const httpClientTags = new Set(
    (config.http_clients || []).map((item) => item?.tag).filter(Boolean),
  );
  const missing = [];

  const check = (namespace, tags, path, value) => {
    if (value == null || value === "") return;
    const values = Array.isArray(value) ? value : [value];
    for (const reference of values) {
      if (typeof reference === "string" && !tags.has(reference)) {
        missing.push(`${path} 引用了不存在的 ${namespace} ${JSON.stringify(reference)}`);
      }
    }
  };
  const checkResolver = (path, resolver) => {
    const server = typeof resolver === "string" ? resolver : resolver?.server;
    check("DNS server", dnsTags, path, server);
  };

  for (const [index, outbound] of outbounds.entries()) {
    const path = `outbounds[${index}](${outbound?.tag || "?"})`;
    if (["selector", "urltest"].includes(outbound?.type)) {
      if (!Array.isArray(outbound.outbounds) || outbound.outbounds.length === 0) {
        missing.push(`${path}.outbounds 不能为空`);
      } else {
        check("outbound/endpoint", connectionTags, `${path}.outbounds`, outbound.outbounds);
      }
      if (
        outbound.default &&
        (!outbound.outbounds || !outbound.outbounds.includes(outbound.default))
      ) {
        missing.push(`${path}.default 没有包含在该选择器的 outbounds 中`);
      }
    }
    check("outbound/endpoint", connectionTags, `${path}.detour`, outbound?.detour);
    checkResolver(`${path}.domain_resolver`, outbound?.domain_resolver);
  }

  for (const [index, endpoint] of endpoints.entries()) {
    checkResolver(
      `endpoints[${index}](${endpoint?.tag || "?"}).domain_resolver`,
      endpoint?.domain_resolver,
    );
  }

  for (const [index, server] of (config.dns?.servers || []).entries()) {
    const path = `dns.servers[${index}](${server?.tag || "?"})`;
    check("outbound/endpoint", connectionTags, `${path}.detour`, server?.detour);
    check("outbound/endpoint", connectionTags, `${path}.endpoint`, server?.endpoint);
  }
  check("DNS server", dnsTags, "dns.final", config.dns?.final);

  const visitDNSRule = (rule, path) => {
    check("DNS server", dnsTags, `${path}.server`, rule?.server);
    check("outbound/endpoint", connectionTags, `${path}.outbound`, rule?.outbound);
    for (const [index, child] of (rule?.rules || []).entries()) {
      visitDNSRule(child, `${path}.rules[${index}]`);
    }
  };
  for (const [index, rule] of (config.dns?.rules || []).entries()) {
    visitDNSRule(rule, `dns.rules[${index}]`);
  }

  const visitRouteRule = (rule, path) => {
    check("outbound/endpoint", connectionTags, `${path}.outbound`, rule?.outbound);
    check("rule_set", ruleSetTags, `${path}.rule_set`, rule?.rule_set);
    if (rule?.action === "resolve") {
      check("DNS server", dnsTags, `${path}.server`, rule.server);
    }
    for (const [index, child] of (rule?.rules || []).entries()) {
      visitRouteRule(child, `${path}.rules[${index}]`);
    }
  };
  for (const [index, rule] of (config.route?.rules || []).entries()) {
    visitRouteRule(rule, `route.rules[${index}]`);
  }
  check("outbound/endpoint", connectionTags, "route.final", config.route?.final);
  checkResolver(
    "route.default_domain_resolver",
    config.route?.default_domain_resolver,
  );
  check(
    "HTTP client",
    httpClientTags,
    "route.default_http_client",
    config.route?.default_http_client,
  );

  for (const [index, client] of (config.http_clients || []).entries()) {
    check(
      "outbound/endpoint",
      connectionTags,
      `http_clients[${index}](${client?.tag || "?"}).detour`,
      client?.detour,
    );
  }
  for (const [index, ruleSet] of (config.route?.rule_set || []).entries()) {
    const path = `route.rule_set[${index}](${ruleSet?.tag || "?"})`;
    const tags = Array.isArray(ruleSet?.tag) ? ruleSet.tag : [ruleSet?.tag];
    if (tags.some((tag) => typeof tag !== "string" || !tag)) {
      missing.push(`${path}.tag 包含空值或非字符串`);
    }
    if (Array.isArray(ruleSet?.tag) && ruleSet.type === "inline") {
      missing.push(`${path}.tag 多 tag 不能与 type: inline 同时使用`);
    }
    if (Array.isArray(ruleSet?.tag) && ruleSet.tag.length > 1) {
      const templatedPath = [ruleSet.path, ruleSet.url, ruleSet.initial_path]
        .filter((value) => typeof value === "string")
        .some((value) => value.includes("{tag}"));
      if (!templatedPath) {
        missing.push(`${path} 使用多 tag 时 path/url/initial_path 必须包含 {tag}`);
      }
    }
    check(
      "outbound/endpoint",
      connectionTags,
      `${path}.download_detour`,
      ruleSet?.download_detour,
    );
    if (typeof ruleSet?.http_client === "string") {
      check("HTTP client", httpClientTags, `${path}.http_client`, ruleSet.http_client);
    } else {
      check(
        "outbound/endpoint",
        connectionTags,
        `${path}.http_client.detour`,
        ruleSet?.http_client?.detour,
      );
    }
  }
  for (const [index, service] of (config.services || []).entries()) {
    check(
      "outbound/endpoint",
      connectionTags,
      `services[${index}](${service?.tag || "?"}).detour`,
      service?.detour,
    );
  }
  check(
    "outbound/endpoint",
    connectionTags,
    "experimental.clash_api.external_ui_download_detour",
    config.experimental?.clash_api?.external_ui_download_detour,
  );

  if (missing.length > 0) {
    throw new Error(
      `模板与脚本输出的引用不完整：${[...new Set(missing)].slice(0, 12).join("；")}`,
    );
  }
  assertAcyclicOutboundGraph(outbounds);
  return config;
}

function assertAcyclicOutboundGraph(outbounds) {
  const graph = new Map();
  for (const outbound of outbounds) {
    if (!outbound?.tag) continue;
    const dependencies = [];
    if (typeof outbound.detour === "string") dependencies.push(outbound.detour);
    if (["selector", "urltest"].includes(outbound.type)) {
      dependencies.push(...(outbound.outbounds || []));
    }
    graph.set(outbound.tag, dependencies);
  }

  const visiting = new Set();
  const visited = new Set();
  const path = [];
  const visit = (tag) => {
    if (visited.has(tag) || !graph.has(tag)) return;
    if (visiting.has(tag)) {
      const start = path.indexOf(tag);
      const cycle = [...path.slice(start), tag];
      throw new Error(`outbound 依赖存在循环：${cycle.join(" -> ")}`);
    }
    visiting.add(tag);
    path.push(tag);
    for (const dependency of graph.get(tag)) visit(dependency);
    path.pop();
    visiting.delete(tag);
    visited.add(tag);
  };

  for (const tag of graph.keys()) visit(tag);
}

function handleFailure(input, diagnosticEnabled, details) {
  if (!diagnosticEnabled) {
    throw new Error(String(details?.error || "未知错误"));
  }
  return createDiagnosticOutput(input, details);
}

function createDiagnosticOutput(
  input,
  {
    sourceType,
    sourceName,
    proxies = [],
    conversion = { proxies: [], produced: [], skipped: [] },
    parsed = false,
    error,
  },
) {
  const skippedByIndex = new Map(
    conversion.skipped.map((item) => [item.index, item.reason]),
  );
  const compatibleIndexes = new Set(conversion.indexes || []);
  const typesRead = countBy(proxies, (proxy) => String(proxy?.type || "unknown"));
  const skippedReasons = countBy(conversion.skipped, (item) =>
    classifySkipReason(item.reason),
  );
  const result = {
    kind: "sub-store-country-groups-diagnostic",
    success: false,
    message:
      "已生成诊断结果；此文件用于确认 Sub-Store 读取和解析情况，不是可直接运行的 sing-box 配置。",
    source: {
      type: sourceType || "unknown",
      name: sourceName || "",
    },
    summary: {
      parsed,
      nodes_read: proxies.length,
      nodes_converted: conversion.proxies.length,
      items_produced: conversion.produced.length,
      nodes_skipped: conversion.skipped.length,
      types_read: typesRead,
    },
    error: String(error || "未知错误"),
    skipped_reasons: skippedReasons,
    nodes: proxies.map((proxy, index) => ({
      index,
      name: String(proxy?.name || "(未命名节点)"),
      type: String(proxy?.type || "unknown"),
      status: compatibleIndexes.has(index) ? "converted" : "skipped",
      ...(skippedByIndex.has(index)
        ? { reason: skippedByIndex.get(index) }
        : {}),
    })),
  };
  return { ...input, $content: JSON.stringify(result, null, 2) };
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries(counts);
}

function classifySkipReason(reason) {
  const message = String(reason || "未知错误");
  if (message.includes("需要 SPKI pin")) return "AnyTLS 需要 SPKI pin";
  if (message.includes("跳过 TLS 证书验证")) return "仍要求跳过 TLS 证书验证";
  if (message.includes("重复 tag")) return "转换结果包含重复 tag";
  return message;
}

function produceCompatibleNodes(proxies, rawOptions, produceProxy) {
  if (!Array.isArray(proxies)) {
    throw new TypeError("proxies 必须是数组");
  }
  if (typeof produceProxy !== "function") {
    throw new TypeError("produceProxy 必须是函数");
  }

  const resolverRules = parseResolverRules(rawOptions?.resolver);
  const rmSsNet = toBoolean(rawOptions?.rmSsNet, false);
  const compatibleProxies = [];
  const produced = [];
  const skipped = [];
  const indexes = [];
  const bundles = [];
  const usedTags = new Set();

  for (const [index, original] of proxies.entries()) {
    const proxy = original && typeof original === "object" ? { ...original } : original;
    const name = String(proxy?.name || "");

    try {
      if (!proxy || typeof proxy !== "object") {
        throw new Error("节点不是对象");
      }

      applySpkiPinsForConversion(proxy, rawOptions);
      const items = sanitizeProducedItems(produceProxy(proxy));
      if (rmSsNet) removeShadowsocksNetwork(items);
      applyDomainResolverRules(items, resolverRules);
      if (items.length === 0) {
        throw new Error("Sub-Store 没有生成 sing-box 出站");
      }

      const candidateTags = new Set();
      for (const item of items) {
        if (typeof item.tag !== "string" || item.tag.length === 0) {
          throw new Error("sing-box 出站或端点缺少 tag");
        }
        if (candidateTags.has(item.tag) || usedTags.has(item.tag)) {
          throw new Error(`转换结果包含重复 tag ${JSON.stringify(item.tag)}`);
        }
        candidateTags.add(item.tag);
      }

      compatibleProxies.push(proxy);
      produced.push(...items);
      for (const tag of candidateTags) usedTags.add(tag);
      indexes.push(index);
      bundles.push({ index, proxy, items });
    } catch (error) {
      skipped.push({
        index,
        name: name || "(未命名节点)",
        reason: String(error?.message || error),
      });
    }
  }

  return { proxies: compatibleProxies, produced, skipped, indexes, bundles };
}

function removeShadowsocksNetwork(items) {
  for (const item of items) {
    if (item.type === "shadowsocks") delete item.network;
  }
}

function applySpkiPinsForConversion(proxy, rawOptions) {
  try {
    applySpkiPins([proxy], rawOptions);
  } catch (error) {
    const message = String(error?.message || error);
    if (proxy.type !== "anytls" || !message.includes("需要 SPKI pin")) {
      throw error;
    }

    // sing-box 继续使用正常的 CA/主机名校验；这里只丢弃无法安全迁移的
    // Mihomo 跳过验证设置和证书指纹，不生成 tls.insecure: true。
    delete proxy["skip-cert-verify"];
    delete proxy.insecure;
    for (const key of ["fingerprint", "tls-fingerprint"]) {
      if (normalizeCertificateFingerprint(proxy[key])) delete proxy[key];
    }
  }
}

function sanitizeProducedItems(items) {
  if (!Array.isArray(items)) {
    throw new Error("Sub-Store 的 sing-box 转换结果不是数组");
  }

  return items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Sub-Store 生成了无效的 sing-box 出站");
    }

    const rootInsecure = toBoolean(
      item.insecure ?? item["skip-cert-verify"],
      false,
    );
    const tlsInsecure = toBoolean(
      item.tls?.insecure ?? item.tls?.["skip-cert-verify"],
      false,
    );
    if (rootInsecure || tlsInsecure) {
      throw new Error("转换结果仍要求跳过 TLS 证书验证");
    }

    const sanitized = { ...item };
    delete sanitized.insecure;
    delete sanitized["skip-cert-verify"];
    if (item.tls && typeof item.tls === "object" && !Array.isArray(item.tls)) {
      sanitized.tls = { ...item.tls };
      delete sanitized.tls.insecure;
      delete sanitized.tls["skip-cert-verify"];
    }
    return sanitized;
  });
}

function parseResolverRules(value) {
  if (value == null || value === "") return [];

  let mapping = value;
  if (typeof mapping === "string") {
    try {
      mapping = JSON.parse(mapping);
    } catch (error) {
      throw new Error(`resolver 不是有效的 JSON 对象：${error.message}`);
    }
  }
  if (!mapping || Array.isArray(mapping) || typeof mapping !== "object") {
    throw new Error("resolver 必须是域名到 DNS 配置的映射对象");
  }

  return Object.entries(mapping)
    .map(([rawDomain, resolver]) => {
      let domain = normalizeDomain(rawDomain);
      const suffix = domain.startsWith(".");
      if (suffix) domain = domain.slice(1);
      if (!domain || /[:/\s*]/.test(domain) || isIPLiteral(domain)) {
        throw new Error(`resolver 包含无效域名 ${JSON.stringify(rawDomain)}`);
      }
      return {
        domain,
        suffix,
        resolver: normalizeResolver(resolver, rawDomain),
      };
    })
    .sort(
      (left, right) =>
        Number(left.suffix) - Number(right.suffix) ||
        right.domain.length - left.domain.length,
    );
}

function normalizeResolver(value, domain) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (
    value &&
    !Array.isArray(value) &&
    typeof value === "object" &&
    nonEmptyString(value.server, "")
  ) {
    return { ...value, server: value.server.trim() };
  }
  throw new Error(
    `resolver.${domain} 必须是 DNS server tag 或包含 server 的对象`,
  );
}

function applyDomainResolverRules(items, rules) {
  if (rules.length === 0) return;

  for (const item of items) {
    const domains = getDomainDialTargets(item);
    if (domains.length === 0) continue;
    const resolvers = domains.map((domain) => findDomainResolver(rules, domain));
    if (resolvers.some((resolver) => resolver == null)) continue;
    const resolver = resolvers[0];
    if (
      !resolvers.every(
        (value) => JSON.stringify(value) === JSON.stringify(resolver),
      )
    ) {
      continue;
    }
    item.domain_resolver =
      typeof resolver === "string" ? resolver : { ...resolver };
  }
}

function findDomainResolver(rules, domain) {
  return rules.find((rule) =>
    rule.suffix
      ? domain === rule.domain || domain.endsWith(`.${rule.domain}`)
      : domain === rule.domain,
  )?.resolver;
}

function getDomainDialTargets(item) {
  if (!item || typeof item !== "object") return [];
  const domains = [];
  if (isDomainAddress(item.server)) domains.push(normalizeDomain(item.server));
  if (item.type === "wireguard" && Array.isArray(item.peers)) {
    for (const peer of item.peers) {
      if (isDomainAddress(peer?.address)) {
        domains.push(normalizeDomain(peer.address));
      }
    }
  }
  return [...new Set(domains)];
}

function isDomainAddress(value) {
  const address = typeof value === "string" ? value.trim() : "";
  return Boolean(address) && !isIPLiteral(address);
}

function normalizeDomain(value) {
  return String(value || "").trim().toLowerCase().replace(/\.$/, "");
}

function isIPLiteral(value) {
  let address = String(value || "").trim();
  if (address.startsWith("[") && address.endsWith("]")) {
    address = address.slice(1, -1);
  }
  const zoneIndex = address.indexOf("%");
  if (zoneIndex >= 0) address = address.slice(0, zoneIndex);

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) {
    return address.split(".").every((part) => Number(part) <= 255);
  }
  return address.includes(":") && /^[0-9a-f:.]+$/i.test(address);
}

function buildConfig(sourceNodes, produced, rawOptions = {}, getISO = () => undefined) {
  if (!Array.isArray(sourceNodes) || !Array.isArray(produced)) {
    throw new TypeError("sourceNodes 和 produced 必须是数组");
  }

  const options = normalizeOptions(rawOptions);
  let endpoints = produced
    .filter((item) => ["wireguard", "tailscale"].includes(item.type))
    .map((item) => ({ ...item }));
  let nodeOutbounds = produced
    .filter((item) => !["wireguard", "tailscale"].includes(item.type))
    .map((item) => ({ ...item }));

  assertUniqueTags([...nodeOutbounds, ...endpoints]);
  assertReservedTagsAvailable([...nodeOutbounds, ...endpoints]);

  const allItemsByTag = new Map(
    [...nodeOutbounds, ...endpoints].map((item) => [item.tag, item]),
  );
  const outboundByTag = new Map(
    nodeOutbounds.map((outbound) => [outbound.tag, outbound]),
  );
  const endpointTags = new Set(endpoints.map((endpoint) => endpoint.tag));
  const ordinaryNodes = [];
  const landingCandidates = [];
  const seenRootTags = new Set();
  for (const node of sourceNodes) {
    const tag = String(node?.name || "");
    if (!tag || !allItemsByTag.has(tag) || seenRootTags.has(tag)) continue;
    seenRootTags.add(tag);
    if (node?.role === "landing") {
      landingCandidates.push({ ...node, name: tag });
    } else {
      ordinaryNodes.push({ ...node, name: tag });
    }
  }

  if (ordinaryNodes.length === 0) {
    if (landingCandidates.length > 0) {
      throw new Error("没有可作为中转的普通节点，无法生成落地节点链路");
    }
    throw new Error("没有可用于 sing-box 分组的节点");
  }

  const landingNodes = [];
  const droppedLandingTags = new Set();
  const landingWarnings = [];
  for (const node of landingCandidates) {
    const allowedTags = Array.isArray(node.producedTags)
      ? new Set(node.producedTags)
      : undefined;
    const resolution = resolveLandingDetourTail(
      node.name,
      outboundByTag,
      endpointTags,
      allowedTags,
    );
    if (resolution.tail) {
      landingNodes.push({ ...node, tailTag: resolution.tail.tag });
      continue;
    }

    const tagsToDrop = allowedTags?.size > 0 ? allowedTags : new Set([node.name]);
    for (const tag of tagsToDrop) droppedLandingTags.add(tag);
    landingWarnings.push(
      `${node.name}: ${resolution.reason || "无法接入中转链路"}`,
    );
  }
  if (droppedLandingTags.size > 0) {
    nodeOutbounds = nodeOutbounds.filter(
      (item) => !droppedLandingTags.has(item.tag),
    );
    endpoints = endpoints.filter((item) => !droppedLandingTags.has(item.tag));
    for (const warning of landingWarnings) {
      reportWarning(`已跳过落地节点 ${warning}`);
    }
  }

  const ordinaryTags = ordinaryNodes.map((node) => node.name);
  const landingTags = landingNodes.map((node) => node.name);
  const nodeTags = [...ordinaryTags, ...landingTags];
  const groups = groupNodeTags(
    nodeTags,
    options.mainCountries,
    options.includeOther,
    getISO,
  );
  if (nodeTags.length === 0) {
    throw new Error("没有可用于 sing-box 分组的节点");
  }

  const usedTags = new Set(
    [
      ...nodeOutbounds.map((item) => item.tag),
      ...endpoints.map((item) => item.tag),
      ...RESERVED_OUTBOUND_TAGS,
    ],
  );
  const allocateTag = createTagAllocator(usedTags);
  const countryOutbounds = [];
  const countrySelectorTags = [];

  for (const key of sortCountryKeys([...groups.keys()], options.countryOrder)) {
    const members = groups.get(key);
    const metadata = getCountryMetadata(key);
    const selectorTag = allocateTag(`${metadata.flag} ${metadata.name}`);

    countryOutbounds.push(createSelector(selectorTag, members, members[0]));
    countrySelectorTags.push(selectorTag);
  }

  const mainTag = allocateTag(options.mainTag);
  const mainMembers = [...countrySelectorTags];
  if (options.includeNodesInMain || mainMembers.length === 0) {
    mainMembers.push(...nodeTags);
  }

  const relayOutbounds = [];
  if (landingNodes.length > 0) {
    const relayGroups = groupNodeTags(
      ordinaryTags,
      options.relayCountries,
      false,
      getISO,
    );
    const relayCountrySelectorTags = [];
    for (const key of sortCountryKeys(
      [...relayGroups.keys()],
      options.relayCountries,
    )) {
      const members = relayGroups.get(key);
      const metadata = getCountryMetadata(key);
      const selectorTag = allocateTag(`${metadata.flag} ${metadata.name} · 中转`);
      relayOutbounds.push(createSelector(selectorTag, members, members[0]));
      relayCountrySelectorTags.push(selectorTag);
    }

    const relayTag = allocateTag(options.relayTag);
    const relayMembers = [...relayCountrySelectorTags, ...ordinaryTags];
    relayOutbounds.push(
      createSelector(relayTag, relayMembers, relayMembers[0]),
    );

    for (const node of landingNodes) {
      const selectorTag = allocateTag(`🔗 ${node.name} · 中转选择`);
      relayOutbounds.push(
        createSelector(
          selectorTag,
          [...relayCountrySelectorTags, relayTag],
          relayTag,
        ),
      );
      const tail = nodeOutbounds.find((item) => item.tag === node.tailTag);
      if (!tail) {
        throw new Error(
          `落地节点 ${JSON.stringify(node.name)} 的链尾 ${JSON.stringify(node.tailTag)} 不存在`,
        );
      }
      tail.detour = selectorTag;
    }
  }

  const serviceMembers = [
    ...countrySelectorTags,
    mainTag,
    DIRECT_OUTBOUND_TAG,
  ];
  const serviceOutbounds = SERVICE_SELECTORS.map((service) =>
    createSelector(
      service.tag,
      serviceMembers,
      service.defaultRoute === "direct" ? DIRECT_OUTBOUND_TAG : mainTag,
    ),
  );

  const generated = [
    createSelector(mainTag, mainMembers, mainMembers[0]),
    ...serviceOutbounds,
    ...countryOutbounds,
    ...relayOutbounds,
    { type: "direct", tag: DIRECT_OUTBOUND_TAG },
  ];
  const config = { outbounds: [...generated, ...nodeOutbounds] };
  if (endpoints.length > 0) config.endpoints = endpoints;
  assertAcyclicOutboundGraph(config.outbounds);
  return config;
}

function groupNodeTags(nodeTags, countries, includeOther, getISO) {
  const groups = new Map();
  for (const tag of nodeTags) {
    const iso = detectCountry(tag, getISO);
    const key = iso && countries.includes(iso) ? iso : "OTHER";
    if (key === "OTHER" && !includeOther) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tag);
  }
  return groups;
}

function resolveLandingDetourTail(
  rootTag,
  outboundByTag,
  endpointTags,
  allowedTags,
) {
  if (endpointTags.has(rootTag)) {
    return { reason: "落地 endpoint 不支持追加 detour" };
  }
  if (allowedTags && !allowedTags.has(rootTag)) {
    return { reason: "转换结果中找不到落地节点的根 tag" };
  }

  let current = outboundByTag.get(rootTag);
  const visited = new Set();
  while (current) {
    if (visited.has(current.tag)) {
      return { reason: "原有 detour 链存在循环" };
    }
    visited.add(current.tag);
    if (["selector", "urltest"].includes(current.type)) {
      return { reason: "原有 detour 链进入了选择器，无法安全追加中转" };
    }
    if (!current.detour) return { tail: current };
    if (typeof current.detour !== "string") {
      return { reason: "原有 detour 不是有效 tag" };
    }
    if (allowedTags && !allowedTags.has(current.detour)) {
      return { reason: "原有 detour 指向该节点转换结果之外" };
    }
    if (endpointTags.has(current.detour)) {
      return { reason: "原有 detour 链以 endpoint 结束，无法安全追加中转" };
    }
    current = outboundByTag.get(current.detour);
    if (!current) return { reason: "原有 detour 指向不存在的 outbound" };
  }
  return { reason: "无法解析原有 detour 链" };
}

function normalizeOptions(raw) {
  const options = raw && typeof raw === "object" ? raw : {};

  const mainCountries = parseCountryList(
    options.countries,
    DEFAULT_MAIN_COUNTRIES,
  );
  return {
    mainTag: nonEmptyString(options.mainTag, "🌐 代理选择"),
    relayTag: nonEmptyString(options.relayTag, "🔗 中转选择"),
    includeOther: toBoolean(options.includeOther, true),
    includeNodesInMain: toBoolean(options.includeNodesInMain, false),
    mainCountries,
    countryOrder: parseCountryList(options.countryOrder, mainCountries),
    relayCountries: parseCountryList(
      options.relay,
      DEFAULT_RELAY_COUNTRIES,
    ),
  };
}

function createSelector(tag, outbounds, defaultTag) {
  return {
    type: "selector",
    tag,
    outbounds: [...outbounds],
    default: defaultTag,
  };
}

function assertUniqueTags(items) {
  const seen = new Set();
  for (const item of items) {
    if (!item || typeof item.tag !== "string" || item.tag.length === 0) {
      throw new Error("sing-box 出站或端点缺少 tag");
    }
    if (seen.has(item.tag)) {
      throw new Error(
        `发现重复节点名 ${JSON.stringify(item.tag)}；请在本脚本前添加“处理节点名重复”操作`,
      );
    }
    seen.add(item.tag);
  }
}

function assertReservedTagsAvailable(items) {
  for (const item of items) {
    if (!RESERVED_OUTBOUND_TAGS.has(item.tag)) continue;
    throw new Error(
      `节点或辅助出站 tag ${JSON.stringify(item.tag)} 与脚本保留的服务组名冲突；请先重命名该节点`,
    );
  }
}

function createTagAllocator(usedTags) {
  return (base) => {
    let tag = base;
    let suffix = 2;
    while (usedTags.has(tag)) {
      tag = `${base} (${suffix})`;
      suffix += 1;
    }
    usedTags.add(tag);
    return tag;
  };
}

function safeGetISO(getISO, name) {
  try {
    return getISO(name);
  } catch (_) {
    return undefined;
  }
}

function detectCountry(name, fallbackGetISO = () => undefined) {
  const original = String(name || "");
  const normalized = normalizeNodeName(original);

  for (const matcher of COUNTRY_MATCHERS) {
    if (original.includes(matcher.flag)) return matcher.iso;
    if (matcher.aliases.some((alias) => normalized.includes(alias))) {
      return matcher.iso;
    }
    if (matcher.codes.some((code) => containsCountryCode(normalized, code))) {
      return matcher.iso;
    }
  }

  return normalizeISO(safeGetISO(fallbackGetISO, original));
}

function normalizeNodeName(name) {
  let normalized = String(name || "").toLowerCase();
  if (typeof normalized.normalize === "function") {
    normalized = normalized.normalize("NFKC");
  }
  return normalized
    .replace(/[._|/\\()[\]{}:;,+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsCountryCode(name, code) {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z])${escaped}(?:\\d+)?(?=$|[^a-z])`, "i").test(
    name,
  );
}

function normalizeISO(value) {
  const iso = String(value || "").trim().toUpperCase();
  if (iso === "UK") return "GB";
  return /^[A-Z]{2}$/.test(iso) ? iso : undefined;
}

function getCountryMetadata(iso) {
  if (iso === "OTHER") return { flag: "🌐", name: "其他" };
  return {
    flag: isoToFlag(iso),
    name: COUNTRY_NAMES[iso] || iso,
  };
}

function isoToFlag(iso) {
  return String.fromCodePoint(
    ...iso.split("").map((character) => 127397 + character.charCodeAt(0)),
  );
}

function sortCountryKeys(keys, preferredOrder) {
  const rank = new Map(preferredOrder.map((iso, index) => [iso, index]));
  return keys.sort((left, right) => {
    if (left === "OTHER") return 1;
    if (right === "OTHER") return -1;
    const leftRank = rank.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rank.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank || left.localeCompare(right);
  });
}

function parseCountryList(value, fallback) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : fallback;
  const normalized = values.map(normalizeISO).filter(Boolean);
  return normalized.length > 0 ? [...new Set(normalized)] : [...fallback];
}

function parseStringList(value) {
  if (value == null || value === "") return [];

  let values = value;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith("[")) {
      try {
        values = JSON.parse(text);
      } catch (error) {
        throw new Error(`landings 不是有效的 JSON 数组：${error.message}`);
      }
    } else {
      values = text.split(/[\n,]+/);
    }
  }
  if (!Array.isArray(values)) {
    throw new Error("landings 必须是字符串、字符串数组或 JSON 数组字符串");
  }

  const subscriptions = [];
  for (const value of values) {
    if (typeof value !== "string") {
      throw new Error("landings 只能包含订阅名称字符串");
    }
    const name = value.trim();
    if (name && !subscriptions.includes(name)) subscriptions.push(name);
  }
  return subscriptions;
}

function attachSourceSubscription(proxy, source) {
  if (!proxy || Array.isArray(proxy) || typeof proxy !== "object") return proxy;
  const copy = { ...proxy };
  if (source.type === "subscription" && !nonEmptyString(copy._subName, "")) {
    copy._subName = source.name;
  }
  return copy;
}

function reportWarning(message) {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`[country-groups] ${message}`);
  }
}

function normalizeSourceType(value) {
  const sourceType = String(value || "subscription").trim().toLowerCase();
  if (sourceType === "subscription") return "subscription";
  if (sourceType === "collection") return "collection";
  throw new Error("type 只能是 subscription 或 collection");
}

function applySpkiPins(proxies, rawOptions = {}) {
  const options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
  const bySubscription = parsePinMap(options.spkiBySubscription);
  const byFingerprint = parsePinMap(
    options.spkiByFingerprint,
    normalizeCertificateFingerprint,
  );
  const byNode = parsePinMap(options.spkiByNode);
  let applied = 0;

  for (const proxy of proxies) {
    if (proxy.type !== "anytls") continue;

    const certificateFingerprint = getCertificateFingerprint(proxy);
    const pins =
      byNode.get(String(proxy.name || "")) ||
      (certificateFingerprint && byFingerprint.get(certificateFingerprint)) ||
      bySubscription.get(String(proxy._subName || "")) ||
      bySubscription.get(String(proxy._subDisplayName || ""));

    if (pins) {
      proxy._certificate_public_key_sha256 = [...pins];
      delete proxy["skip-cert-verify"];
      delete proxy.insecure;
      applied += 1;
      continue;
    }

    if (
      certificateFingerprint ||
      toBoolean(proxy["skip-cert-verify"], false) ||
      toBoolean(proxy.insecure, false)
    ) {
      throw new Error(
        `AnyTLS 节点 ${JSON.stringify(proxy.name)}（订阅 ${JSON.stringify(proxy._subName || "未知")}）需要 SPKI pin`,
      );
    }

    delete proxy["skip-cert-verify"];
    delete proxy.insecure;
  }

  return applied;
}

function parsePinMap(value, normalizeKey = (key) => String(key)) {
  if (value == null || value === "") return new Map();

  let object = value;
  if (typeof value === "string") {
    try {
      object = JSON.parse(value);
    } catch (_) {
      throw new Error("SPKI pin 映射必须是对象或 JSON 对象字符串");
    }
  }
  if (!object || Array.isArray(object) || typeof object !== "object") {
    throw new Error("SPKI pin 映射必须是对象");
  }

  const result = new Map();
  for (const [rawKey, rawPins] of Object.entries(object)) {
    const key = normalizeKey(rawKey);
    if (!key) throw new Error(`无效的 SPKI pin 映射键 ${JSON.stringify(rawKey)}`);
    result.set(key, normalizePins(rawPins));
  }
  return result;
}

function normalizePins(value) {
  const pins =
    value && typeof value === "object" && !Array.isArray(value)
      ? value.certificate_public_key_sha256
      : value;
  const list = Array.isArray(pins) ? pins : [pins];
  if (list.length === 0) throw new Error("SPKI pin 数组不能为空");

  const normalized = list.map((pin) => String(pin || "").trim());
  for (const pin of normalized) {
    const decoded = /^[A-Za-z0-9+/]{43}=$/.test(pin)
      ? Buffer.from(pin, "base64")
      : undefined;
    if (
      !decoded ||
      decoded.length !== 32 ||
      decoded.toString("base64") !== pin
    ) {
      throw new Error(`无效的 SPKI-SHA256/Base64 ${JSON.stringify(pin)}`);
    }
  }
  return [...new Set(normalized)];
}

function getCertificateFingerprint(proxy) {
  return normalizeCertificateFingerprint(
    proxy.fingerprint || proxy["tls-fingerprint"],
  );
}

function normalizeCertificateFingerprint(value) {
  const fingerprint = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/:/g, "");
  return /^[0-9a-f]{64}$/.test(fingerprint) ? fingerprint : "";
}

function toBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/^(1|true|yes|on)$/i.test(value)) return true;
    if (/^(0|false|no|off)$/i.test(value)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function nonEmptyString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    applySpkiPins,
    buildConfig,
    detectCountry,
    mergeConfigTemplate,
    normalizeISO,
    normalizeOptions,
    operator,
    parseConfigTemplate,
    produceCompatibleNodes,
    validateConfigReferences,
  };
}
