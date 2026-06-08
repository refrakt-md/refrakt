{% work id="WORK-356" status="in-progress" priority="medium" complexity="moderate" source="ADR-013" tags="bento, authoring, marketing, sugar" %}

# Bento `levels` — heading→footprint ladder

Implement the author-defined `levels` ladder for `bento`'s heading-sugar path, per
{% ref "ADR-013" /%}. One attribute replaces the need for the removed `sizing`/`span`
mode: a user who wants the old uniform-width grid writes `levels="6,5,4,3,2,1"`.

Queued deliberately — the design is settled in {% ref "ADR-013" /%}; left to
marinate before implementation.

## Behavior (from ADR-013)

- New `levels` attribute on `bento`, **heading-sugar path only**.
- **Omitted →** current tiered behavior (proportional `large/medium/small`),
  unchanged and columns-safe.
- **Provided →** comma-separated ladder, indexed by **relative** heading depth
  (0 = shallowest, auto-detected base):
  - `W` (bare integer) → `cols=W, rows=1`
  - `WxH` → `cols=W, rows=H`
- Rungs are **absolute** against the declared `columns`; no proportional entries.
- Ladders shorter than the deepest heading **clamp** to the last rung.
- Explicit `{% bento-cell %}` grids **ignore** `levels`.
- Composes with existing `columns`, `row-height`, and `content-height`.

## Approach (sketch — finalize on pickup)

- Add `levels` to the `bento` schema attributes in
  `plugins/marketing/src/tags/bento.ts` (freeform string; validate the ladder in
  the transform, warn on malformed rungs rather than via Markdoc `matches`).
- In `convertHeadings`, when `levels` is set, parse it once into a
  `{ cols, rows }[]`, then for each converted heading assign
  `cols`/`rows` from `ladder[min(relativeDepth, ladder.length − 1)]`,
  short-circuiting the `tieredSize` preset path. Default path untouched.
- No engine/config change expected (cells already carry `cols`/`rows`); confirm
  via `refrakt inspect bento` and regenerate `contracts/structures.json` only if
  the output surface actually changes.
- No new Lumina CSS — cells already render `cols`/`rows` spans.

## Acceptance Criteria

- [x] `bento` accepts a `levels` attribute; omitting it leaves tiered behavior byte-for-byte unchanged.
- [x] `levels="6,5,4,3,2,1"` reproduces the removed span mode (uniform height, width by heading depth) at `columns=6`.
- [x] Bare-integer rungs map to `cols=W, rows=1`; `WxH` rungs map to `cols=W, rows=H`.
- [x] Rungs are indexed by relative heading depth from the auto-detected base; depths beyond the ladder clamp to the last rung.
- [x] Explicit `{% bento-cell %}` grids ignore `levels`.
- [x] Malformed `levels` entries produce a clear authoring warning, not a crash.
- [x] `levels` composes correctly with `columns`, `row-height`, and `content-height`.
- [x] Marketing tests cover: width-only ladder, `WxH` ladder, clamping, and the omitted-default-unchanged case.
- [ ] Bento authoring docs document `levels`, with the `levels="6,5,4,3,2,1"` uniform-width recipe called out.

## Context

- Supersedes any revival of `sizing="span"` — see {% ref "ADR-013" /%} for the
  full rationale and rejected alternatives (faithful formula, proportional
  `tiers` ladder, proportional entries in `levels`).
- Related: {% ref "WORK-354" /%} (responsive per-cell spans) and the bento
  collapse model — orthogonal; `levels` governs initial sizing, not breakpoints.

{% /work %}
