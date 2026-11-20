# Wordlist Attribution and License Audit

This notice concerns DATA, not a license grant for DoPassGen's application code.
No application-code license is inferred from an upstream project's code license.
The manifest contains a per-list attribution string and license link. Preserve
these notices and modification descriptions with public redistributions. The
parent/owner must review and approve deployment/mirror licensing separately.

## English (en)

EFF Short Wordlist #1, Electronic Frontier Foundation; EFF identifies Joseph
Bonneau as its creator at https://www.eff.org/dice .

Source: https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt

License recorded: Creative Commons Attribution 4.0 International (CC BY 4.0),
https://creativecommons.org/licenses/by/4.0/ . Full legal text is preserved in
`licenses/CC-BY-4.0.txt`.

Authoritative basis: https://www.eff.org/copyright currently states that any and
all original EFF website material may be distributed under CC BY 4.0 unless
otherwise noted. This audit retrieved that policy and the exact source file.
The policy's CC image links to CC BY 3.0 US while its explicit prose grants
4.0; we record the prose's current grant, not an invented historical license.
The owner authorised release relying on the stated grant and these notices;
this is not a formal legal opinion.

Changes: removed dice-number column; retained all 1296 words and their order;
LF separators, no terminal LF. The registered file exactly matches the upstream
word sequence, including `yo-yo`. EFF does not endorse this application.
Historical import revision and historical license choice are not recorded.

## Danish and the other 26 non-English lists

Applies to: da, es, fr, de, pt, it, id, pl, nl, tr, sv, ro, hu, cs, fi, vi,
tl, ca, sk, hr, sl, no, sr, sq, lt, lv, et. Exact source URLs and attribution
are recorded per entry. The 22 original lists were historical imports;
no, sr, sq, lt, lv and et were first registered directly from the 2016 corpus
at the audited revision below.

FrequencyWords, Hermit Dave: https://github.com/hermitdave/FrequencyWords .
The upstream README explicitly distinguishes **MIT for code** from
**CC-by-sa-4.0 for content**. Do not apply the repository's GitHub MIT badge to
the wordlist data. The exact README snapshot is
`FrequencyWords-README.upstream.md`, retrieved at audited revision
`525f9b560de45753a5ea01069454e72e9aa541c6` (not the unknown import revision).

License recorded: Creative Commons Attribution-ShareAlike 4.0 International
(CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/ . Full legal
text is preserved in `licenses/CC-BY-SA-4.0.txt`. Redistributed adaptations
must meet its attribution, change-notice and ShareAlike requirements. The
registered curated non-English data are identified as CC BY-SA 4.0, not MIT.

Changes: removed frequency counts; retained the first 1296 unique tokens
matching lowercase `[a-z]{3,6}`, in upstream frequency order; excluded
non-ASCII tokens, without transliteration. This process reproduces every
non-English local list exactly from the 2016 corpus at the audited revision.
Serbian (`sr`) tokens are Latin-script; Cyrillic-script tokens were excluded
by the same ASCII-only filter.

Upstream identifies its 2016 source as OpenSubtitles2016:
http://opus.lingfil.uu.se/OpenSubtitles2016.php . That is a provenance statement,
not independent clearance of subtitle/corpus rights. The owner authorised
redistribution relying on the stated upstream content licence with this
uncertainty disclosed. The audit does not invent additional corpus licences.
No upstream endorsement is implied.

## Evidence and unresolved gates

`license-evidence.json` records authoritative URLs, retrieval times, license
text hashes and quoted upstream statements. `upstream-audit.json` records raw
upstream hashes, corpus alternatives and exact-token equivalence checks.
All `source.revision` fields remain null because the historical import checkout
is unknown. No license or provenance has been marked human-approved.

The English `yo-yo` normalization conflict was resolved by parent integration:
only that exact upstream English token is exempted from the letters-only rule;
it remains distinct from `yoyo`, and ambiguous hyphen-separated output receives
no entropy estimate. Human legal review of attribution/ShareAlike and the
OpenSubtitles chain, fluent linguistic review of every list, and a separate
application-code license decision before a public mirror remain pending.
Formal legal and fluent linguistic review remain uncompleted, not mandatory
claims of this release. The owner authorised publication with that limitation.
Public builds must ship this notice and the complete license texts.
