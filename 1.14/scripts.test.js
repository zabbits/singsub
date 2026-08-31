const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const {
  applySpkiPins,
  buildConfig,
  detectCountry,
  mergeConfigTemplate,
  operator,
  parseConfigTemplate,
  produceCompatibleNodes,
  validateConfigReferences,
} = require("./country-groups");

const TEST_PIN_A = Buffer.alloc(32, 0x11).toString("base64");
const TEST_PIN_B = Buffer.alloc(32, 0x22).toString("base64");
const TEST_CERT_FINGERPRINT = "ab".repeat(32);

const PROXY_SERVICE_TAGS = [
  "🤖 AI 服务",
  "✈️ Telegram",
  "🔍 Google",
  "🎬 Netflix",
  "🎮 巴哈姆特",
  "▶️ YouTube",
];
const DIRECT_SERVICE_TAGS = ["🍎 Apple", "📺 哔哩哔哩", "🇨🇳 国内服务"];

const countryByName = new Map([
  ["HK Edge 01", "HK"],
  ["HK Edge 02", "HK"],
  ["JP Edge 01", "JP"],
  ["NL Edge 01", "NL"],
]);

function getISO(name) {
  return countryByName.get(name);
}

test("从多种节点命名中提取主流国家", () => {
  const cases = [
    ["Base.GM.01.hk", "HK"],
    ["HongKong IPLC", "HK"],
    ["hkg01 premium", "HK"],
    ["🇹🇼 台北-02", "TW"],
    ["taipei relay", "TW"],
    ["japan-tokyo-01", "JP"],
    ["NRT02", "JP"],
    ["Singapore Premium", "SG"],
    ["sin-03", "SG"],
    ["South Korea Seoul", "KR"],
    ["icn01", "KR"],
    ["United States Los-Angeles", "US"],
    ["sfo-02", "US"],
    ["United Kingdom London", "GB"],
    ["lhr01", "GB"],
    ["Germany Frankfurt", "DE"],
    ["muc-01", "DE"],
    ["France Paris", "FR"],
    ["cdg02", "FR"],
    ["Canada Toronto", "CA"],
    ["yvr-01", "CA"],
    ["Australia Sydney", "AU"],
    ["mel03", "AU"],
    ["美東 高速", "US"],
    ["法蘭克福 專線", "DE"],
    ["溫哥華 01", "CA"],
  ];

  for (const [name, expected] of cases) {
    assert.equal(detectCountry(name), expected, name);
  }
});

test("短国家代码必须是独立标记，避免子串误判", () => {
  assert.equal(detectCountry("status premium"), undefined);
  assert.equal(detectCountry("Auckland premium"), undefined);
  assert.equal(detectCountry("Russia Moscow"), undefined);
});

test("生成手动国家组并把代理选择排在最前面", () => {
  const source = [
    { name: "HK Edge 01" },
    { name: "HK Edge 02" },
    { name: "JP Edge 01" },
    { name: "NL Edge 01" },
    { name: "Mystery Edge 01" },
  ];
  const produced = source.map(({ name }) => ({
    type: "shadowsocks",
    tag: name,
    server: "proxy.example.invalid",
    server_port: 443,
    method: "2022-blake3-aes-128-gcm",
    password: "test-password",
  }));

  const config = buildConfig(source, produced, {}, getISO);
  const byTag = new Map(config.outbounds.map((outbound) => [outbound.tag, outbound]));

  assert.deepEqual(byTag.get("🇭🇰 香港").outbounds, [
    "HK Edge 01",
    "HK Edge 02",
  ]);
  assert.equal(byTag.get("🇭🇰 香港").default, "HK Edge 01");
  assert.deepEqual(byTag.get("🇯🇵 日本").outbounds, ["JP Edge 01"]);
  assert.deepEqual(byTag.get("🌐 其他").outbounds, [
    "NL Edge 01",
    "Mystery Edge 01",
  ]);
  assert.equal(byTag.has("🇳🇱 荷兰"), false);
  assert.equal(byTag.get("🌐 代理选择").default, "🇭🇰 香港");
  assert.deepEqual(byTag.get("🌐 代理选择").outbounds, [
    "🇭🇰 香港",
    "🇯🇵 日本",
    "🌐 其他",
  ]);
  assert.deepEqual(byTag.get("direct"), { type: "direct", tag: "direct" });
  assert.equal(config.outbounds.some((outbound) => outbound.type === "urltest"), false);
  assert.equal(config.outbounds.some((outbound) => outbound.tag.includes("自动")), false);

  const serviceMembers = [
    "🇭🇰 香港",
    "🇯🇵 日本",
    "🌐 其他",
    "🌐 代理选择",
    "direct",
  ];
  for (const tag of PROXY_SERVICE_TAGS) {
    assert.deepEqual(byTag.get(tag).outbounds, serviceMembers, tag);
    assert.equal(byTag.get(tag).default, "🌐 代理选择", tag);
  }
  for (const tag of DIRECT_SERVICE_TAGS) {
    assert.deepEqual(byTag.get(tag).outbounds, serviceMembers, tag);
    assert.equal(byTag.get(tag).default, "direct", tag);
  }

  assert.deepEqual(
    config.outbounds.slice(0, 1 + PROXY_SERVICE_TAGS.length + DIRECT_SERVICE_TAGS.length)
      .map((outbound) => outbound.tag),
    [
      "🌐 代理选择",
      "🤖 AI 服务",
      "✈️ Telegram",
      "🔍 Google",
      "🍎 Apple",
      "📺 哔哩哔哩",
      "🎬 Netflix",
      "🎮 巴哈姆特",
      "▶️ YouTube",
      "🇨🇳 国内服务",
    ],
  );

  const tags = new Set(config.outbounds.map((outbound) => outbound.tag));
  assert.equal(tags.size, config.outbounds.length);
  for (const outbound of config.outbounds) {
    if (outbound.type !== "selector") continue;
    assert.ok(outbound.outbounds.every((tag) => tags.has(tag)));
    if (outbound.type === "selector") {
      assert.ok(outbound.outbounds.includes(outbound.default));
    }
  }
});

