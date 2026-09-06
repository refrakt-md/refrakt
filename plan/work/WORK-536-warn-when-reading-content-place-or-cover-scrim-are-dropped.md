{% work id="WORK-536" status="ready" priority="medium" complexity="simple" source="SPEC-125" tags="transform,facets,diagnostics,dx" milestone="v0.32.0" %}

# Warn when reading, content-place or cover scrim are dropped

Of the seven gated universal axes, four report when they are dropped and three
say nothing:

| Axis | On an inapplicable rune |
|---|---|
| `prominence` | warns |
| `dropcap` | warns |
| `frame*` | warns |
| `substrate-target="media"` | warns |
| `reading` | **silent** |
| `content-place` | **silent** |
| cover `scrim*` | **silent** |

The three silent ones are silent for different reasons, and only one is a plain
omission:

- **`reading`** — the facet always resolves and publishes the register as state;
  the value simply never lands, because `applyBemClasses` only stamps
  `data-reading` on an element whose section role is `body`. No code path knows
  the request was dropped.
- **`content-place` and cover `scrim*`** — gated by `appliesTo` returning false,
  so the facet never runs and never gets the chance to warn. (`content-place`
  *does* warn when the rune has the modifier but is not in cover mode; it cannot
  warn when the rune declares no `media-position` modifier at all.)

## Why this is still needed after schema narrowing

{% ref "WORK-534" /%} catches *authored* attributes at validation time. It does
not catch values arriving another way — scoped defaults and embed overrides
({% ref "ADR-027" /%}) apply attribute bags to runes that never spelled them out,
and those still need a runtime diagnostic.

## Acceptance Criteria

- [ ] `reading` warns when the resolved register would apply but the rune has no
      body section to carry it
- [ ] `content-place` warns when set on a rune that declares no `content-place`
      modifier
- [ ] cover `scrim*` warns when set on a rune that cannot enter cover mode
- [ ] Messages match the shape and tone of the four existing warnings
- [ ] Each goes through the `WarningCollector` with a `dedupeKey`, so it reports
      once per build rather than once per rune instance
- [ ] Each is asserted as returned `FacetWarning` data in the facet unit tests,
      not only through a `console.warn` spy
- [ ] The default cases stay silent: an unmarked rune with no `reading` set must
      not warn
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

Independent of {% ref "WORK-534" /%} — it can land before or after, and does not
block it. Grouped into {% ref "v0.32.0" /%} because it completes the same "no
silent no-ops" goal.

The `appliesTo`-gated pair needs care: warning from inside a facet that
deliberately does not run means either relaxing `appliesTo` and returning a
warning-only result (the shape `prominence` already uses), or a check outside the
facet. Prefer the former — it keeps the diagnostic with the axis that owns it.

## References

- {% ref "SPEC-125" /%} — Phase 3
- {% ref "SPEC-124" /%} — the facet warning collector
- {% ref "ADR-027" /%} — scoped attribute bags, the non-authored input path

{% /work %}
