const assert = require("node:assert/strict");
const { readFileSync, mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const script = readFileSync(join(__dirname, "scripts.js"), "utf8");
const node = (name, extra = {}) => ({
  name, type: "socks5", server: "127.0.0.1", port: 1, ...extra,
});
const clone = (value) => JSON.parse(JSON.stringify(value));

function template() {
  return {
    proxies: [{ name: "直连", type: "direct", udp: true }],
    "proxy-providers": { HH: { type: "http", url: "" } },
    "proxy-groups": [
      { name: "默认代理", type: "select", proxies: ["美国手动", "香港手动", "全部手动", "直连"] },
      ...[["香港", "hk|香港"], ["日本", "jp|日本"], ["台湾", "tw|台湾"], ["狮城", "sg|新加坡"], ["美国", "us|美国"]]
        .map(([name, filter]) => ({ name: `${name}手动`, type: "select", "include-all": true, filter: `(?i)${filter}` })),
      { name: "全部手动", type: "select", "include-all": true, "exclude-filter": "直连" },
    ],
    dns: { enable: false },
    rules: ["MATCH,默认代理"],
  };
}

function harness(args = { source: "Main" }, sources = { Main: [node("hk-01")] }, getISO) {
  const calls = [];
  const warnings = [];
  const context = vm.createContext({
    $arguments: args,
    // JSON 是 YAML 的子集；单元测试无需安装 YAML 依赖。
    ProxyUtils: { yaml: { parse: JSON.parse, stringify: JSON.stringify }, getISO },
    console: { warn: (message) => warnings.push(message) },
    produceArtifact: async (options) => {
      calls.push(clone(options));
      const value = sources[options.name];
      if (value instanceof Error) throw value;
      if (typeof value === "string") return value;
      if (!value) throw new Error(`missing source ${options.name}`);
      return JSON.stringify({ proxies: value });
    },
  });
  vm.runInContext(script, context);
  return {
    context, calls, warnings,
    async run(config = template()) {
      const files = [];
      const result = await context.operator({ $content: JSON.stringify(config), $files: files });
      assert.equal(result.$files, files);
      return JSON.parse(result.$content);
    },
  };
}

const proxiesByName = (config) => new Map(config.proxies.map((proxy) => [proxy.name, proxy]));
const groupsByName = (config) => new Map(config["proxy-groups"].map((group) => [group.name, group]));

test("未配置 landings 时仍只填充模板，不新增中转组", async () => {
  const input = template();
  const h = harness({ source: "Main" }, { Main: [node("hk-ll-vless"), node("us-01")] });
  const config = await h.run(input);
  assert.deepEqual(h.calls, [{ type: "subscription", name: "Main", platform: "ClashMeta" }]);
  assert.deepEqual(config.proxies, [...input.proxies, node("hk-ll-vless"), node("us-01")]);
  assert.deepEqual(groupsByName(config).get("香港手动").proxies, ["hk-ll-vless"]);
  assert.equal(config["proxy-groups"].length, input["proxy-groups"].length);
  assert.equal(config["proxy-providers"], undefined);
  assert.deepEqual(config.rules, input.rules);
  assert.deepEqual(config.dns, input.dns);
  assert.ok(config["proxy-groups"].every((group) => group.type === "select"));
  assert.deepEqual(input, template());
});

test("读取多个落地订阅，每个落地节点独立选择中转，重叠节点按落地处理", async () => {
  const h = harness({ source: "Main", type: "collection", landings: '["Exit A", "Exit B"]' }, {
    Main: [node("hk-01"), node("sg-名字含落地但仍是普通节点"), node("us-shared", { port: 1010 })],
    "Exit A": [node("jp-exit"), node("us-shared", { port: 2020 })],
    "Exit B": [node("us-exit")],
  });
  const config = await h.run();
  assert.deepEqual(h.calls, [
    { type: "collection", name: "Main", platform: "ClashMeta" },
    { type: "subscription", name: "Exit A", platform: "ClashMeta" },
    { type: "subscription", name: "Exit B", platform: "ClashMeta" },
  ]);
  const groups = groupsByName(config);
  const proxies = proxiesByName(config);
  assert.deepEqual(groups.get("🔗 中转选择").proxies, [
    "🇭🇰 香港 · 中转", "🇸🇬 新加坡 · 中转", "hk-01", "sg-名字含落地但仍是普通节点",
  ]);
  assert.deepEqual(groups.get("🇭🇰 香港 · 中转").proxies, ["hk-01"]);
  assert.equal(groups.has("🇺🇸 美国 · 中转"), false);
  for (const name of ["jp-exit", "us-exit", "us-shared"]) {
    const selector = `🔗 ${name} · 中转选择`;
    assert.equal(proxies.get(name)["dialer-proxy"], selector);
    assert.deepEqual(groups.get(selector).proxies, ["🔗 中转选择", "🇭🇰 香港 · 中转", "🇸🇬 新加坡 · 中转"]);
  }
  assert.equal(proxies.get("us-shared").port, 1010);
  assert.equal(config.proxies.filter((proxy) => proxy.name === "us-shared").length, 1);
  assert.equal(proxies.get("sg-名字含落地但仍是普通节点")["dialer-proxy"], undefined);
  assert.deepEqual(groups.get("美国手动").proxies, ["us-shared", "us-exit"]);
  assert.equal(groups.get("默认代理").proxies[0], "美国手动");
  assert.ok(config["proxy-groups"].every((group) => group.type === "select"));
  assert.match(h.warnings.join("\n"), /重复节点名 us-shared/);
});

test("landings 支持数组、JSON、逗号和换行，relay 支持自定义顺序和名称", async () => {
  for (const landings of [["Exit", "Exit"], '["Exit","Exit"]', " Exit,Exit ", "Exit\nExit"]) {
    const h = harness({ source: "Main", landings, relay: '["jp","hk","jp"]', relayTag: "自选中转" }, {
      Main: [node("hk-01"), node("jp-01"), node("sg-01")], Exit: [node("us-exit")],
    });
    const groups = groupsByName(await h.run());
    assert.equal(h.calls.length, 2);
    assert.deepEqual(groups.get("自选中转").proxies, ["🇯🇵 日本 · 中转", "🇭🇰 香港 · 中转", "hk-01", "jp-01", "sg-01"]);
    assert.equal(groups.has("🇸🇬 新加坡 · 中转"), false);
    assert.equal(groups.get("🔗 us-exit · 中转选择").proxies[0], "自选中转");
  }
  for (const args of [{ landings: "[" }, { landings: [1] }, { relay: {} }, { relay: "HongKong" }]) {
    const h = harness({ source: "Main", ...args });
    await assert.rejects(h.run(), /landings|relay/);
    assert.equal(h.calls.length, 0);
  }
});

test("中转地区识别支持旗帜、名称、代码和 Sub-Store getISO", () => {
  const h = harness(undefined, undefined, (name) => name === "custom location" ? "DE" : undefined);
  for (const [name, iso] of [
    ["hk-ll-vless", "HK"], ["HKG01", "HK"], ["Hong Kong", "HK"], ["🇺🇸 generic", "US"],
    ["tAiPeI 01", "TW"], ["nrt02", "JP"], ["sInGaPoRe", "SG"], ["lax-01", "US"],
    ["custom location", "DE"], ["de-01", "DE"], ["status premium", undefined], ["unknown", undefined],
  ]) {
    assert.equal(h.context.detectRelayCountry(name, ["HK", "TW", "JP", "SG", "US", "DE"]), iso, name);
  }
});

test("失败、为空或无效的落地订阅被跳过，但主来源失败必须报错", async () => {
  const h = harness({ source: "Main", landings: "Broken,Empty,Malformed,Good" }, {
    Main: [node("hk-01")], Broken: new Error("fetch failed"), Empty: [],
    Malformed: [{ type: "socks5" }], Good: [node("us-exit")],
  });
  const config = await h.run();
  assert.equal(h.warnings.length, 3);
  assert.equal(proxiesByName(config).get("us-exit")["dialer-proxy"], "🔗 us-exit · 中转选择");
  const allFailed = harness({ source: "Main", landings: "Bad" }, { Main: [node("hk-01")], Bad: [] });
  assert.equal((await allFailed.run())["proxy-groups"].length, template()["proxy-groups"].length);
  await assert.rejects(harness({ source: "Main", landings: "Good" }, {
    Main: new Error("primary failed"), Good: [node("us-exit")],
  }).run(), /主来源读取失败.*primary failed/);
  await assert.rejects(harness({ source: "Main" }, { Main: [] }).run(), /没有生成可用/);
});

test("没有普通中转节点时拒绝生成，模板直连不能代替中转", async () => {
  await assert.rejects(harness({ source: "Main", landings: "Exit" }, {
    Main: [node("us-exit")], Exit: [node("us-exit")],
  }).run(), /没有可作为中转的普通节点/);
  await assert.rejects(harness({ source: "Main", landings: "Exit" }, {
    Main: [{ name: "主来源直连", type: "direct" }], Exit: [node("us-exit")],
  }).run(), /没有可作为中转的普通节点/);
});

test("中转组名自动避让现有节点、组和 provider 名称", async () => {
  const input = template();
  input["proxy-groups"].push({ name: "🔗 us-exit · 中转选择", type: "select", proxies: ["DIRECT"] });
  input["proxy-providers"].occupied = { type: "inline", payload: [node("other")] };
  const config = await harness({ source: "Main", landings: "Exit", relayTag: "occupied" }, {
    Main: [node("hk-01"), node("🇭🇰 香港 · 中转")], Exit: [node("us-exit")],
  }).run(input);
  const groups = groupsByName(config);
  assert.ok(groups.has("🇭🇰 香港 · 中转 (2)"));
  assert.ok(groups.has("occupied (2)"));
  assert.ok(groups.has("🔗 us-exit · 中转选择 (2)"));
  assert.equal(proxiesByName(config).get("us-exit")["dialer-proxy"], "🔗 us-exit · 中转选择 (2)");
  for (const name of ["默认代理", "直连", "DIRECT"]) {
    await assert.rejects(harness({ source: "Main" }, { Main: [node(name)] }).run(), /名称冲突/);
  }
});

test("保留已有落地链，共享链尾复制隔离，辅助节点不进入模板分组", async () => {
  const sources = {
    Main: [node("hk-relay")],
    Exit: [
      node("us-a", { "dialer-proxy": "us-helper" }),
      node("us-b", { "dialer-proxy": "us-helper" }),
      node("us-helper", { username: "user", password: "test-password" }),
    ],
  };
  const before = clone(sources);
  const config = await harness({ source: "Main", landings: "Exit" }, sources).run();
  const proxies = proxiesByName(config);
  const helperNames = [];
  for (const name of ["us-a", "us-b"]) {
    const helperName = proxies.get(name)["dialer-proxy"];
    assert.notEqual(helperName, "us-helper");
    const helper = proxies.get(helperName);
    assert.equal(helper.password, "test-password");
    assert.equal(helper["dialer-proxy"], `🔗 ${name} · 中转选择`);
    helperNames.push(helperName);
  }
  assert.notEqual(helperNames[0], helperNames[1]);
  const groups = groupsByName(config);
  assert.deepEqual(groups.get("美国手动").proxies, ["us-a", "us-b", "us-helper"]);
  assert.ok(groups.get("全部手动").proxies.every((name) => !helperNames.includes(name)));
  assert.deepEqual(groups.get("🔗 中转选择").proxies, ["🇭🇰 香港 · 中转", "hk-relay"]);
  assert.deepEqual(sources, before);
});

test("不覆盖指向落地集合外部的 dialer-proxy，跳过无效或循环落地链", async () => {
  const h = harness({ source: "Main", landings: "Exit" }, {
    Main: [node("hk-01")],
    Exit: [
      node("us-outside", { "dialer-proxy": "hk-01" }),
      node("us-missing", { "dialer-proxy": "missing" }),
      node("us-a", { "dialer-proxy": "us-b" }),
      node("us-b", { "dialer-proxy": "us-a" }),
      { name: "us-direct", type: "direct" },
      node("us-good"),
    ],
  });
  const config = await h.run();
  assert.deepEqual(config.proxies.map((proxy) => proxy.name), ["直连", "hk-01", "us-good"]);
  assert.equal(h.warnings.length, 5);
  assert.match(h.warnings.join("\n"), /原有 dialer-proxy 链存在循环/);
});

test("拒绝经普通节点、模板组间接回到落地的环路以及悬空引用", async () => {
  for (const dialer of ["us-exit", "全部手动"]) {
    await assert.rejects(harness({ source: "Main", landings: "Exit" }, {
      Main: [node("hk-01", { "dialer-proxy": dialer })], Exit: [node("us-exit")],
    }).run(), /代理链路存在循环/);
  }
  await assert.rejects(harness({ source: "Main" }, {
    Main: [node("hk-01", { "dialer-proxy": "missing" })],
  }).run(), /引用了不存在的代理或组 missing/);
  const config = template();
  config["proxy-groups"][0].proxies = ["默认代理"];
  await assert.rejects(harness().run(config), /代理链路存在循环/);
});

// 可选真实内核集成测试：MIHOMO_TEST=1 node --test scripts.test.js
// 所有连接仅发生在 loopback，不使用真实订阅或外部服务。
test("Mihomo 实际请求经过中转和落地，并可独立切换中转", {
  skip: process.env.MIHOMO_TEST !== "1", timeout: 20000,
}, async (t) => {
  const net = require("node:net");
  const http = require("node:http");
  const { spawn } = require("node:child_process");
  const { once } = require("node:events");
  const events = [];

  async function listen(server) {
    const sockets = new Set();
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    t.after(async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    });
    return server.address().port;
  }

  async function socks(label) {
    return listen(net.createServer((client) => {
      let buffer = Buffer.alloc(0);
      let stage = "greeting";
      client.on("error", () => client.destroy());
      const onData = (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        if (stage === "greeting") {
          if (buffer.length < 2 || buffer.length < 2 + buffer[1]) return;
          if (buffer[0] !== 5) return client.destroy();
          buffer = buffer.subarray(2 + buffer[1]);
          client.write(Buffer.from([5, 0]));
          stage = "connect";
        }
        if (buffer.length < 4) return;
        if (buffer[0] !== 5 || buffer[1] !== 1) return client.destroy();
        let host;
        let offset;
        if (buffer[3] === 1) {
          if (buffer.length < 10) return;
          host = [...buffer.subarray(4, 8)].join(".");
          offset = 8;
        } else if (buffer[3] === 3) {
          if (buffer.length < 5 || buffer.length < 7 + buffer[4]) return;
          host = buffer.subarray(5, 5 + buffer[4]).toString();
          offset = 5 + buffer[4];
        } else {
          return client.destroy();
        }
        if (host !== "127.0.0.1") return client.destroy();
        const port = buffer.readUInt16BE(offset);
        const pending = buffer.subarray(offset + 2);
        client.removeListener("data", onData);
        client.pause();
        const upstream = net.connect({ host, port }, () => {
          events.push({ label, port });
          client.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]));
          if (pending.length) upstream.write(pending);
          client.pipe(upstream);
          upstream.pipe(client);
          client.resume();
        });
        upstream.on("error", () => client.destroy());
        client.on("close", () => upstream.destroy());
        upstream.on("close", () => client.destroy());
      };
      client.on("data", onData);
    }));
  }

  function request(options, body) {
    return new Promise((resolve, reject) => {
      const req = http.request({ ...options, timeout: 3000, agent: false }, (res) => {
        let data = "";
        res.on("data", (part) => { data += part; });
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      });
      req.on("error", reject);
      req.on("timeout", () => req.destroy(new Error("request timeout")));
      req.end(body);
    });
  }

  const target = await listen(http.createServer((req, res) => res.end("relay verified")));
  const hk = await socks("HK");
  const jp = await socks("JP");
  const exit = await socks("EXIT");
  const helper = await socks("HELPER");
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const mixedPort = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const h = harness({ source: "Main", landings: "Exit" }, {
    Main: [node("hk-relay", { port: hk }), node("jp-relay", { port: jp })],
    Exit: [node("us-exit", { port: exit, "dialer-proxy": "exit-helper" }), node("exit-helper", { port: helper })],
  });
  const config = await h.run();
  const dir = mkdtempSync(join(tmpdir(), "mihomo-relay-"));
  const socketPath = join(dir, "api.sock");
  writeFileSync(join(dir, "config.yaml"), JSON.stringify({
    "mixed-port": mixedPort, "bind-address": "127.0.0.1", "allow-lan": false,
    "external-controller-unix": socketPath, "log-level": "error",
    proxies: config.proxies, "proxy-groups": config["proxy-groups"], rules: ["MATCH,us-exit"],
  }));
  const child = spawn(process.env.MIHOMO_BIN || "mihomo", ["-d", dir, "-f", join(dir, "config.yaml")]);
  const exited = once(child, "exit");
  let logs = "";
  child.stdout.on("data", (data) => { logs += data; });
  child.stderr.on("data", (data) => { logs += data; });
  try {
    let api;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(logs);
      try {
        api = JSON.parse((await request({ socketPath, path: "/proxies" })).body);
        break;
      } catch (_) { /* 等待本地控制接口就绪。 */ }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(api?.proxies, logs);
    assert.equal(api.proxies["🔗 us-exit · 中转选择"].now, "🔗 中转选择");
    assert.deepEqual(api.proxies["美国手动"].all, ["us-exit"]);
    const send = () => request({
      hostname: "127.0.0.1", port: mixedPort, path: `http://127.0.0.1:${target}/`,
      headers: { Host: `127.0.0.1:${target}` },
    });
    assert.deepEqual(await send(), { status: 200, body: "relay verified" });
    assert.deepEqual(events, [{ label: "HK", port: helper }, { label: "HELPER", port: exit }, { label: "EXIT", port: target }]);
    events.length = 0;
    const changed = await request({
      socketPath, path: `/proxies/${encodeURIComponent("🔗 us-exit · 中转选择")}`,
      method: "PUT", headers: { "Content-Type": "application/json" },
    }, JSON.stringify({ name: "🇯🇵 日本 · 中转" }));
    assert.equal(changed.status, 204);
    assert.deepEqual(await send(), { status: 200, body: "relay verified" });
    assert.deepEqual(events, [{ label: "JP", port: helper }, { label: "HELPER", port: exit }, { label: "EXIT", port: target }]);
    api = JSON.parse((await request({ socketPath, path: "/proxies" })).body);
    assert.equal(api.proxies["🔗 中转选择"].now, "🇭🇰 香港 · 中转");
    assert.equal(api.proxies["🔗 exit-helper · 中转选择"].now, "🔗 中转选择");
  } finally {
    if (child.exitCode === null) child.kill("SIGTERM");
    await exited;
    rmSync(dir, { recursive: true, force: true });
  }
});
