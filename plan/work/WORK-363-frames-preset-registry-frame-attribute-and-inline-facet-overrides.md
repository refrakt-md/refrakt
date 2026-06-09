{% work id="WORK-363" status="done" priority="high" complexity="complex" source="SPEC-086" tags="chrome, runes, engine, lumina" milestone="v0.20.0" %}

# frames preset registry + frame attribute and inline facet overrides

Add a `frames` preset registry parallel to `backgrounds`, the `frame` attribute with inline facet overrides, and complete the `offset` named scale.

## Acceptance Criteria
- [x] A `frames` registry exists in theme config, structurally parallel to `backgrounds`, with `extends` resolution shared with `bg`/`tint`.
- [x] `frame="preset"` applies a named preset; inline `frame-aspect|displace|offset|oversize|place|anchor|shadow` override facets and work without a preset.
- [x] `offset` is a named scale (`none|sm|md|lg|xl`) backed by `--rf-spacing-*`; the `resolveOffset` raw-length fallthrough is closed (unknown values warn).
- [x] The frame shadow facet renders as `drop-shadow` (silhouette), never colliding with `elevation`'s `box-shadow`.

## Approach
Reuse the `bg` pipeline: `engine.ts` bg resolution, `BgPresetDefinition`, `merge.ts` `extends`. SPEC-086 §2.

## References

- {% ref "SPEC-086" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-086-surface-chrome`

### What was done
- `FramePresetDefinition` + `ThemeConfig.frames` (`types.ts`); `mergeThemeConfig` merges frames (`merge.ts`).
- `frame` + `frame-{aspect,displace,offset,oversize,place,anchor,shadow}` universal attributes (`lib/index.ts`, `attribute-presets.ts`), injected as `<meta data-field>` so the engine reads them via the bg meta channel.
- Engine `resolveFrameChrome` (`engine.ts`): resolves the preset (+ one `extends` level) and inline facet overrides; facets work standalone.
- Completed the `offset` named scale (`none|sm|md|lg|xl` → `--rf-spacing-*`) and closed `resolveOffset`'s raw-length fallthrough (unknown → warn → none) in `helpers.ts`.
- `frame-shadow` renders as `drop-shadow` in `dimensions/frame.css`; `elevation` stays `box-shadow` — never collide.

### Notes
- Tests in `packages/transform/test/frames.test.ts`.

{% /work %}
