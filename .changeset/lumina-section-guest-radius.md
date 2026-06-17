---
"@refrakt-md/lumina": patch
---

Don't round rune media guests in bare section hosts. In `hero` and `feature` — page sections with no framed media well — the section's rounded media clip was masking the corners of rich guests like `sandbox`, `codegroup`, and `juxtapose`. Those now keep their own edges, while image/video guests keep the rounded media tier. Framed hosts (`card`, `bento-cell`) are unchanged: they still merge a guest into their well so it reads as one surface.
