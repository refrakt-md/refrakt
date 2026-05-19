---
"@refrakt-md/runes": minor
"@refrakt-md/lumina": minor
"@refrakt-md/highlight": minor
---

Diff + compare restyle and `theme.code.colorScheme` cascade fix:

- **Single full-width header replaces per-panel labels in `{% diff %}`.** The "Before" / "After" labels above each split column were redundant once the columns are tinted red/green. Both modes now render an optional, neutral-coloured full-width header sourced from a new `title` attribute (typically a filename or context line); when `title` is omitted, no header is rendered at all.
- **New `title` attribute on `{% compare %}`.** Sits above the panels alongside the existing per-panel `labels` (those stay — they identify alternatives, not direction).
- **Diff line markers sit flush at the panel edge.** Added / removed lines now carry a 3px coloured left border (`var(--rf-color-danger)` / `var(--rf-color-success)`) flush with the panel edge instead of an inset, plus a slightly stronger background tint via `color-mix`. Equal and empty lines are both transparent — the previous gray wash on empty placeholders was causing the two split columns to look like they had different background shades.
- **`theme.code.colorScheme` now cascades through diff and compare wrappers.** The highlight walk previously stamped `data-color-scheme` only on `<pre data-language>`, so the diff's outer `<pre data-name="code">` (which has no `data-language` — only its inner line-content spans do) never received the attribute and the override silently no-op'd on diffs. The walk now also stamps the attribute on any `data-rune` wrapper that hosts a highlighted descendant, which generically covers diff, compare, codegroup, and any future code-bearing rune without per-rune knowledge in the transform.
