---
"@refrakt-md/runes": minor
"@refrakt-md/content": minor
"@refrakt-md/plan": patch
---

Per-group sentiment projection in `aggregate` (SPEC-076 / WORK-357). `aggregate`
now projects `$item.sentiment` onto the per-group template (and tags chart data
cells with `data-meta-sentiment`), looked up from a `(type → field → value →
sentiment)` map threaded through `embedConfig`. The map is derived automatically
from each rune's existing `metaFields.*.sentimentMap` (keyed by entity type) — no
new registration. This lights up the deferred colour from WORK-296/353: plan
status badges and roadmap charts now read green-done / red-blocked with no
per-call config. `plan-progress` badges colour via `sentiment=$item.sentiment`.
