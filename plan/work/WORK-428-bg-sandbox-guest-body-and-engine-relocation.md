{% work id="WORK-428" status="done" priority="high" complexity="complex" source="SPEC-104" milestone="v0.24.0" tags="surfaces,bg,sandbox,engine,transform,lumina" %}

# `bg` guest body + engine relocation + bare-surface guardrail

The gate for {% ref "SPEC-104" /%}: teach `bg` to host a live `sandbox` as a bare,
full-bleed backdrop. Covers §1–§4 + §7 — the constrained body, the engine relocation
that mirrors `bg-video`, the backdrop posture (mounted-but-inert), the bare-surface
guardrail, boot-frame layering, and reduced-motion/off-screen gating. Everything
downstream (the preset, the showcase) builds on the `data-bg-guest` contract this
establishes.

## Scope

- **Constrained body** (§1) — `bg` (today a directive with no body, `packages/runes/src/tags/bg.ts`) gains an optional body holding a single bare guest. `bg` transforms it normally (so the real `sandbox` rune runs with file resolution + sanitisation via `config.variables.__sandboxReadFile`), tags the rendered output `data-bg-guest`, forces `height="fill"` (the {% ref "SPEC-101" /%} host-owned-height mode), and gives it the backdrop posture. The tagged element is emitted alongside the existing `bg-*` metas.
- **Engine relocation** (§2) — `engine.ts` §1f, when it raises the bg layer, collects any `data-bg-guest` descendant into the `data-name="bg"` div — above the `--bg-image` boot frame, below overlay/scrim, a sibling of the `bg-video` branch — and marks it consumed so it is not also rendered in content flow.
- **Backdrop posture** (§2) — the guest gets `data-guest-posture="backdrop"`, distinct from SPEC-090 `presentational`: the enhancement layer **mounts** it and forces **eager** activation (the scene runs), while suppressing interaction only (`pointer-events: none`, no controls, out of tab order). NOT `presentational` (which skips enhancement → a dead backdrop).
- **Bare-surface guardrail** (§3) — the body accepts a bare guest only; a chromed content rune (`video`/`audio`/`figure`) emits a {% ref "SPEC-084" /%}-style build warning redirecting to the media-guest slot or `bg video="…"`. Bare image/video backdrops keep their existing `bg src=`/`video=` attribute path, unchanged.
- **Boot-frame composition** (§4) — a `--bg-image` (image/gradient) paints behind the guest; `overlay`/`scrim` above it; a host's positioned image still flows to `og:image` / structured-data `image` via the host's normal media extraction.
- **Reduced motion & performance** (§7) — under `prefers-reduced-motion: reduce` the live scene is not mounted (the boot frame stands in); the backdrop suspends its render loop off-screen / on a hidden tab; no-JS/crawler get the boot frame. Consistent with the {% ref "SPEC-105" /%} baseline.

## Acceptance Criteria

- [x] `bg` accepts an optional body holding one bare guest (`sandbox`); bg transforms it (real sandbox rune — file resolution + sanitisation), tags it `data-bg-guest`, and forces `height="fill"` + the backdrop posture.
- [x] The engine (§1f) relocates a `data-bg-guest` element into the `data-name="bg"` layer — above the `--bg-image` boot frame, below overlay/scrim, sibling to `bg-video` — and marks it consumed so it does not render in content flow.
- [x] **Backdrop posture:** the guest gets `data-guest-posture="backdrop"` — the enhancement layer mounts it + forces eager activation (it runs), suppressing interaction only (`pointer-events:none`, no controls, out of tab order). Explicitly not SPEC-090 `presentational`; a test covers that a backdrop guest mounts while a presentational one does not.
- [x] A chromed content rune (`video`/`audio`/`figure`) in the bg body produces a build warning redirecting to the media-guest slot or `bg video="…"`; bare image/video backdrops keep their existing attribute path (unchanged).
- [x] Boot frame composes: a `gradient`/`image` paints behind the guest; `overlay`/`scrim` above it; a host's positioned image still flows to `og:image` / structured-data `image`.
- [x] **Reduced motion & performance:** under `prefers-reduced-motion` the live scene is not mounted (boot frame stands in); the backdrop suspends off-screen / on a hidden tab; no-JS/crawler render the boot frame.
- [x] Unit tests cover the body transform + tagging, the engine relocation + consumption, the guardrail warning, the boot-frame layering, and the backdrop-vs-presentational mount distinction; contracts regenerated.

