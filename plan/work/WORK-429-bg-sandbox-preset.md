{% work id="WORK-429" status="done" priority="high" complexity="complex" source="SPEC-104" milestone="v0.24.0" tags="surfaces,bg,sandbox,transform,config,preset" %}

# `sandbox` bg preset (transform-resolved)

{% ref "SPEC-104" /%} §5: make a reusable sandbox backdrop applicable by name
(`bg="midnight-waves"`) like any other preset, by adding a `sandbox` descriptor to
`BgPresetDefinition` — resolved at **transform time** (not the identity engine, which has
no file access), expanding into the {% ref "WORK-428" /%} `data-bg-guest` body.

## Scope

- **Type** — `BgPresetDefinition` (`packages/transform/src/types.ts`) gains
  `sandbox?: { src: string; framework?: string; dependencies?: string }`, a sibling to the
  engine-resolved `gradient`/`style`.
- **Transform-time expansion** — a new step (where the sandbox readers live) sees
  `bg="name"`, finds a `sandbox`-typed preset, and injects the real `{% sandbox %}` guest
  into the bg body — producing the **same** `data-bg-guest` element {% ref "WORK-428" /%}
  relocates. The preset is sugar over the body primitive, not a parallel path.
- **Forced behaviours not author-set** — `height: fill`, presentational posture, eager
  activation come from the bg-guest mechanism; the preset describes only the scene
  (`src`/`framework`/`dependencies`). A preset may also carry `gradient`/`style` for the
  boot frame (both land in the same `data-name="bg"` div); `extends` resolves as for other
  bg presets.
- **Config home + schema** — sandbox presets live in project config
  (`refrakt.config.json` `sites.<site>.backgrounds`) per the {% ref "SPEC-088" /%}
  project-vs-theme split (a scene is content); project `backgrounds` merge over theme.
  `refrakt.config.schema.json` gains the `sandbox` key.
- **Memoisation** — a named scene's assembled source is byte-identical across pages; build
  the bundle once and clone per page (an optimisation only the named path affords).

## Acceptance Criteria

- [x] `BgPresetDefinition` gains a `sandbox` descriptor (`src`/`framework`/`dependencies`); `refrakt.config.schema.json` documents it; project `backgrounds` merge over theme.
- [x] A `sandbox`-typed preset is resolved at **transform time** by an expansion step that injects the {% ref "WORK-428" /%} body guest — not in the identity engine; `bg="name"` reaches author-parity with a gradient preset.
- [x] A sandbox preset may also carry `gradient`/`style` (boot frame); `extends` resolves as for other bg presets; forced `fill`/posture/eager are not author-set.
- [x] Assembled scene source is memoised per preset name (built once, cloned per page); tests cover expansion, the schema, and dedup.

## Dependencies

- {% ref "WORK-428" /%} — consumes its `data-bg-guest` body contract.

## References

- {% ref "SPEC-104" /%} §5 · `packages/transform/src/types.ts` (`BgPresetDefinition`) · `refrakt.config.json` / `refrakt.config.schema.json` · {% ref "SPEC-088" /%} (project-vs-theme preset home) · `packages/runes/src/tags/sandbox.ts` (the rune the expander instantiates).

## Resolution

Completed: 2026-06-16

Branch: `claude/v024-work429-bg-preset`.

### What was done
- **Type** (`packages/transform/src/types.ts`): `BgPresetDefinition` gains `sandbox?: { src; framework?; dependencies? }`, a sibling to the engine-resolved `gradient`/`style`.
- **Transform-time expansion** (`packages/runes/src/lib/index.ts`, `injectBgMetasFrom`): when `bg="name"` resolves to a `sandbox`-typed preset in `config.variables.__backgrounds`, a synthesised `{% sandbox %}` is transformed (the real rune runs, with file resolution + sanitisation via the config readers), tagged `data-bg-guest` + `data-guest-posture="backdrop"` + `height="fill"` + eager, and hoisted — the **same** element WORK-428's engine relocates. The preset is sugar over the body; an inline body guest wins if both are present. `extends` resolves one level (own fields win), mirroring the engine's preset chain.
- **Plumbing** (`packages/content/src/site.ts`): the project bg registry (`siteConfig.backgrounds`) is passed into the Markdoc transform variables as `__backgrounds`, so the expander can resolve preset names at transform time (where the sandbox readers live).
- **Schema** (`refrakt.config.schema.json`): the `backgrounds` property documents the `BgPresetDefinition` shape incl. the `sandbox` key (kept freeform-validated).
- **Memoisation**: assembled scenes are cached per `backgrounds` registry + descriptor (one registry reference per build, shared across pages → cross-page dedup; the file-reading transform runs once, each consumer gets a fresh clone).
- **Tests** (`packages/runes/test/bg-preset.test.ts`, 4): expansion → tagged backdrop guest; non-sandbox (gradient) preset doesn't expand; `extends` resolution; memoisation (readers run once across two consumers).

### Notes
- The boot frame still composes: `bg="name"` also emits the `bg-preset` meta, so the engine paints the preset's `gradient`/`style` behind the live scene (WORK-428 §4) — both land in the same `data-name="bg"` div.
- Sandbox presets are **project-level** content (SPEC-104 / SPEC-088), so the expander reads `siteConfig.backgrounds`; the engine continues to merge theme+project for the `gradient`/`style` (boot-frame) path. A theme-defined *sandbox* preset is out of scope by design.
- Full suite green (3403).

{% /work %}
