"""Decodability invariants (CR-02): wordlist x separator unique decodability.

The site's entropy display shows 'unknown' where decoding is not established.
This test locks the analysis invariants that make that display honest:
- '.', '_' and '-' are unambiguous EXCEPT where a separator character occurs
  inside a word (English yo-yo with '-' is the documented exception);
- with the empty separator, the word set is a variable-length code — its
  Sardinas-Patterson status must match the committed analysis report.
"""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys_path = str(ROOT / "scripts")
import sys  # noqa: E402
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)
from analyze_decodability import sardinas_patterson  # noqa: E402

MANIFEST = json.loads((ROOT / "wordlists/manifest.json").read_text())


def words(lang):
    entry = next(e for e in MANIFEST["lists"] if e["lang"] == lang)
    return (ROOT / entry["public_path"].lstrip("/")).read_text().rstrip("\n").split("\n")


class DecodabilityTests(unittest.TestCase):
    def test_dot_and_underscore_unambiguous_for_all_lists(self):
        for entry in MANIFEST["lists"]:
            ws = words(entry["lang"])
            for sep in (".", "_"):
                self.assertEqual([w for w in ws if sep in w], [],
                                 f"{entry['lang']}: '{sep}' occurs inside words — "
                                 "passwords with this separator are no longer uniquely decodable")

    def test_hyphenated_words_exactly_the_documented_yo_yo_exception(self):
        # Locks the wordlist invariant behind the site's conservative '-' display:
        # only en contains a hyphenated word (yo-yo). Note: the plain
        # concatenation code for en is uniquely decodable (SP below), which
        # implies hyphen-separated en passwords also decode uniquely — the
        # site's entropy-unknown display for en+'-' is conservative, not a
        # proven collision. The wordlist invariant must not change silently.
        for entry in MANIFEST["lists"]:
            ws = words(entry["lang"])
            hyphenated = sorted({w for w in ws if "-" in w})
            if entry["lang"] == "en":
                self.assertEqual(hyphenated, ["yo-yo"])
            else:
                self.assertEqual(hyphenated, [],
                                 f"{entry['lang']}: unexpected hyphenated words")
                # No word contains '-' here, so every '-' in the password is a
                # separator by construction — decoding is trivially unique and
                # needs no Sardinas-Patterson argument.

    def test_committed_analysis_report_matches_recomputation(self):
        report = json.loads((ROOT / "docs/decodability-analysis.json").read_text())
        self.assertEqual(len(report), len(MANIFEST["lists"]))
        for row in report:
            ws = words(row["lang"])
            for sep_key in (".", "-", "_", "none"):
                committed = row["separators"][sep_key]
                if sep_key == "none":
                    ud, _ = sardinas_patterson(ws)
                else:
                    ud = not any(sep_key in w for w in ws)
                self.assertEqual(committed["uniquely_decodable"], ud,
                                 f"{row['lang']}/{sep_key}: report drifted from recomputation")


if __name__ == "__main__":
    unittest.main()
