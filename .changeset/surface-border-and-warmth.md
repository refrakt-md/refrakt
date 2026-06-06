---
"@refrakt-md/lumina": patch
---

Surface containers (card, the card/inset surface groups, feature items, bento
cells) now carry a subtle 1px border in addition to their surface fill, pairing
with the inset media framing.

The dark neutral surface family was browner than the rest of the palette: the
page background and inline-code background are warm-grays (R=G) but `surface`,
its hover/active/raised steps, `border`, and `code-bg` carried a red lift
(R>G ≈ 36° hue). That red lift is removed so the whole dark neutral ladder shares
one warm-gray character (kept warm via a blue deficit, just no longer brown), and
`code-bg` / `--rf-syntax-background` follow it.