test("可以自定义主流国家列表", () => {
  const source = [{ name: "NL Edge 01" }, { name: "JP Edge 01" }];
  const produced = source.map(({ name }) => ({ type: "socks", tag: name }));
  const config = buildConfig(
    source,
    produced,
    { countries: "NL,HK" },
    getISO,
  );
  const byTag = new Map(config.outbounds.map((outbound) => [outbound.tag, outbound]));

  assert.deepEqual(byTag.get("🇳🇱 荷兰").outbounds, ["NL Edge 01"]);
  assert.deepEqual(byTag.get("🌐 其他").outbounds, ["JP Edge 01"]);
});

test("保留端点和辅助出站，但只对原始节点 tag 分组", () => {
  const source = [{ name: "HK Edge 01" }];
  const produced = [
    { type: "shadowtls", tag: "HK Edge 01 · TLS helper" },
    { type: "trojan", tag: "HK Edge 01", detour: "HK Edge 01 · TLS helper" },
    { type: "wireguard", tag: "Test endpoint" },
  ];

  const config = buildConfig(source, produced, {}, getISO);
  const countryGroup = config.outbounds.find(
    (outbound) => outbound.tag === "🇭🇰 香港",
  );

  assert.deepEqual(countryGroup.outbounds, ["HK Edge 01"]);
  assert.deepEqual(config.endpoints, [{ type: "wireguard", tag: "Test endpoint" }]);
});

test("生成的组名与节点重名时自动避让", () => {
  const source = [{ name: "🌐 代理选择" }];
  const produced = [{ type: "socks", tag: "🌐 代理选择" }];
  const config = buildConfig(source, produced, { includeOther: false }, getISO);

  assert.ok(config.outbounds.some((outbound) => outbound.tag === "🌐 代理选择 (2)"));
});

test("重复节点 tag 会给出可执行的错误", () => {
  assert.throws(
    () =>
      buildConfig(
        [{ name: "Duplicate" }],
        [
          { type: "socks", tag: "Duplicate" },
          { type: "socks", tag: "Duplicate" },
        ],
        {},
        getISO,
      ),
    /处理节点名重复/,
  );
});

test("节点不能占用 direct 或专用服务选择器 tag", () => {
  for (const tag of ["direct", "🤖 AI 服务", "🇨🇳 国内服务"]) {
    assert.throws(
      () => buildConfig([{ name: tag }], [{ type: "socks", tag }], {}, getISO),
      /保留的服务组名冲突.*重命名该节点/,
      tag,
    );
  }
});

