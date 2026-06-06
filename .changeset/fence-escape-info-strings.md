---
"@refrakt-md/runes": patch
---

Fix `escapeFenceTags` desyncing on code fences with info strings. A
titled/attributed fence (e.g. ` ```yaml title="config.ts" `) was not
recognised as a fence opener, so fence tracking lost sync and `{% %}` tags
following the fence were wrongly escaped — corrupting document structure
(for instance a `{% /codegroup %}` after a titled fence leaking as literal
text). The opener now matches the full info string.
