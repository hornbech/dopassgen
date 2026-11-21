# DoPassGen — Cryptographically Secure Password Generation for Humans and AI Agents

[![CI](https://github.com/hornbech/dopassgen/actions/workflows/ci.yml/badge.svg)](https://github.com/hornbech/dopassgen/actions/workflows/ci.yml)

> Generate readable, high-entropy passphrases **locally**. Built for browsers, developers and AI agents — without sending secrets to a remote password-generation API.

## For humans

Generate passwords directly at [dopassgen.com](https://dopassgen.com).

## For AI agents

Discover and follow the [Password Generation Agent Skill](https://dopassgen.com/skills/password-generation/SKILL.md) (also in this repo at `skills/password-generation/SKILL.md`). Verify wordlist hashes, then generate secrets with a cryptographic runtime — **never with the language model itself**.

Site-level discovery documents: [`/llms.txt`](https://dopassgen.com/llms.txt), [`/llms-full.txt`](https://dopassgen.com/llms-full.txt), [`/agents/manifest.json`](https://dopassgen.com/agents/manifest.json), [`/wordlists/manifest.json`](https://dopassgen.com/wordlists/manifest.json).

## For developers

Review the source, verify wordlist integrity, run the tests, integrate the local generator:

```bash
python3 scripts/verify_wordlists.py        # sha256 of all 28 wordlists vs manifest
node --test tests/generator.test.mjs       # generator regression suite
python3 -m unittest discover -s tests      # decodability suite
node examples/generate.mjs                 # end-to-end local generation example
```

## Security model

- **No server-side generation.** The passphrase is assembled in the browser (or your runtime) with Web Crypto rejection sampling. The server ships static files only.
- **Uniform word choice.** Word indices are drawn with rejection sampling over the exact wordlist size — no modulo bias.
- **Verifiable wordlists.** 28 languages × 1296 validated words, each pinned by SHA-256 in `wordlists/manifest.json`. The browser refuses to run on a hash mismatch.
- **Honest entropy.** The UI credits only recoverable word-choice entropy; where the construction is not provably uniquely decodable (empty separator on most wordlists), it shows "unknown" instead of a flattering number. The per-list, per-separator analysis lives in `docs/decodability-analysis.md` (Sardinas–Patterson, with example collisions).
- **Transcript-safe agent workflow.** The bundled MCP example never puts a secret in a model response: passwords are either written to a `0600` file inside a validated `0700` directory (tool returns only the path), or returned only after the caller explicitly passes `confirm_transcript: true`.
- **No Math.random anywhere in the generator**, no weak-RNG fallback: missing CSPRNG fails closed.

## Repository layout

| Path | Purpose |
|---|---|
| `src/generator.js` | The audited cryptographic generator (`buildPassword`, rejection sampling, injected RNG) |
| `wordlists/manifest.json` | Per-language registry: counts, SHA-256, licenses, review status |
| `words/*.txt` | The 28 published wordlists (CC BY-SA 4.0 derived — see `wordlists/ATTRIBUTION.md`) |
| `skills/password-generation/SKILL.md` | Installable agent skill (frontmatter + full instructions) |
| `mcp-server/` | Local MCP integration example (integrity-checked, transcript-safe) |
| `tests/` | Generator regression tests + decodability invariants |
| `scripts/` | Wordlist verification + Sardinas–Patterson decodability analysis |
| `docs/` | Security model, decodability analysis |

## Wordlist licensing

Application code: Apache-2.0. Wordlist data: **CC BY-SA 4.0**, derived from the
[FrequencyWords](https://github.com/hermitdave/FrequencyWords) project at a pinned,
audited revision — attribution and modification notes per list are recorded in
`wordlists/manifest.json` and `wordlists/ATTRIBUTION.md`. Preserve those notices
when redistributing.

## Wordlist policy

Curated ASCII-only variants (`ascii-curated-1`), validated: exactly 1296 words,
3–6 lowercase letters, unique, no duplicates after normalization — with the single
documented upstream exception (`en` keeps `yo-yo`). Every list carries a review
status in the manifest.

## Status

- Site release: v1.9.4 (2026-11-20)
- `/agents/` — the AI-developer landing page — is indexed (`index, follow`,
  meta description, sitemap entry) and linked from every locale footer.
- Test suites: 153 Python + 24 Node, all passing (CI runs them on every push)
- External code audits: three rounds completed; no critical findings; all
  identified issues remediated. This repository is the verifiable reference —
  the production deployment is separate and private.

## Reporting a vulnerability

See [SECURITY.md](SECURITY.md).