test("只有额外订阅来源的节点才作为落地节点", () => {
  const source = [
    {
      name: "HK 普通节点 01",
      role: "ordinary",
      producedTags: ["HK 普通节点 01"],
    },
    {
      name: "SG 落地字样但来自主来源",
      role: "ordinary",
      producedTags: ["SG 落地字样但来自主来源"],
    },
    {
      name: "JP Residential Exit 01",
      role: "landing",
      producedTags: ["JP Residential Exit 01"],
    },
    {
      name: "US Residential Exit 01",
      role: "landing",
      producedTags: ["US Residential Exit 01"],
    },
  ];
  const produced = source.map(({ name }) => ({ type: "socks", tag: name }));

  const config = buildConfig(source, produced, {}, () => undefined);
  const byTag = new Map(config.outbounds.map((outbound) => [outbound.tag, outbound]));

  assert.deepEqual(byTag.get("🔗 中转选择").outbounds, [
    "🇭🇰 香港 · 中转",
    "🇸🇬 新加坡 · 中转",
    "HK 普通节点 01",
    "SG 落地字样但来自主来源",
  ]);
  assert.deepEqual(byTag.get("🇭🇰 香港 · 中转").outbounds, [
    "HK 普通节点 01",
  ]);
  assert.deepEqual(byTag.get("🇸🇬 新加坡 · 中转").outbounds, [
    "SG 落地字样但来自主来源",
  ]);
  assert.equal(byTag.has("🇯🇵 日本 · 中转"), false);
  assert.equal(byTag.has("🇺🇸 美国 · 中转"), false);
  assert.equal(
    byTag.get("JP Residential Exit 01").detour,
    "🔗 JP Residential Exit 01 · 中转选择",
  );
  assert.equal(
    byTag.get("US Residential Exit 01").detour,
    "🔗 US Residential Exit 01 · 中转选择",
  );
  assert.deepEqual(byTag.get("🇯🇵 日本").outbounds, [
    "JP Residential Exit 01",
  ]);
  assert.deepEqual(
    byTag.get("🔗 JP Residential Exit 01 · 中转选择").outbounds,
    ["🇭🇰 香港 · 中转", "🇸🇬 新加坡 · 中转", "🔗 中转选择"],
  );
  assert.equal(config.outbounds.some((outbound) => outbound.type === "urltest"), false);
  assert.equal(validateConfigReferences(config), config);
});

test("落地节点保留原有辅助 outbound 链并在链尾追加中转", () => {
  const source = [
    { name: "HK Transit 01", role: "ordinary", producedTags: ["HK Transit 01"] },
    {
      name: "SG Landing 01",
      role: "landing",
      producedTags: ["SG Landing 01", "SG Landing 01 · TLS helper"],
    },
  ];
  const produced = [
    { type: "socks", tag: "HK Transit 01" },
    { type: "shadowtls", tag: "SG Landing 01 · TLS helper" },
    {
      type: "trojan",
      tag: "SG Landing 01",
      detour: "SG Landing 01 · TLS helper",
    },
  ];

  const config = buildConfig(source, produced, {}, () => undefined);
  const byTag = new Map(config.outbounds.map((outbound) => [outbound.tag, outbound]));

  assert.equal(
    byTag.get("SG Landing 01").detour,
    "SG Landing 01 · TLS helper",
  );
  assert.equal(
    byTag.get("SG Landing 01 · TLS helper").detour,
    "🔗 SG Landing 01 · 中转选择",
  );
  assert.equal(produced[1].detour, undefined, "buildConfig 不应修改调用方输入");
});

test("无法追加 detour 的落地 endpoint 会被跳过但普通配置继续生成", () => {
  const previousWarn = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  try {
    const config = buildConfig(
      [
        { name: "HK Transit 01", role: "ordinary" },
        {
          name: "WG Landing 01",
          role: "landing",
          producedTags: ["WG Landing 01"],
        },
      ],
      [
        { type: "socks", tag: "HK Transit 01" },
        { type: "wireguard", tag: "WG Landing 01" },
      ],
      {},
      () => undefined,
    );
    const byTag = new Map(
      config.outbounds.map((outbound) => [outbound.tag, outbound]),
    );

    assert.deepEqual(byTag.get("🇭🇰 香港").outbounds, ["HK Transit 01"]);
    assert.equal(config.endpoints, undefined);
    assert.equal(byTag.has("🔗 中转选择"), false);
    assert.match(warnings.join("\n"), /落地 endpoint 不支持追加 detour/);
  } finally {
    console.warn = previousWarn;
  }
});

test("引用校验拒绝 outbound 中转循环", () => {
  assert.throws(
    () =>
      validateConfigReferences({
        outbounds: [
          { type: "socks", tag: "node-a", detour: "node-b" },
          { type: "socks", tag: "node-b", detour: "node-a" },
        ],
      }),
    /依赖存在循环/,
  );
});

