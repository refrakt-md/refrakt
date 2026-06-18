---
"@refrakt-md/lumina": patch
---

`codegroup` and `diff` chrome now derives from the code surface instead of the page chrome. For both runes the wrapper fill, header/topbar, tabs, their text, and the internal separators are now derived from `--rf-color-code-bg` / `--rf-color-code-text` (the tokens a syntax preset owns) via `color-mix`, with only the outer frame (border + shadow) staying in the page world. Previously `codegroup`'s topbar/tabs and `diff`'s header used `--rf-color-surface`, so when the active preset gave the code surface a palette that diverged from the page — e.g. Nord's Polar Night code surface on an otherwise-neutral site — the light card chrome clashed with the dark code body. Both runes are now internally coherent with their own code body in light and dark modes.
