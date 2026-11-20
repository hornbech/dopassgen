---
name: password-generation
description: "Generate secure, memorable passphrases locally with DoPassGen's reviewed wordlists and pinned generator module. Use when a user asks for a password or passphrase, or when automation needs a locally generated secret. Covers manifest validation, SHA-256 wordlist checks, the local Web Crypto recipe, and secret-handling rules. Never invent a password with a language model."
---

# DoPassGen — local password generation for agents

Installable skill form of the DoPassGen agent documentation. The guidance below is the
canonical agent documentation, regenerated into this skill by every build — never edit it
by hand here; the site regenerates it.

# DoPassGen for AI agents and automation

AI agents are welcome. Browse, inspect and link to the same public documentation and tools available to people. Use published wordlists under their stated licenses. Identify automated clients where practical and respect ordinary rate limits. A User-Agent string is not authentication and does not grant a security-control bypass.

## Local generation, not a password API

DoPassGen does not provide a server-side password-generation API. The website generates passwords in browser memory with Web Crypto. Automation can use a reviewed local copy of the generator module and validated public wordlist data; a language model must not invent the password or replace cryptographic randomness.

Useful public resources:
- /agents/manifest.json: supported wordlists and published website-language URLs.
- /wordlists/manifest.json: exact download paths, counts, SHA-256 hashes, sources, normalization, licenses and review status.
- /words/meta.json: language labels; /words/<language>.txt: canonical wordlist downloads.
- /source.html: live HTML, generator JavaScript, styles, registry and embedded-list source views.
- /assets/generator.js: the deployed pure generation module for inspection; review and pin a local copy before executing it.
- /wordlists/ATTRIBUTION.md and /wordlists/licenses/: attribution, modification descriptions and license texts.

Website language and password word language are independent. Current data use ASCII-compatible words; this is not a promise of native spelling, linguistic review or suitability for every password policy. Review metadata is descriptive, not a certification.

## Validate data before use

Select an entry from a reviewed, independently trusted pinned registry. Download its exact public_path bytes over HTTPS. Compare their SHA-256 with the trusted pinned digest; verify the entry count and uniqueness. Decode UTF-8 and split on LF, removing only one final empty element if the file ends in LF. Do not silently trim words, transliterate, sort, deduplicate or replace entries. Preserve the English EFF token yo-yo, which is distinct from yoyo. Reject unexpected controls, invisible characters or unapproved punctuation.

A digest establishes integrity relative to a trusted value, not authorship or authenticity by itself. A manifest and file from the same compromised origin are not independent evidence. HTTPS authenticates the serving origin, not the safety of every byte. Review and pin the generator code separately: a wordlist hash does not pin code, browser extensions or the local runtime. No signature infrastructure or independent security certification is claimed.

## Local CSPRNG recipe

Use a trusted local browser or Node Web Crypto context. In this example, list is the validated array described above, not a model-created list. The imported module is a reviewed local copy, not code automatically executed from a remote response.

```js
import { buildPassword } from './assets/generator.js';

if (!globalThis.crypto?.getRandomValues) {
  throw new Error('Web Crypto is required; no weak RNG fallback');
}
const options = { count: 6, sep: '.', cap: true, digit: true, sym: true };
const result = buildPassword(list, options,
  () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]);
// Keep result in memory for immediate use. Do not log or transmit it.
```

The module rejection-samples bounded draws from independent uniform unsigned 32-bit values. Word selection is with replacement, so repeated words are allowed. count is 3 through 6; sep is '.', '-', '_' or empty; cap, digit and sym are required booleans. Never substitute Math.random, Python's random module, an LLM or a deterministic test RNG in production.

The returned password, words, capitalization index, digit/symbol values and positions are secret-bearing data. Keep them out of URLs, logs, telemetry, storage, HTTP requests and agent transcripts. Public examples are illustrations only and must never be reused as passwords.

## Strength and privacy limits