test("按子订阅给 AnyTLS 添加 SPKI pin 并移除 insecure", () => {
  const proxies = [
    {
      name: "Self-signed A",
      type: "anytls",
      _subName: "Subscription A",
      "skip-cert-verify": true,
    },
    {
      name: "Self-signed B",
      type: "anytls",
      _subName: "Subscription B",
      insecure: true,
    },
    { name: "Public certificate", type: "anytls", _subName: "Subscription C" },
  ];

  const applied = applySpkiPins(proxies, {
    spkiBySubscription: JSON.stringify({
      "Subscription A": TEST_PIN_A,
      "Subscription B": {
        certificate_public_key_sha256: [TEST_PIN_B],
      },
    }),
  });

  assert.equal(applied, 2);
  assert.deepEqual(proxies[0]._certificate_public_key_sha256, [TEST_PIN_A]);
  assert.deepEqual(proxies[1]._certificate_public_key_sha256, [TEST_PIN_B]);
  assert.equal("skip-cert-verify" in proxies[0], false);
  assert.equal("insecure" in proxies[1], false);
  assert.equal("_certificate_public_key_sha256" in proxies[2], false);
});

test("节点、证书指纹、订阅 pin 按优先级匹配", () => {
  const proxies = [
    {
      name: "Pinned by node",
      type: "anytls",
      _subName: "Subscription A",
      fingerprint: TEST_CERT_FINGERPRINT,
    },
    {
      name: "Pinned by fingerprint",
      type: "anytls",
      _subName: "Subscription A",
      fingerprint: TEST_CERT_FINGERPRINT.toUpperCase(),
    },
  ];

  applySpkiPins(proxies, {
    spkiByNode: { "Pinned by node": TEST_PIN_B },
    spkiByFingerprint: { [TEST_CERT_FINGERPRINT]: TEST_PIN_A },
    spkiBySubscription: { "Subscription A": TEST_PIN_B },
  });

  assert.deepEqual(proxies[0]._certificate_public_key_sha256, [TEST_PIN_B]);
  assert.deepEqual(proxies[1]._certificate_public_key_sha256, [TEST_PIN_A]);
});

test("需要 pin 的 AnyTLS 没有映射时拒绝生成", () => {
  assert.throws(
    () =>
      applySpkiPins([
        {
          name: "Missing pin",
          type: "anytls",
          _subName: "Subscription A",
          fingerprint: TEST_CERT_FINGERPRINT,
        },
      ]),
    /需要 SPKI pin/,
  );
  assert.throws(
    () =>
      applySpkiPins([], {
        spkiBySubscription: { "Subscription A": "not-base64" },
      }),
    /无效的 SPKI-SHA256/,
  );
});

test("移除 insecure 后继续转换，并隔离转换失败和重复 tag", () => {
  const conversion = produceCompatibleNodes(
    [
      { name: "Unsafe AnyTLS", type: "anytls", insecure: true },
      { name: "Broken node", type: "unsupported" },
      { name: "HK Edge 01", type: "vless" },
      { name: "Duplicate helper", type: "vless" },
    ],
    {},
    (proxy) => {
      if (proxy.name === "Broken node") throw new Error("不支持此协议");
      if (proxy.name === "Duplicate helper") {
        return [{ type: "vless", tag: "HK Edge 01" }];
      }
      return [
        {
          type: proxy.type,
          tag: proxy.name,
          tls: { enabled: true, insecure: false },
        },
      ];
    },
  );

  assert.deepEqual(
    conversion.proxies.map((proxy) => proxy.name),
    ["Unsafe AnyTLS", "HK Edge 01"],
  );
  assert.deepEqual(conversion.produced, [
    {
      type: "anytls",
      tag: "Unsafe AnyTLS",
      tls: { enabled: true },
    },
    { type: "vless", tag: "HK Edge 01", tls: { enabled: true } },
  ]);
  assert.equal("insecure" in conversion.proxies[0], false);
  assert.deepEqual(
    conversion.skipped.map((item) => item.name),
    ["Broken node", "Duplicate helper"],
  );
});

test("rmSsNet 只移除 Shadowsocks 出站的 network", () => {
  const proxies = [
    { name: "SS node", type: "ss" },
    { name: "Trojan node", type: "trojan" },
  ];
  const produceProxy = (proxy) => [
    {
      type: proxy.type === "ss" ? "shadowsocks" : proxy.type,
      tag: proxy.name,
      network: "tcp",
    },
  ];

  const kept = produceCompatibleNodes(proxies, {}, produceProxy);
  assert.equal(kept.produced[0].network, "tcp");

  const removed = produceCompatibleNodes(
    proxies,
    { rmSsNet: true },
    produceProxy,
  );
  assert.equal("network" in removed.produced[0], false);
  assert.equal(removed.produced[1].network, "tcp");
});

