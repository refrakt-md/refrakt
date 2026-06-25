{% work id="WORK-467" status="done" priority="high" complexity="moderate" source="SPEC-099" milestone="v0.26.0" tags="feature,layout,marketing,runes,transform" %}

# Feature `layout` axis + transform-level default resolution

Give `feature` an honest `layout` axis (`grid | list`) drawn from the canonical const, with
the media-position-derived default resolved in the transform so the author override and the
default never collide. Per {% ref "SPEC-099" /%} §1 + §4.

## Scope

- Add a `layout` attribute to `feature` (`plugins/marketing/src/tags/feature.ts`), matching
  `grid | list` imported from the canonical const ({% ref "WORK-466" /%}) — no bespoke
  `columns` value.
- **Resolve the default in the transform**, not via a config variant: compute
  `effectiveLayout = attrs.layout ?? derive(mediaPosition)` (stacked top/bottom → `grid`,
  beside start/end → `list`) and emit it as a single `layout` meta. Author override beats the
  derived default; exactly one `data-layout` lands on the element.
- `layout` is **always emitted** (both `grid` and `list` are styled) — no default-suppression
  guard (unlike `width`).
- This item only introduces the axis + emission; retiring the old `media-position` coupling and
  moving the CSS onto `[data-layout]` is a separate, dependent work item.

## Acceptance Criteria

- [x] `feature` accepts `layout` matching `grid | list`, both imported from the canonical const.
- [x] The engine emits a single `data-layout` from the resolved `layout` meta.
- [x] When `layout` is unset it derives from `media-position` (stacked → `grid`, beside → `list`); an explicit `layout` overrides that default.
- [x] Item arrangement and media placement are independently controllable (media beside content *and* `layout="grid"` is reachable).

## Dependencies

- {% ref "WORK-466" /%} — imports `grid`/`list` from the canonical const.

## References

- Spec: {% ref "SPEC-099" /%} §1 (`layout` axis), §4 (transform-level default resolution).
- `plugins/marketing/src/tags/feature.ts`, `packages/runes/src/tags/common.ts` (`SplitLayoutModel`, `buildLayoutMetas`).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-099-feature-layout-axis`

### What was done
- `plugins/marketing/src/tags/feature.ts` — added the `layout` attribute (grid|list via `layoutMatches([LAYOUT.grid, LAYOUT.list])`); resolve `effectiveLayout = attrs.layout ?? derive(media-position)` (stacked→grid, beside→list) in the transform and emit a single always-present `layout` meta.
- `plugins/marketing/src/config.ts` — `layout` modifier (`source: 'meta', noBemClass: true`) so the meta maps to `data-layout`.
- `plugins/marketing/test/feature.test.ts` — 4 tests: default grid, media-derived list, explicit override (both directions), always-present.

### Notes
- Author override and the media-derived default never collide because exactly one value is computed in the transform. Output unchanged for existing content; the CSS move + coupling removal is WORK-468.

{% /work %}