## Dependencies

- None within the milestone — this is the {% ref "SPEC-104" /%} gate. WORK-429 (preset) and WORK-430 (docs) depend on the `data-bg-guest` contract here.

## References

- {% ref "SPEC-104" /%} §1–§4 · `packages/runes/src/tags/bg.ts` · `packages/transform/src/engine.ts` (§1f bg resolution) · {% ref "SPEC-101" /%} (`height="fill"`, boot frame; `packages/behaviors/src/elements/sandbox.ts`) · {% ref "SPEC-090" /%} (presentational posture) · {% ref "SPEC-084" /%} (validation).

## Resolution

Completed: 2026-06-16

Branch: `claude/v024-work428-bg-guest`.

### What was done
- **bg body + guest tagging** (`packages/runes/src/tags/bg.ts`): `bg` gained an optional body. It transforms the body normally (the real sandbox rune runs, with file resolution + sanitisation), finds the guest, tags it `data-bg-guest` + `data-guest-posture="backdrop"`, forces `height="fill"` + eager activation, and emits it alongside the `bg-*` metas. A chromed guest (`video`/`audio`/`figure`) is rejected with a build warning (the bare-surface guardrail).
- **Hoist** (`packages/runes/src/lib/index.ts`): `injectBgMetasFrom` now hoists the `data-bg-guest` element (not just metas) from the `{% bg %}` body up to the host.
- **Engine relocation** (`packages/transform/src/engine.ts` §1f): captures the hoisted guest, relocates it into the `data-name="bg"` layer as a sibling of the `bg-video` branch (above the `--bg-image` boot frame, below overlay/scrim), and drops the flow copy so it isn't rendered twice. A guest alone raises the bg layer.
- **Backdrop posture** (`packages/skeleton/styles/{runes/bg.css,dimensions/guest-posture.css}`): the guest fills the bg layer (position/inset/sizing); `[data-guest-posture="backdrop"]` is `pointer-events:none`. Distinct from `presentational` — the behaviours layer still mounts a backdrop.
- **Reduced motion & off-screen** (`packages/behaviors/src/elements/sandbox.ts`): a `data-guest-posture="backdrop"` sandbox never mounts under `prefers-reduced-motion` (the bg boot frame stands in), mounts only while on-screen, and suspends (tears the iframe down) off-screen / on a hidden tab via IntersectionObserver + visibilitychange — re-mounting on return.

### Tests
- `transform/test/bg-guest.test.ts` (5) — relocation, consumption, overlay layering, gradient boot-frame composition, guest-alone trigger.
- `runes/test/bg-guest.test.ts` (3) — body transform + tagging + posture, metas-alongside-guest, chromed-guest guardrail warning.
- `behaviors/test/bg-backdrop.test.ts` (4) — reduced-motion skip, on/off-screen mount-suspend cycle, no-IO fallback, backdrop-enhanced-vs-presentational-skipped at the enhancement layer.

### Notes
- The `sandbox` is an autonomous custom element (`rf-sandbox`) that mounts via its own `connectedCallback`, independent of `initRuneBehaviors` — so for a sandbox the backdrop posture's job is interaction-suppression + reduced-motion/off-screen gating, not "ensure it mounts" (it mounts regardless).
- `bg` is a directive Schema with no config-derived contract surface, so structure contracts are unchanged. The failing `packages/lumina/test/contracts.test.ts` drift is **pre-existing and unrelated** — the committed `contracts/structures.json` tracks `refrakt contracts --site main` (which includes the plan plugin), while the test regenerates from `fullConfig` (8 plugins, no plan); they have diverged (~525 lines + the chart `tick-*` modifiers). It fails identically on `main`. Flagged for a separate cleanup (reconcile the test's generation with the committed-file generation method).
- Full suite otherwise green (3397); the audio-reactive showcase (WORK-430) remains deferred on SPEC-006.

{% /work %}