test("resolver 只应用到匹配域名的节点、辅助出站和 WireGuard endpoint", () => {
  const conversion = produceCompatibleNodes(
    [
      { name: "Domain node", type: "vless" },
      { name: "Unmatched domain", type: "trojan" },
      { name: "IPv4 node", type: "socks" },
      { name: "IPv6 node", type: "socks" },
      { name: "WG domain", type: "wireguard" },
      { name: "WG IP", type: "wireguard" },
    ],
    {
      resolver: JSON.stringify({
        "node.example.com": "local",
        "helper.example.com": {
          server: "ali",
          strategy: "prefer_ipv4",
          timeout: "5s",
          disable_cache: false,
        },
        ".example.net": "local",
      }),
    },
    (proxy) => {
      if (proxy.name === "Domain node") {
        return [
          {
            type: "shadowtls",
            tag: "Domain node · TLS helper",
            server: "helper.example.com",
          },
          {
            type: "vless",
            tag: proxy.name,
            server: "node.example.com",
            detour: "Domain node · TLS helper",
          },
        ];
      }
      if (proxy.name === "IPv4 node") {
        return [{ type: proxy.type, tag: proxy.name, server: "192.0.2.1" }];
      }
      if (proxy.name === "Unmatched domain") {
        return [
          { type: proxy.type, tag: proxy.name, server: "unmatched.test" },
        ];
      }
      if (proxy.name === "IPv6 node") {
        return [{ type: proxy.type, tag: proxy.name, server: "2001:db8::1" }];
      }
      return [
        {
          type: "wireguard",
          tag: proxy.name,
          peers: [
            {
              address:
                proxy.name === "WG domain" ? "wg.example.net" : "198.51.100.2",
            },
          ],
        },
      ];
    },
  );
  const byTag = new Map(conversion.produced.map((item) => [item.tag, item]));
  const helperResolver = {
    server: "ali",
    strategy: "prefer_ipv4",
    timeout: "5s",
    disable_cache: false,
  };

  assert.equal(byTag.get("Domain node").domain_resolver, "local");
  assert.deepEqual(
    byTag.get("Domain node · TLS helper").domain_resolver,
    helperResolver,
  );
  assert.equal(byTag.get("WG domain").domain_resolver, "local");
  assert.equal("domain_resolver" in byTag.get("Unmatched domain"), false);
  assert.equal("domain_resolver" in byTag.get("IPv4 node"), false);
  assert.equal("domain_resolver" in byTag.get("IPv6 node"), false);
  assert.equal("domain_resolver" in byTag.get("WG IP"), false);
});

test("resolver 支持精确和后缀匹配并拒绝无效配置", () => {
  for (const options of [
    { resolver: { "node.example.com": "ali" } },
    { resolver: { ".example.com": "local" } },
  ]) {
    const conversion = produceCompatibleNodes(
      [{ name: "Domain node", type: "vless" }],
      options,
      (proxy) => [
        { type: proxy.type, tag: proxy.name, server: "node.example.com" },
      ],
    );
    assert.equal(
      conversion.produced[0].domain_resolver,
      options.resolver["node.example.com"] || "local",
    );
  }

  assert.throws(
    () =>
      produceCompatibleNodes(
        [{ name: "Domain node", type: "vless" }],
        { resolver: { "node.example.com": { strategy: "prefer_ipv4" } } },
        () => [],
      ),
    /包含 server 的对象/,
  );
  assert.throws(
    () =>
      produceCompatibleNodes(
        [{ name: "Domain node", type: "vless" }],
        { resolver: { "*.example.com": "ali" } },
        () => [],
      ),
    /无效域名/,
  );
});

test("resolver 引用必须由模板 DNS server 提供", () => {
  const conversion = produceCompatibleNodes(
    [{ name: "HK Edge 01", type: "vless" }],
    { resolver: { ".example.com": "ali" } },
    (proxy) => [
      {
        type: proxy.type,
        tag: proxy.name,
        server: "node.example.com",
      },
    ],
  );
  const generated = buildConfig(
    [{ name: "HK Edge 01" }],
    conversion.produced,
    {},
    getISO,
  );
  const template = parseConfigTemplate(
    readFileSync(
      new URL("./sing-box-1.14-template.json", `file://${__dirname}/`),
      "utf8",
    ),
  );

  const config = mergeConfigTemplate(template, generated);
  assert.equal(
    config.outbounds.find((outbound) => outbound.tag === "HK Edge 01")
      .domain_resolver,
    "ali",
  );
  assert.throws(
    () => mergeConfigTemplate({ dns: { servers: [{ type: "local", tag: "local" }] } }, generated),
    /不存在的 DNS server "ali"/,
  );
});

