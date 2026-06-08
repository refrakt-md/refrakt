---
"@refrakt-md/lumina": patch
---

Fix dark surface staying brown in a scoped scheme override (e.g. a preview rune
toggled to dark, or a sandbox). `tint.css` re-declares the palette under
`[data-color-scheme="dark"]` — a hand-kept third copy that the token coverage
test didn't reach — and it still held the pre-de-brown surface/border/code
values. Synced it to the neutralized palette, and added a coverage test that
checks every `--rf-*` key tint.css's `[data-color-scheme]` overrides share with
the canonical token CSS, so this copy can't silently drift again.