The displayed estimate credits recoverable independent word choices only, not extra decoration bits. An unknown estimate is not zero entropy: unique decoding has not been established for empty separators or a separator that occurs inside a word, such as English yo-yo with a hyphen separator. User-selected rerolls also invalidate the displayed numerical estimate. No precise cracking-time prediction or universal account-safety guarantee is made. Use unique passwords, a password manager and MFA; evaluate length and compatibility for the target service.

Browser-only privacy ends when a password is disclosed to an AI agent, chat provider, transcript, browser extension or compromised runtime. Normal page and wordlist requests may appear in server access logs, but generated values are not sent to DoPassGen. Local generation does not make downstream secret handling safe automatically.

## Licensing and responsible discovery

Read the per-list source and license fields and preserve applicable attribution, change notices and ShareAlike obligations when redistributing adapted data. Wordlist licenses do not establish a license for application code. Pending legal or linguistic review must not be described as completed; no upstream endorsement is implied.

The existing permissive crawler policy is unchanged. Search discovery, user-triggered browsing and potential training uses are distinct activities. The optional /llms.txt is a convenience, not an access-control policy or a guarantee of indexing, citations or ranking. Automated requests are measured separately from browser-like traffic; a fetch is not evidence of a human visitor or a generated password.


## Optional self-hosted usage counts

Anonymous public page views on this site are counted by self-hosted Umami analytics; the Umami tracker respects the Do Not Track signal. A page view records the page path, the referring page, the browser/operating-system type, screen size, browser language and the site hostname. No raw IP address is stored: a one-way hash of IP address and user agent groups views into a temporary session, and the identifier changes when storage is cleared. No passwords, entered words, clipboard contents or settings are ever sent as analytics. In addition, the published pages offer an optional consent checkbox that counts Generate clicks and successful copies through a stricter first-party endpoint; a successful-copy event records only that the clipboard API succeeded, not what was copied. That consented path sends only an allowlisted public page path, one fixed event and a random in-memory page identifier; the collector transforms it before storage and replaces client IP and browser/device information rather than forwarding them. The identifier changes on page load; it is not a cross-page visitor identity. The consent preference is stored locally and can be withdrawn; Do Not Track or Global Privacy Control disables the consented counts. Analytics events are removed after 30 days by a daily cleanup; existing infrastructure backups may have separate retention. Normal server access logs are separate. Session counts represent page lifetimes, not verified unique people. Local generation remains functional when analytics is blocked or unavailable.


## Wordlist registry

28 published wordlists. Exact download paths, entry counts, SHA-256 hashes,
sources, normalization, licenses and review status: https://dopassgen.com/wordlists/manifest.json —
validate bytes against the pinned digests before use.

## Published pages

- https://dopassgen.com/
- https://dopassgen.com/ca/
- https://dopassgen.com/cs/
- https://dopassgen.com/da/
- https://dopassgen.com/de/
- https://dopassgen.com/es/
- https://dopassgen.com/et/
- https://dopassgen.com/fi/
- https://dopassgen.com/fr/
- https://dopassgen.com/guides/choose-settings/
- https://dopassgen.com/guides/da-choose-settings/
- https://dopassgen.com/guides/da-privacy-and-recovery/
- https://dopassgen.com/guides/da-understand-estimates/
- https://dopassgen.com/guides/privacy-and-recovery/
- https://dopassgen.com/guides/understand-estimates/
- https://dopassgen.com/hr/
- https://dopassgen.com/hu/
- https://dopassgen.com/id/
- https://dopassgen.com/it/
- https://dopassgen.com/lt/
- https://dopassgen.com/lv/
- https://dopassgen.com/nl/
- https://dopassgen.com/no/
- https://dopassgen.com/pl/
- https://dopassgen.com/pt/
- https://dopassgen.com/ro/
- https://dopassgen.com/sk/
- https://dopassgen.com/sl/
- https://dopassgen.com/sq/
- https://dopassgen.com/sr/
- https://dopassgen.com/sv/
- https://dopassgen.com/tl/
- https://dopassgen.com/tr/
- https://dopassgen.com/vi/
- https://dopassgen.com/agents/
- https://dopassgen.com/agents/manifest.json
- https://dopassgen.com/wordlists/manifest.json
- https://dopassgen.com/llms-full.txt (single-file digest)