test("解析文件内容模板并与动态 outbounds 合并", () => {
  const generated = buildConfig(
    [{ name: "HK Edge 01" }],
    [{ type: "anytls", tag: "HK Edge 01" }],
    {},
    getISO,
  );
  const template = parseConfigTemplate(
    JSON.stringify({
      log: { level: "info" },
      route: { final: "proxy" },
      outbounds: [
        {
          type: "selector",
          tag: "proxy",
          outbounds: ["🌐 代理选择", "direct"],
          default: "🌐 代理选择",
        },
      ],
    }),
  );

  const config = mergeConfigTemplate(template, generated);
  assert.deepEqual(config.log, { level: "info" });
  assert.equal(config.route.final, "proxy");
  assert.ok(config.outbounds.some((outbound) => outbound.tag === "HK Edge 01"));
  assert.ok(config.outbounds.some((outbound) => outbound.tag === "proxy"));
  assert.equal(config.outbounds.at(-1).tag, "proxy");
  assert.equal(validateConfigReferences(config), config);
});

test("仓库模板与脚本生成的 outbounds 合并后引用完整", () => {
  const generated = buildConfig(
    [{ name: "HK Edge 01" }, { name: "JP Edge 01" }],
    [
      { type: "anytls", tag: "HK Edge 01" },
      { type: "vless", tag: "JP Edge 01" },
    ],
    {},
    getISO,
  );
  const template = parseConfigTemplate(
    readFileSync(
      new URL("./sing-box-1.14-template.json", `file://${__dirname}/`),
      "utf8",
    ),
  );

  const config = mergeConfigTemplate(template, generated);
  assert.equal(validateConfigReferences(config), config);
  assert.equal(config.outbounds.some((outbound) => outbound.tag === "direct"), true);
  for (const tag of [...PROXY_SERVICE_TAGS, ...DIRECT_SERVICE_TAGS]) {
    assert.equal(config.outbounds.some((outbound) => outbound.tag === tag), true, tag);
  }
});

test("模板占位内容保持仅生成 outbounds 的兼容行为", () => {
  assert.equal(parseConfigTemplate("// 填入文件内容"), undefined);
  assert.equal(parseConfigTemplate(""), undefined);
  assert.throws(() => parseConfigTemplate("not json"), /不是有效的 sing-box JSON 模板/);
});

test("模板合并拒绝重复 tag 和悬空引用", () => {
  const generated = {
    outbounds: [{ type: "direct", tag: "node-a" }],
  };
  assert.throws(
    () =>
      mergeConfigTemplate(
        { outbounds: [{ type: "direct", tag: "node-a" }] },
        generated,
      ),
    /重复 tag/,
  );
  assert.throws(
    () =>
      mergeConfigTemplate(
        {
          route: { final: "missing" },
          outbounds: [{ type: "direct", tag: "direct" }],
        },
        generated,
      ),
    /引用不完整/,
  );
});

test("支持 sing-box 1.14 远程 rule-set 多 tag 定义", () => {
  const config = {
    outbounds: [{ type: "direct", tag: "direct" }],
    route: {
      final: "direct",
      rules: [
        {
          rule_set: ["geosite-private", "geosite-geolocation-cn"],
          outbound: "direct",
        },
      ],
      rule_set: [
        {
          type: "remote",
          tag: ["geosite-private", "geosite-geolocation-cn"],
          format: "binary",
          url: "https://example.test/{tag}.srs",
        },
      ],
    },
  };

  assert.equal(validateConfigReferences(config), config);
  assert.throws(
    () =>
      validateConfigReferences({
        ...config,
        route: {
          ...config.route,
          rule_set: [
            {
              type: "remote",
              tag: ["geosite-private", "geosite-geolocation-cn"],
              url: "https://example.test/geosite.srs",
            },
          ],
        },
      }),
    /必须包含 \{tag\}/,
  );
});

