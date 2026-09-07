---
'@refrakt-md/media': minor
'@refrakt-md/places': minor
---

Correct missing section roles on playlist and itinerary-stop (SPEC-125 Phase 1)

**`playlist`** gains a `body` role. Its `layout` places `tracks` and `body` as separate slots, and the `body` slot holds the prose an author writes *after* the track list — so it is both structurally the body and genuinely prose-bearing. `reading` and `dropcap` now land on it. The track list stays unroled: it is structured content the rune reinterprets, and mapping it to `body` would invent the `datatable`-shaped overload SPEC-125 Direction 2 exists to avoid.

**`itinerary-stop`** gains a `body` role on each stop's note — authored prose, and the stop's only content region.

**`itinerary-day` deliberately gains no header-ish role.** Its parent `itinerary` already holds `title` on its headline, and `prominence` scales *the* header of a page-section family rune, so a second title in the same subtree would flatten the hierarchy the axis exists to scale. The contract keeps recording `prominence` as unavailable on the day, which is the accurate answer.

**Rendered output changes**: `playlist` and `itinerary-stop` now emit `data-section="body"` on those slots. Checked in a browser against the real stylesheet — every element's computed style and box geometry is unchanged. `.rf-itinerary-stop__body` already sets its own `font-size`, `line-height` and `color`, so the shared `[data-section="body"]` rules are outranked there; on `playlist` they apply but are already the values inherited from `html`. A theme with its own `[data-section]` rules may see a change on these two runes.
