# DoPassGen security model

## Threat model summary

DoPassGen exists because "generate a password" asked of a language model, a
remote API, or a webhook means a secret transits infrastructure that is not
under the user's control. The design goal: **the secret is created in the
user's own runtime and never leaves it as a consequence of generation.**

### Trust boundaries

| Component | Trust boundary | Property |
|---|---|---|
| Browser generator | Page JS runs in the visitor's browser; server ships static files only | No secret, word index, or entropy state is transmitted |
| Wordlists | Served as static files; pinned by SHA-256 in the manifest | Generator refuses to run on hash mismatch |
| Entropy | Web Crypto `getRandomValues` with rejection sampling over the exact list size | Uniform word choice, no modulo bias; fail-closed without CSPRNG |
| MCP integration | Runs on the operator's own machine, stdio only | Secrets written to 0600 files in a validated 0700 dir; responses never contain a secret unless the caller explicitly opts in |

### Generation construction

1. Pick `count` words uniformly (rejection sampling, injected RNG — the RNG is
   a parameter, so tests can freeze it).
2. Capitalize at most one word (marker, not entropy source).
3. Insert at most one digit and one symbol at recorded positions (markers;
   digits/symbols cannot occur inside words, which are `[a-z]{3,6}`).
4. Join with a separator from `. - _` or none.

### Entropy honesty

The UI credits only **word-choice entropy**: `count × log2(1296)` = 31.02 /
41.35 / 51.69 / 62.04 bits for 3–6 words. Where the string cannot be *proven*
uniquely decodable back to the word sequence — the empty separator on most
wordlists — the UI displays "unknown" rather than a flattering estimate.
`docs/decodability-analysis.md` records the Sardinas–Patterson status of every
wordlist × separator combination, including concrete collision examples.

### Known limitations (stated, not hidden)

- A compromised rendering environment (malicious extension, XSS from another
  origin, malicious OS) can observe anything the page computes. DoPassGen does
  not attempt to defend against a compromised host.
- `en` keeps the upstream `yo-yo` exception (a word containing a hyphen); the
  site treats a separator occurring inside a word conservatively.
- The MCP example defends against drift, casual exposure and partial tamper;
  it does not defend against an attacker who can write both the integrity
  manifest and the files it covers.

## Verification chain

- `scripts/verify_wordlists.py` — manifest sha256 vs files (CI-enforced)
- `tests/generator.test.mjs` — generator invariants incl. a frozen-RNG
  regression against the originally audited implementation
- `tests/test_decodability.py` — locks the decodability table
- `scripts/analyze_decodability.py` — regenerates the analysis report

All checks run in CI on every push; see `.github/workflows/ci.yml`.

## Audit history

Three independent external code audits (static review + test reproduction) of
the generator, wordlist pipeline and MCP integration: no critical findings; all
identified issues (integrity-check enforcement, transcript-safety enforcement,
secret-file lifecycle, bundle reproducibility) remediated. Wordlist data is CC
BY-SA 4.0 derived from FrequencyWords at a pinned revision with per-list
attribution recorded in the manifest.