test("operator 从 Sub-Store 订阅生成并返回文件内容", async () => {
  const previousProxyUtils = global.ProxyUtils;
  const previousArguments = global.$arguments;
  const previousProduceArtifact = global.produceArtifact;
  global.$arguments = {
    source: "Test subscription",
    includeOther: "false",
    spkiBySubscription: {
      "Test subscription": TEST_PIN_A,
    },
  };
  global.ProxyUtils = {
    getISO,
    produce(proxies, platform, type) {
      assert.equal(platform, "sing-box");
      assert.equal(type, "internal");
      return proxies.map((proxy) => ({
        type: proxy.type,
        tag: proxy.name,
        tls: {
          enabled: true,
          certificate_public_key_sha256:
            proxy._certificate_public_key_sha256,
          ...(proxy["skip-cert-verify"] || proxy.insecure
            ? { insecure: true }
            : {}),
        },
      }));
    },
  };
  global.produceArtifact = async (options) => {
    assert.equal(options.type, "subscription");
    assert.equal(options.name, "Test subscription");
    assert.equal(options.platform, "JSON");
    assert.equal(options.produceType, "internal");
    return [
      {
        type: "anytls",
        name: "HK Edge 01",
        _subName: "Test subscription",
        "skip-cert-verify": true,
      },
    ];
  };

  try {
    const result = await operator({
      $content: JSON.stringify({
        log: { level: "info" },
        route: { final: "proxy" },
        outbounds: [
          {
            type: "selector",
            tag: "proxy",
            outbounds: ["🌐 代理选择", "direct"],
            default: "🌐 代理选择",
          },
        ],
      }),
      $files: [],
    });
    const config = JSON.parse(result.$content);
    assert.deepEqual(config.log, { level: "info" });
    assert.equal(config.route.final, "proxy");
    const countryGroup = config.outbounds.find(
      (outbound) => outbound.tag === "🇭🇰 香港",
    );
    assert.deepEqual(countryGroup.outbounds, ["HK Edge 01"]);
    assert.equal(config.outbounds.some((outbound) => outbound.type === "urltest"), false);
    const node = config.outbounds.find((outbound) => outbound.tag === "HK Edge 01");
    assert.deepEqual(node.tls.certificate_public_key_sha256, [TEST_PIN_A]);
    assert.equal("insecure" in node.tls, false);
    assert.deepEqual(result.$files, []);
  } finally {
    global.ProxyUtils = previousProxyUtils;
    global.$arguments = previousArguments;
    global.produceArtifact = previousProduceArtifact;
  }
});

test("operator 额外读取多个落地订阅且不对主来源做中转身份判断", async () => {
  const previousProxyUtils = global.ProxyUtils;
  const previousArguments = global.$arguments;
  const previousProduceArtifact = global.produceArtifact;
  const calls = [];
  global.$arguments = {
    type: "collection",
    source: "Main collection",
    landings: '["Landing A", "Landing B"]',
    relay: "HK",
  };
  global.ProxyUtils = {
    getISO() {
      return undefined;
    },
    produce(proxies) {
      return proxies.map((proxy) => ({ type: proxy.type, tag: proxy.name }));
    },
  };
  global.produceArtifact = async (options) => {
    calls.push({ type: options.type, name: options.name });
    if (options.name === "Main collection") {
      return [
        { name: "HK Ordinary 01", type: "socks" },
        { name: "SG Landing-like ordinary 01", type: "socks" },
        { name: "HK Shared With Landing 01", type: "socks" },
      ];
    }
    if (options.name === "Landing A") {
      return [
        { name: "JP Residential Exit 01", type: "socks" },
        { name: "HK Shared With Landing 01", type: "socks" },
      ];
    }
    if (options.name === "Landing B") {
      return [{ name: "US Residential Exit 01", type: "socks" }];
    }
    throw new Error("unexpected source");
  };

  try {
    const result = await operator({ $content: "// 填入文件内容", $files: [] });
    const config = JSON.parse(result.$content);
    const byTag = new Map(
      config.outbounds.map((outbound) => [outbound.tag, outbound]),
    );

    assert.deepEqual(calls, [
      { type: "collection", name: "Main collection" },
      { type: "subscription", name: "Landing A" },
      { type: "subscription", name: "Landing B" },
    ]);
    assert.deepEqual(byTag.get("🔗 中转选择").outbounds, [
      "🇭🇰 香港 · 中转",
      "HK Ordinary 01",
      "SG Landing-like ordinary 01",
    ]);
    assert.equal(
      byTag.get("JP Residential Exit 01").detour,
      "🔗 JP Residential Exit 01 · 中转选择",
    );
    assert.equal(
      byTag.get("HK Shared With Landing 01").detour,
      "🔗 HK Shared With Landing 01 · 中转选择",
    );
    assert.equal(
      byTag.get("US Residential Exit 01").detour,
      "🔗 US Residential Exit 01 · 中转选择",
    );
    assert.equal(byTag.has("🔗 Landing A · 中转选择"), false);
    assert.notEqual(
      byTag.get("JP Residential Exit 01").detour,
      byTag.get("HK Shared With Landing 01").detour,
    );
    assert.ok(
      byTag
        .get("🔗 中转选择")
        .outbounds.includes("SG Landing-like ordinary 01"),
    );
    assert.equal(byTag.has("🇸🇬 新加坡 · 中转"), false);
  } finally {
    global.ProxyUtils = previousProxyUtils;
    global.$arguments = previousArguments;
    global.produceArtifact = previousProduceArtifact;
  }
});

