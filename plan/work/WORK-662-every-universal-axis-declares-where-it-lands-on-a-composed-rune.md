{% work id="WORK-662" status="done" priority="high" complexity="moderate" source="SPEC-145" tags="runes, composition, universals, transform, facets" milestone="v0.44.0" pr="refrakt-md/refrakt#732" %}

# Every universal axis declares where it lands on a composed rune

{% ref "WORK-661" /%} places D14's eight attributes. The registry has twelve axes, and
`prominence`, `reading`, `dropcap`, `frame`, `bg` and `stagger` have no placement: on a composed
root they are dropped with a warning, do nothing, or paint the empty wrapper. `scrim` is placed
wrongly, on the media slot's owner, when the registry files it under `bg` ({% ref "SPEC-145" /%}
D33).

## Acceptance Criteria

- [x] `UniversalAxisFacet` carries a placement (`root`, `carrier`, or a role: `header`, `prose-body`, `media`), every registered axis declares one, and a test fails on an axis with none
- [x] The paint group of WORK-661 is read from the placements rather than a list in the composition code
- [x] An axis is placed whole: every attribute it owns in `AXIS_ATTRIBUTES` lands on the same rune, `tint`'s D14 split aside
- [x] `prominence` lands on the placed rune owning a header role, `reading` and `dropcap` on the one declaring `prose` and owning `body`, and `frame` on the one owning media or naming a `frameTarget`; the carrier wins when it owns the role
- [x] A `prominence` on a composition placing one `section` scales its title exactly as on a `section` written directly
- [x] A composed rune offers a role-bound axis only when an owner resolves: `reference` omits it otherwise and `inspect` and `contracts` give the reason
- [x] `scrim` lands with `bg` on the carrier; a composition with a background, a scrim and no media is accepted, and a cover-mode rune that is not the carrier draws a warning naming both
- [x] Contracts are regenerated on both copies; composed entries' universal availability changes and every change is explained

## Blocked by

- {% ref "WORK-661" /%}

## References

- {% ref "SPEC-145" /%}: D33.
- {% ref "SPEC-125" /%}: schema narrowing, which applicability feeds.
- WORK-536: why `scrim` belongs to `bg`.

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/transform/src/facets/describe.ts`: `AxisPlacement` and `UniversalAxisFacet.placement`; every axis declares one (`facets/*.ts`). A registry test fails on an axis without one.
- `composition-placement.ts`: role-bound axes go to the carrier when it takes the axis, else the single template-placed rune that does. A rune "takes" an axis when its narrowed schema declares the axis's attribute, which looks through nested compositions. Runes register as placeable by name (core at entry, a plugin's native runes before its compositions, each composed rune once built).
- `lib/index.ts`: a composition's universal attributes are narrowed by placement; an axis no placed rune takes falls back to the root's own structural gate.
- `scrim` follows `bg` to the carrier; validate warns `composition-scrim-cover` naming both runes when a non-carrier rune is in cover mode.
- `contracts`: `composition.placements` per axis, and placement settles `universalAxes.unavailable`. `inspect` prints where every axis lands.
- Tests in `composition-carrier.test.ts`; `composed-bond` and `composed-realm-faction` now expect `prominence` / `frame-*` offered through the placed rune.

### Notes
- Contracts regenerate unchanged on both copies: no shipped rune is composed yet. The composed entries' change is pinned by a contract test instead.
- A composition can only resolve owners among runes registered before it is built.

{% /work %}
