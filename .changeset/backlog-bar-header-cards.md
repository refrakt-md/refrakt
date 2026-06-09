---
"@refrakt-md/runes": minor
"@refrakt-md/plan": minor
---

Modernize `backlog` to compose over the `bar` rune (SPEC-084 / WORK-342). Its
default item is now a `card` whose top strip is a `bar` — the identifier on the
left, a sentiment-coloured status `badge` on the right, title below — built from a
**universal projection** that works for every plan type. New `layout` attribute
(`cards` default · `list` · `table`) is forwarded to `collection`. A type chip
appears only for a mixed set; a single-type backlog also surfaces that type's key
field (work→priority, bug→severity). The `$item` projection gains `identifier`
(`id || name`, so milestones slot in), `sentiment`, and `mixed`, shared by every
collection/aggregate rollup.
