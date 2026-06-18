---
"@refrakt-md/lumina": patch
---

`codegroup` chrome now derives from the code surface instead of the page chrome. The wrapper fill, topbar, tabs, their text, and the internal separators are now derived from `--rf-color-code-bg` / `--rf-color-code-text` (the tokens a syntax preset owns) via `color-mix`, with only the outer frame (border + shadow) staying in the page world. Previously the topbar/tabs used `--rf-color-surface`, so when the active preset gave the code surface a palette that diverged from the page — e.g. Nord's Polar Night code surface on an otherwise-neutral site — the light card chrome clashed with the dark code body. The component is now internally coherent with its own code body in both light and dark modes, matching `diff` (whose body already fills from `--rf-color-code-bg`).
