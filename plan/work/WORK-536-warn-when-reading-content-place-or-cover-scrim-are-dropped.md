{% work id="WORK-536" status="done" priority="medium" complexity="simple" source="SPEC-125" tags="transform,facets,diagnostics,dx" milestone="v0.32.0" pr="refrakt-md/refrakt#594" %}

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

> **Correction (during implementation).** The third row's premise is wrong — see
> *The cover-scrim row was mis-stated* below. `scrim*` on a rune that cannot
> enter cover mode is not dropped at all; it works, via the background layer.
> The real silent drop in that family runs the other way: `scrim-strength`
> **in** cover mode. That is what the third criterion now covers.

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

- [x] `reading` warns when the resolved register would apply but the rune has no
      body section to carry it
- [x] `content-place` warns when set on a rune that declares no `content-place`
      modifier
- [x] `scrim-strength` warns when set on a rune **in** cover mode, where the
      media well cannot honour it — and is consumed either way, so it stops
      leaking its raw `<meta>` tag into the rendered tree
- [x] Messages match the shape and tone of the four existing warnings
- [x] Each goes through the `WarningCollector` with a `dedupeKey`, so it reports
      once per build rather than once per rune instance
- [x] Each is asserted as returned `FacetWarning` data in the facet unit tests,
      not only through a `console.warn` spy
- [x] The default cases stay silent: an unmarked rune with no `reading` set must
      not warn
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## The cover-scrim row was mis-stated

The premise "cover `scrim*` is dropped on a rune that cannot enter cover mode"
does not hold. `scrim`, `scrim-type`, `scrim-strength`, `scrim-blur` and
`scrim-tone` are read by the **background layer** (`bgAxis.contract.inputs`
lists all five), which raises itself on any rune a scrim is set on. Verified
against the engine: a rune config of `{ block: 'grid' }` — no sections, no
media slots, no `media-position` modifier — plus `scrim="bottom"` produces a
full `rf-grid__scrim` overlay with `data-scrim-dir` and `--scrim-strength`. Cover
mode does not *enable* the scrim; it **reroutes** it to the media well.

Two consequences:

1. **{% ref "WORK-534" /%} over-narrowed.** Filing `scrim*` under the `cover`
   axis — which *is* gated on a declared `media-position` modifier — removed a
   working attribute from **82 of 83 runes**. Only `card` kept it. Fixed here by
   moving the family to the `bg` axis, where the facet that implements it lives;
   `cover` now owns no author-facing attribute, like `density` and
   `content-place`, and is still reported per rune.
2. **The real drop is the reverse.** `scrim-strength` is the one scrim facet
   cover mode cannot honour — cover's `SCRIM_META` omits it, so in cover mode it
   is neither applied nor consumed, and the unconsumed `<meta>` survives into
   the rendered tree.

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

## Resolution

Completed: 2026-09-09

Branch: `claude/milestone-v0-31-0-e5ihxr`
PR: refrakt-md/refrakt#594

### What was done

The three gated universal axes that dropped a request in silence now report it.

- **`packages/transform/src/facets/reading.ts`** — `reading-without-body`. The
  facet always resolved and published the register as state; the value only
  became `data-reading` once child assembly found a `body`-role element, so on a
  body-less rune it vanished with nothing aware it had been asked for. Warns only
  on an explicit, *valid* `reading=`: every unmarked block resolves to the `ui`
  default, and a typo falls through the cascade for Markdoc to reject.
  `hasBodySection` was hoisted above the facet — it already existed for the
  contract descriptor at the bottom of the same file.
- **`packages/transform/src/facets/content-place.ts`** — `content-place-undeclared`.
  `appliesTo` now also fires on the bare attribute, so the facet runs purely to
  warn on a rune whose config declares no `content-place` modifier. The existing
  `content-place-outside-cover` warning is untouched and stays distinguishable by
  code.
- **`packages/transform/src/facets/cover.ts`** — `scrim-strength-in-cover`, plus
  `consumes`. Silent when `scrim="none"` (the author already said no scrim), and
  consumed either way so the meta stops leaking.

### The third case was not what the item described

The item's premise — "cover `scrim*` is dropped on a rune that cannot enter cover
mode" — does not hold, and I checked before implementing it. `scrim*` is read by
the **background layer**, which raises itself on any rune: a bare
`{ block: 'grid' }` config plus `scrim="bottom"` produces a full `rf-grid__scrim`
overlay with `data-scrim-dir` and `--scrim-strength`. Cover mode does not enable
the scrim, it **reroutes** it to the media well.

Two consequences, both handled here (with the user's agreement to substitute the
real defect rather than close the criterion as invalid):

1. **WORK-534 over-narrowed, and this fixes it.** Filing `scrim*` under the
   `cover` axis — which *is* gated on a declared `media-position` modifier —
   removed a working attribute from **82 of 83 runes**; only `card` kept it.
   `{% textblock scrim="bottom" %}` had become a validation error for markup the
   engine honours. The family moved to the `bg` axis, where the facet that
   implements it lives. `cover` now owns no author-facing attribute — like
   `density` and `content-place` — and is still reported per rune.
2. **The genuine silent drop runs the other way**: `scrim-strength` is the one
   scrim facet cover mode cannot honour (cover's `SCRIM_META` omits it), so it
   was neither applied nor consumed, and the raw `<meta>` survived into the
   rendered tree. That is now the third criterion.

The work item body records the correction and the evidence; the criterion text
was rewritten rather than ticked off as-written.

### Tests

`packages/transform/test/facets/dropped-axes.test.ts` (13) — each warning
asserted as returned `FacetWarning` data (code, message, `dedupeKey`), never
through a console spy: the driver owns emission, so a console test would be
testing the driver. Covers the silent cases too — no request, a non-register
value, a rune that *has* a body, `scrim="none"` — since a diagnostic that fires
on the default case trains readers to ignore the channel.

Two of my own assertions from WORK-534/535 encoded the over-narrowing and had to
be corrected: `reference-universals.test.ts` listed `scrim-tone` among grid's
absent attributes, and the language-server completion test asserted `scrim` was
*not* offered on `grid`. Both now assert the opposite, with the reason.

### Notes

- **Schema narrowing does not make these redundant.** WORK-534 catches authored
  attributes at validation time; scoped defaults and embed overrides (ADR-027)
  apply attribute bags to runes that never spelled the attribute out, and those
  never pass through Markdoc validation.
- **Pre-existing inconsistency, not fixed here:** the two older warnings
  `prominence-unsupported` and `dropcap-off-register` carry no `dedupeKey`, so
  they still report once per rune *instance* rather than once per build. The
  criterion covers the three new ones, which all dedupe; aligning the older pair
  is a small follow-up worth doing separately since it changes existing output.

{% /work %}
