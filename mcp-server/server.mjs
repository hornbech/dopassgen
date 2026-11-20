#!/usr/bin/env node
// DoPassGen MCP integration EXAMPLE (manor-local reference implementation).
//
// Layout expected (this repository's layout):
//   DPG_ROOT (default: repository root) containing src/generator.js,
//   words/*.txt and wordlists/manifest.json.
//
// Security properties demonstrated here:
//   1. Wordlists are sha256-verified against wordlists/manifest.json BEFORE
//      any use; the generator import is refused if verification fails.
//      Optional stronger pin: set DPG_GENERATOR_SHA256 to the expected hash
//      of src/generator.js and the server verifies it before importing.
//   2. generate_password NEVER returns a secret unless the caller explicitly
//      passes confirm_transcript: true — otherwise it refuses.
//   3. generate_password_to_file writes to a 0600 file with a crypto-random
//      name inside a validated 0700 directory (symlink/foreign-owner/wrong
//      mode are handled: refuse or self-heal), try/finally closes the handle,
//      and returns ONLY the path.
//   4. TTL: hourly in-process sweep (unref'd) plus a companion cron/systemd
//      timer (sweep.sh) so the lifetime holds even when the server is idle.
//      Sweeps delete ONLY files matching the naming scheme and never follow
//      symlinks.
//
// Run: node mcp-server/server.mjs   (stdio JSON-RPC, MCP 2024-11-05)
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, lstatSync, mkdirSync, chmodSync, openSync, writeSync, closeSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.DPG_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");
const SECRETS_DIR = process.env.DPG_SECRETS_DIR || "/tmp/dopassgen-mcp-secrets";
const TTL_MS = 24 * 60 * 60 * 1000;

