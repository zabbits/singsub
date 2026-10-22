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

  const config = ProxyUtils.yaml.parse(input.$content);
  const provider = config?.["proxy-providers"]?.["Sub-Store"];
  if (!provider || Array.isArray(provider) || typeof provider !== "object") {
    throw new Error("文件内容必须是包含 Sub-Store 代理集合的 Mihomo YAML 模板");
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

  // 使用内嵌节点替代远程订阅，保留模板中的健康检查和其他设置。
  const inlineProvider = { ...provider, type: "inline", payload: proxies };
  delete inlineProvider.url;
  delete inlineProvider.path;
  delete inlineProvider.interval;
  config["proxy-providers"]["Sub-Store"] = inlineProvider;

  return { ...input, $content: ProxyUtils.yaml.stringify(config) };
}