test("operator 遇到 insecure 和不兼容节点时仍输出可用节点", async () => {
  const previousProxyUtils = global.ProxyUtils;
  const previousArguments = global.$arguments;
  const previousProduceArtifact = global.produceArtifact;
  global.$arguments = { source: "Mixed subscription" };
  global.ProxyUtils = {
    getISO,
    produce(proxies) {
      assert.equal(proxies.length, 1);
      const [proxy] = proxies;
      if (proxy.name === "Broken node") throw new Error("不支持此协议");
      return [{ type: proxy.type, tag: proxy.name }];
    },
  };
  global.produceArtifact = async () => [
    { name: "Unsafe AnyTLS", type: "anytls", insecure: true },
    { name: "Broken node", type: "unsupported" },
    { name: "HK Edge 01", type: "vless" },
  ];

  try {
    const result = await operator({ $content: "// 填入文件内容", $files: [] });
    const config = JSON.parse(result.$content);
    const nodeTags = config.outbounds.map((outbound) => outbound.tag);

    assert.ok(nodeTags.includes("HK Edge 01"));
    assert.equal(nodeTags.includes("Unsafe AnyTLS"), true);
    assert.equal(nodeTags.includes("Broken node"), false);
    assert.equal(result.$content.includes("insecure"), false);
    assert.notEqual(result.$content, "// 填入文件内容");
  } finally {
    global.ProxyUtils = previousProxyUtils;
    global.$arguments = previousArguments;
    global.produceArtifact = previousProduceArtifact;
  }
});

test("diagnostic 默认关闭，启用后返回节点读取诊断", async () => {
  const previousProxyUtils = global.ProxyUtils;
  const previousArguments = global.$arguments;
  const previousProduceArtifact = global.produceArtifact;
  global.$arguments = { source: "All incompatible" };
  global.ProxyUtils = {
    getISO,
    produce(proxies) {
      if (proxies[0].type === "anytls") return [];
      throw new Error("不支持此协议");
    },
  };
  global.produceArtifact = async () => [
    { name: "Unsafe AnyTLS", type: "anytls", insecure: true },
    { name: "Broken node", type: "unsupported" },
  ];

  try {
    await assert.rejects(
      () => operator({ $content: "// 填入文件内容", $files: [] }),
      /没有可用于 sing-box 分组的节点/,
    );
    global.$arguments.diagnostic = true;
    const result = await operator({ $content: "// 填入文件内容", $files: [] });
    const diagnostic = JSON.parse(result.$content);

    assert.equal(diagnostic.kind, "sub-store-country-groups-diagnostic");
    assert.equal(diagnostic.success, false);
    assert.deepEqual(diagnostic.summary, {
      parsed: true,
      nodes_read: 2,
      nodes_converted: 0,
      items_produced: 0,
      nodes_skipped: 2,
      types_read: { anytls: 1, unsupported: 1 },
    });
    assert.deepEqual(diagnostic.skipped_reasons, {
      "Sub-Store 没有生成 sing-box 出站": 1,
      不支持此协议: 1,
    });
    assert.deepEqual(
      diagnostic.nodes.map(({ name, type, status }) => ({ name, type, status })),
      [
        { name: "Unsafe AnyTLS", type: "anytls", status: "skipped" },
        { name: "Broken node", type: "unsupported", status: "skipped" },
      ],
    );
    assert.notEqual(result.$content, "// 填入文件内容");
  } finally {
    global.ProxyUtils = previousProxyUtils;
    global.$arguments = previousArguments;
    global.produceArtifact = previousProduceArtifact;
  }
});

test("拒绝在订阅的节点脚本中使用", async () => {
  await assert.rejects(() => operator([]), /必须作为“文件”的脚本操作使用/);
});