// ---- integrity BEFORE import: verify wordlists (always) and generator (if pinned)
const manifest = JSON.parse(readFileSync(join(ROOT, "wordlists/manifest.json"), "utf8"));
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
for (const entry of manifest.lists) {
  const p = join(ROOT, entry.public_path.replace(/^\//, ""));
  let actual;
  try { actual = sha(p); } catch { console.error(`dopassgen-mcp: cannot read ${entry.public_path}`); process.exit(1); }
  if (actual !== entry.sha256) {
    console.error(`dopassgen-mcp: wordlist integrity FAILED for ${entry.public_path}\n  expected ${entry.sha256}\n  actual   ${actual}`);
    process.exit(1);
  }
}
if (process.env.DPG_GENERATOR_SHA256) {
  const actual = sha(join(ROOT, "src/generator.js"));
  if (actual !== process.env.DPG_GENERATOR_SHA256) {
    console.error(`dopassgen-mcp: generator pin FAILED\n  expected ${process.env.DPG_GENERATOR_SHA256}\n  actual   ${actual}`);
    process.exit(1);
  }
}

// ---- import only after verification
const gen = await import(`file://${join(ROOT, "src/generator.js")}`);
const lists = Object.fromEntries(manifest.lists.map((e) => [
  e.lang, readFileSync(join(ROOT, e.public_path.replace(/^\//, "")), "utf8").replace(/\n$/, "").split("\n"),
]));
const langs = manifest.lists.map((e) => `${e.lang} (${e.count})`).join(", ");

function build({ language = "en", words = 6, separator = "-", cap = false, digit = false, sym = false } = {}) {
  const lang = String(language);
  const list = lists[lang];
  if (!list) throw new Error(`unknown language '${lang}'. available: ${manifest.lists.map((e) => e.lang).join(", ")}`);
  const count = Math.min(6, Math.max(3, Number(words) || 6));
  const sep = separator === "none" ? "" : String(separator);
  if (![".", "-", "_", ""].includes(sep)) throw new Error("separator must be '.', '-', '_' or 'none'");
  if (!globalThis.crypto?.getRandomValues) throw new Error("Web Crypto unavailable; no weak-RNG fallback");
  const result = gen.buildPassword(list, { count, sep, cap: !!cap, digit: !!digit, sym: !!sym },
    () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]);
  return result.password;
}

function sweepExpired() {
  try {
    for (const f of readdirSync(SECRETS_DIR)) {
      if (!/^pw-\d{13}-[a-f0-9]{16}\.txt$/.test(f)) continue; // our naming scheme only
      const p = join(SECRETS_DIR, f);
      let st;
      try { st = lstatSync(p); } catch { continue; }
      if (st.isSymbolicLink() || !st.isFile()) continue;
      if (Date.now() - st.mtimeMs > TTL_MS) { try { unlinkSync(p); } catch {} }
    }
  } catch {}
}

function ensureSecretsDir() {
  let st;
  try { st = lstatSync(SECRETS_DIR); }
  catch {
    mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 });
    st = lstatSync(SECRETS_DIR);
  }
  if (st.isSymbolicLink() || !st.isDirectory()) {
    console.error(`dopassgen-mcp: ${SECRETS_DIR} is a symlink or not a directory — refusing to store secrets`);
    process.exit(1);
  }
  if (typeof process.getuid === "function" && st.uid !== process.getuid()) {
    console.error(`dopassgen-mcp: ${SECRETS_DIR} owned by uid ${st.uid}, running as uid ${process.getuid()} — refusing`);
    process.exit(1);
  }
  if ((st.mode & 0o777) !== 0o700) chmodSync(SECRETS_DIR, 0o700);
}

ensureSecretsDir();
const sweepTimer = setInterval(sweepExpired, 60 * 60 * 1000);
sweepTimer.unref();

function writeSecret(password) {
  ensureSecretsDir();
  sweepExpired();
  const path = join(SECRETS_DIR, `pw-${Date.now()}-${randomBytes(8).toString("hex")}.txt`);
  let fd;
  try {
    fd = openSync(path, "wx", 0o600);
    writeSync(fd, password + "\n");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  return path;
}

const TOOLS = [
  { name: "dopassgen_info", description: "DoPassGen languages, manifests and the local-generation rule. No secrets.",
    inputSchema: { type: "object", properties: {} } },
  { name: "generate_password",
    description: ("Generate a passphrase locally with the pinned DoPassGen module (Web Crypto rejection sampling). "
      + "REQUIRES confirm_transcript=true: the password would enter this conversation's transcript. "
      + "Default words=6. Automated/vault flows MUST use generate_password_to_file instead."),
    inputSchema: { type: "object", properties: {
      language: { type: "string", description: `wordlist language: ${manifest.lists.map((e) => e.lang).join(", ")}` },
      words: { type: "integer", minimum: 3, maximum: 6 },
      separator: { type: "string", enum: [".", "-", "_", "none"] },
      cap: { type: "boolean" }, digit: { type: "boolean" }, sym: { type: "boolean" },
      confirm_transcript: { type: "boolean",
        description: "Explicit opt-in: I understand the password will appear in this transcript." },
    }, required: ["confirm_transcript"] } },
  { name: "generate_password_to_file",
    description: ("Generate a passphrase and write it to a 0600 file in a validated 0700 directory "
      + "(swept after 24h); returns ONLY the path — no secret in the transcript. Preferred for automation."),
    inputSchema: { type: "object", properties: {
      language: { type: "string" }, words: { type: "integer", minimum: 3, maximum: 6 },
      separator: { type: "string", enum: [".", "-", "_", "none"] },
      cap: { type: "boolean" }, digit: { type: "boolean" }, sym: { type: "boolean" },
    } } },
];

function callTool(name, args = {}) {
  if (name === "dopassgen_info") {
    return { content: [{ type: "text", text: JSON.stringify({
      site: "https://dopassgen.com",
      languages: langs,
      manifests: {
        skill: "https://dopassgen.com/skills/password-generation/SKILL.md",
        wordlists: "https://dopassgen.com/wordlists/manifest.json",
      },
      rule: "Passwords are generated locally with cryptographic randomness. Never invent a password with a language model. Keep generated secrets out of transcripts, logs and URLs.",
    }, null, 2) }] };
  }
  if (name === "generate_password") {
    if (args.confirm_transcript !== true) {
      return { content: [{ type: "text",
        text: "Refused: generate_password requires confirm_transcript=true because the password would enter this transcript. Use generate_password_to_file for vault/automation flows — the secret never reaches the model." }] };
    }
    const password = build(args);
    return { content: [{ type: "text", text: JSON.stringify({ password, params: args, note: "This value is now in the conversation transcript — use generate_password_to_file for vault flows." }, null, 2) }] };
  }
  if (name === "generate_password_to_file") {
    const password = build(args);
    const path = writeSecret(password);
    return { content: [{ type: "text", text: JSON.stringify({ written_to: path, params: args, note: "Password NOT included in this response; it is in the 0600 file inside a 0700 directory (swept after 24h)." }, null, 2) }] };
  }
  throw new Error(`unknown tool: ${name}`);
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});
function send(obj) { process.stdout.write(JSON.stringify(obj) + "\n"); }
function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    send({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} },
      serverInfo: { name: "dopassgen", version: "1.0.0" } } });
    return;
  }
  if (method === "notifications/initialized" || method?.startsWith?.("notifications/")) return;
  if (method === "ping") { send({ jsonrpc: "2.0", id, result: {} }); return; }
  try {
    if (method === "tools/list") { send({ jsonrpc: "2.0", id, result: { tools: TOOLS } }); return; }
    if (method === "tools/call") {
      send({ jsonrpc: "2.0", id, result: callTool(params.name, params.arguments || {}) });
      return;
    }
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } });
  } catch (e) {
    send({ jsonrpc: "2.0", id, error: { code: -32000, message: String(e.message || e) } });
  }
}
console.error(`dopassgen-mcp: wordlists verified (${manifest.lists.length}); generator ${process.env.DPG_GENERATOR_SHA256 ? "pin verified" : "unpinned (set DPG_GENERATOR_SHA256 to pin)"}`);
