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

  // 保留模板中的直连等节点，策略组通过 include-all 自动纳入订阅节点。
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

  return { ...input, $content: ProxyUtils.yaml.stringify(config) };
}
