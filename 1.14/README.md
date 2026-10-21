# 配置模板

- `template.json`：FakeIP 模板。
- `template-realip.json`：RealIP 模板，返回真实 DNS 解析结果，保留原有分流、Tailscale 和 DNS ECS 配置。

# scripts 参数

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `source` | 必填 | 主订阅或组合订阅名称 |
| `type` | `subscription` | 主来源类型：`subscription` 或 `collection` |
| `landings` | `[]` | 落地订阅名称列表；只有这些订阅中的节点会被标记为落地节点 |
| `resolver` | `{}` | 节点域名到 DNS server tag 或 resolver 对象的映射；只为匹配域名添加 `domain_resolver` |
| `diagnostic` | `false` | 失败时是否输出诊断 JSON；关闭时直接抛出错误 |
| `spkiByNode` | `{}` | 按节点名称映射 AnyTLS SPKI pin，优先级最高 |
| `spkiByFingerprint` | `{}` | 按 64 位十六进制证书 SHA-256 指纹映射 AnyTLS SPKI pin |
| `spkiBySubscription` | `{}` | 按子订阅名称映射 AnyTLS SPKI pin，优先级最低 |
| `countries` | `HK,TW,JP,SG,KR,US,GB,DE,FR,CA,AU` | 单独生成普通节点国家组的国家代码列表 |
| `relay` | `HK,TW,JP,SG,US` | 单独生成中转节点国家组的国家代码列表 |
| `mainTag` | `🌐 代理选择` | 总代理选择器名称 |
| `relayTag` | `🔗 中转选择` | 总中转选择器名称 |
| `includeOther` | `true` | 是否生成包含其他国家和未知节点的“其他”组 |
| `includeNodesInMain` | `false` | 是否在总代理选择器中直接列出具体节点 |
| `countryOrder` | 与 `countries` 相同 | 普通国家组的排列顺序 |
| `includeUnsupported` | `false` | 是否让 Sub-Store 尝试输出未支持的节点协议 |
| `rmSsNet` | `false` | 是否移除 Shadowsocks 出站中的 `network` 字段 |

`landings`、`countries` 和 `relay` 接受数组或 JSON 数组字符串；`landings` 还接受逗号或换行分隔字符串。

`resolver` 接受对象或 JSON 对象字符串。键为完整域名时执行精确匹配，以 `.` 开头时匹配根域名及其子域；值可以是 DNS server tag，也可以是包含 `server` 的 sing-box resolver 对象。未匹配域名和 IP 地址不会添加 `domain_resolver`。

SPKI 映射接受对象或 JSON 对象字符串。值可以是单个 Base64、Base64 数组，或包含 `certificate_public_key_sha256` 的对象。
