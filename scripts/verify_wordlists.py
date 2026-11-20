#!/usr/bin/env python3
"""Verify every published wordlist against its pinned SHA-256.

This is the same check the browser performs before generating, and the same
check CI runs. Exit 0 = all lists intact; exit 1 = any mismatch/missing file.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    manifest = json.loads((ROOT / "wordlists/manifest.json").read_text())
    failures = 0
    for entry in manifest["lists"]:
        rel = entry["public_path"].lstrip("/")
        path = ROOT / rel
        if not path.exists():
            print(f"MISSING {rel}")
            failures += 1
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != entry["sha256"]:
            print(f"MISMATCH {rel}\n  expected {entry['sha256']}\n  actual   {actual}")
            failures += 1
        else:
            print(f"ok {entry['lang']:3} {entry['count']:4} words  {entry['sha256'][:12]}…")
    total = len(manifest["lists"])
    print(f"\n{total - failures}/{total} wordlists verified")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
