// Minimal CDP driver: navigate, wait, screenshot, console capture, evaluate.
// Usage: node cdp.mjs <url> <waitMs> <outPng> [evalExpr]
import { writeFileSync } from "node:fs";

const [url, waitMs, outPng, evalExpr] = process.argv.slice(2);

const CDP = process.env.CDP_HOST || "localhost:9222";
const targets = await (await fetch(`http://${CDP}/json/list`)).json();
let page = targets.find(t => t.type === "page");
if (!page) {
  page = await (await fetch(`http://${CDP}/json/new?about:blank`, { method: "PUT" })).json();
}

const ws = new WebSocket(page.webSocketDebuggerUrl.replace(/(ws:\/\/)[^/]+/, `$1${CDP}`));
await new Promise(r => ws.onopen = r);

let id = 0;
const pending = new Map();
const consoleMsgs = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = msg.params.args.map(a => a.value ?? a.description ?? "").join(" ");
    consoleMsgs.push(`[${msg.params.type}] ${text.slice(0, 500)}`);
  }
  if (msg.method === "Runtime.exceptionThrown") {
    consoleMsgs.push(`[exception] ${JSON.stringify(msg.params.exceptionDetails).slice(0, 500)}`);
  }
};
function send(method, params = {}) {
  return new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
if (url !== "-") {
  await send("Page.navigate", { url });
}
await new Promise(r => setTimeout(r, parseInt(waitMs)));

if (evalExpr) {
  const ev = await send("Runtime.evaluate", { expression: evalExpr, returnByValue: true, awaitPromise: true });
  console.log("EVAL:", JSON.stringify(ev.result?.result?.value ?? ev.result, null, 1).slice(0, 3000));
}

if (outPng !== "-") {
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(outPng, Buffer.from(shot.result.data, "base64"));
  console.log("SAVED:", outPng);
}
console.log("CONSOLE:\n" + consoleMsgs.slice(-30).join("\n"));
if (process.env.CDP_CLOSE === "1") {
  await send("Browser.close");
  console.log("BROWSER CLOSED");
}
ws.close();
process.exit(0);
