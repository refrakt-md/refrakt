{% work id="WORK-428" status="ready" priority="high" complexity="complex" source="SPEC-104" milestone="v0.24.0" tags="surfaces,bg,sandbox,engine,transform,lumina" %}

# `bg` guest body + engine relocation + bare-surface guardrail

The gate for {% ref "SPEC-104" /%}: teach `bg` to host a live `sandbox` as a bare,
presentational, full-bleed backdrop. Covers §1–§4 — the constrained body, the engine
relocation that mirrors `bg-video`, the bare-surface guardrail, and boot-frame layering.
Everything downstream (the preset, the showcase) builds on the `data-bg-guest` contract
this establishes.

## Scope

- **Constrained body** (§1) — `bg` (today a directive with no body, `packages/runes/src/tags/bg.ts`) gains an optional body holding a single presentational guest. `bg` transforms it normally (so the real `sandbox` rune runs with file resolution + sanitisation via `config.variables.__sandboxReadFile`), tags the rendered output `data-bg-guest`, forces `height="fill"` (the {% ref "SPEC-101" /%} host-owned-height mode), and marks it presentational. The tagged element is emitted alongside the existing `bg-*` metas.
- **Engine relocation** (§2) — `engine.ts` §1f, when it raises the bg layer, collects any `data-bg-guest` descendant into the `data-name="bg"` div — above the `--bg-image` boot frame, below overlay/scrim, a sibling of the `bg-video` branch — and marks it consumed so it is not also rendered in content flow. The {% ref "SPEC-090" /%} `presentational` demotion applies (it is in the bg layer).
- **Bare-surface guardrail** (§3) — the body accepts a presentational guest only; a chromed content rune (`video`/`audio`/`figure`) emits a {% ref "SPEC-084" /%}-style build warning redirecting to the media-guest slot or `bg video="…"`. Bare image/video backdrops keep their existing `bg src=`/`video=` attribute path, unchanged.
- **Boot-frame composition** (§4) — a `--bg-image` (image/gradient) paints behind the guest; `overlay`/`scrim` above it; a host's positioned image still flows to `og:image` / structured-data `image` via the host's normal media extraction.

## Acceptance Criteria

- [ ] `bg` accepts an optional body holding one presentational guest (`sandbox`); bg transforms it (real sandbox rune — file resolution + sanitisation), tags it `data-bg-guest`, and forces `height="fill"` + presentational posture.
- [ ] The engine (§1f) relocates a `data-bg-guest` element into the `data-name="bg"` layer — above the `--bg-image` boot frame, below overlay/scrim, sibling to `bg-video` — and marks it consumed so it does not render in content flow; {% ref "SPEC-090" /%} demotion applies.
- [ ] A chromed content rune (`video`/`audio`/`figure`) in the bg body produces a build warning redirecting to the media-guest slot or `bg video="…"`; bare image/video backdrops keep their existing attribute path (unchanged).
- [ ] Boot frame composes: a `gradient`/`image` paints behind the guest; `overlay`/`scrim` above it; a host's positioned image still flows to `og:image` / structured-data `image`.
- [ ] Unit tests cover the body transform + tagging, the engine relocation + consumption, the guardrail warning, and the boot-frame layering; contracts regenerated.

## Dependencies

- None within the milestone — this is the {% ref "SPEC-104" /%} gate. WORK-429 (preset) and WORK-430 (docs) depend on the `data-bg-guest` contract here.

## References

- {% ref "SPEC-104" /%} §1–§4 · `packages/runes/src/tags/bg.ts` · `packages/transform/src/engine.ts` (§1f bg resolution) · {% ref "SPEC-101" /%} (`height="fill"`, boot frame; `packages/behaviors/src/elements/sandbox.ts`) · {% ref "SPEC-090" /%} (presentational posture) · {% ref "SPEC-084" /%} (validation).

{% /work %}
