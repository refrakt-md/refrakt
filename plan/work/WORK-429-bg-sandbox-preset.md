{% work id="WORK-429" status="ready" priority="high" complexity="complex" source="SPEC-104" milestone="v0.23.0" tags="surfaces,bg,sandbox,transform,config,preset" %}

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

- [ ] `BgPresetDefinition` gains a `sandbox` descriptor (`src`/`framework`/`dependencies`); `refrakt.config.schema.json` documents it; project `backgrounds` merge over theme.
- [ ] A `sandbox`-typed preset is resolved at **transform time** by an expansion step that injects the {% ref "WORK-428" /%} body guest — not in the identity engine; `bg="name"` reaches author-parity with a gradient preset.
- [ ] A sandbox preset may also carry `gradient`/`style` (boot frame); `extends` resolves as for other bg presets; forced `fill`/posture/eager are not author-set.
- [ ] Assembled scene source is memoised per preset name (built once, cloned per page); tests cover expansion, the schema, and dedup.

## Dependencies

- {% ref "WORK-428" /%} — consumes its `data-bg-guest` body contract.

## References

- {% ref "SPEC-104" /%} §5 · `packages/transform/src/types.ts` (`BgPresetDefinition`) · `refrakt.config.json` / `refrakt.config.schema.json` · {% ref "SPEC-088" /%} (project-vs-theme preset home) · `packages/runes/src/tags/sandbox.ts` (the rune the expander instantiates).

{% /work %}
