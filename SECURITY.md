# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities responsibly — do not open a public issue
for anything exploitable.

- Email: `ron@horfarterhornbech.dk` (monitored mailbox)
- Security policy and contact are also published at
  https://dopassgen.com/.well-known/security.txt

You will receive an acknowledgement within 5 business days. We ask for a
coordinated disclosure window of 90 days.

## What DoPassGen guarantees

- Passwords are generated **locally** with Web Crypto rejection sampling; no
  password, word index or entropy state is transmitted to any server.
- Wordlists are integrity-checked by SHA-256 **before use**; the generator
  refuses to run on a mismatch.
- The entropy figure shown to users counts only provably recoverable word-choice
  entropy; ambiguous constructions are displayed as "unknown".
- There is no weak-RNG fallback: a missing CSPRNG fails closed.

## What DoPassGen does NOT claim

- No protection against a compromised rendering environment (a malicious
  extension or XSS on a *different* origin can observe the generated value).
- No guarantee of passphrase *memorability* beyond word-based structure.
- The MCP example in this repository is an integration reference, not a
  distributed product; its local file lifecycle defends against accidental
  drift and casual exposure, not against an attacker with write access to the
  same user account.

## Supported versions

| Version | Supported |
|---|---|
| 1.9.x   | yes |
| < 1.9   | no |

## Verification

Reproduce the security claims yourself:

```bash
python3 scripts/verify_wordlists.py
node --test tests/
python3 -m unittest discover -s tests
```

CI runs the same checks on every push.
