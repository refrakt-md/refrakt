---
'@refrakt-md/runes': minor
'@refrakt-md/marketing': minor
'@refrakt-md/lumina': minor
---

Correct missing section roles on card, bento-cell and accordion-item (SPEC-125 Phase 1)

Three runes declared a slot in their layout that their `sections` map never mapped to a role. Because `data-section` is what `reading`, `dropcap` and `prominence` gate on, the omission silently dropped those attributes — `{% card reading="prose" %}` did nothing at all, with no warning.

- **`card`** gains a `body` role on its body slot. Its content model is literally "body (optional, repeatable any block)", so this is the clearest case of the three — and the one that surfaced the whole problem. `reading` and `dropcap` now land.
- **`bento-cell`** gains both a `body` role and a `title` role; its title is a sibling slot of its body. `reading`, `dropcap` and `prominence` now land.
- **`accordion-item`** gains a `body` role on its answer panel, so `reading` and `dropcap` now land there too. It deliberately declares **no** header-ish role: the `header` slot is the `<summary>` disclosure control, not a page-section header.

`card` deliberately keeps no `title` role — its leading heading is nested *inside* the body slot rather than beside it, so a title role would nest one section inside another and resize every card heading.

**Rendered output changes**, though under Lumina nothing moves. The three runes now emit `data-section` on those slots. Checked in a browser against the real stylesheet: `[data-section="body"]`'s declarations (`line-height: relaxed`, `color: text`) are already the inherited values, and `[data-section="title"]`'s type is outranked by `.rf-bento-cell__title`, so every element's computed style and box size is byte-identical at every density. A theme with its own `[data-section]` rules may see a change on these three runes; that is the intended, visible half of the correction.

Lumina additionally fixes a case this exposed: at `density="minimal"` the blanket `[data-section="body"] { display: none }` would have hidden a card's title along with its prose, because card nests the title in its body. Minimal density now keeps a body-nested title and hides only the body's other children — so `{% card density="minimal" %}` shows title-only rather than an empty surface. Previously it did nothing at all.

`prominence` is now declarable on `bento-cell` but has no visible effect under Lumina, which pins `.rf-bento-cell__title`'s font size rather than letting it ride `--rf-title-size`. That is a skin gap, not a config one.
