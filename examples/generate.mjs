// End-to-end local generation example — the exact recipe from the agent skill.
// 1. load wordlist + manifest, 2. verify sha256 BEFORE use, 3. generate with
// Web Crypto rejection sampling. No network calls, no model involvement.
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPassword } from "../src/generator.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "wordlists/manifest.json"), "utf8"));

const lang = process.argv[2] ?? "en";
const entry = manifest.lists.find((e) => e.lang === lang);
if (!entry) throw new Error(`unknown language '${lang}' — available: ${manifest.lists.map((e) => e.lang).join(", ")}`);

const words = readFileSync(join(root, entry.public_path.replace(/^\//, "")), "utf8").replace(/\n$/, "").split("\n");
const sha = createHash("sha256").update(readFileSync(join(root, entry.public_path.replace(/^\//, "")))).digest("hex");
if (sha !== entry.sha256) throw new Error(`wordlist integrity FAILED for ${lang} — refusing to generate`);

const { password, entropy } = buildPassword(words,
  { count: 6, sep: "-", cap: false, digit: false, sym: false },
  () => webcrypto.getRandomValues(new Uint32Array(1))[0]);

console.log(`language: ${lang} (${entry.count} words, sha256 verified)`);
console.log(`entropy:  ${(Math.log2(entry.count) * 6).toFixed(2)} bits (6 uniform word choices)`);
console.log(`password: ${password}`);
