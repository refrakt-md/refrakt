{% work id="WORK-223" status="ready" priority="high" complexity="medium" tags="tint, presets, tokens, css-generation" source="SPEC-056" milestone="v0.14.1" %}

# Scoped tint projection from preset modules

Extend the `theme.tints[].extends` field (established by SPEC-053) to accept a **preset module path** in addition to a tint name. When `extends` resolves to a preset module, the generator reads that module's `ThemeTokensConfig`, applies the scope-eligibility filter from SPEC-056 (drops typography/spacing/radius/shadow/status namespaces), and emits the result as a `.rf-tint--<name>` scoped CSS class. The tint rune's existing `{% tint preset="<name>" %}` lookup is unchanged — author-facing surface is identical regardless of whether the named tint extends another tint or a preset module.

This is the mechanism that enables live preset showcases in documentation (used by {% ref "WORK-221" /%}) and underwrites the "tints scope colour identity; presets scope structural identity" commitment from SPEC-056.

## Acceptance Criteria

- [ ] `theme.tints[].extends` accepts a preset module path string (e.g. `"@refrakt-md/lumina/presets/nord"`). When the value matches a registered preset module, the generator resolves it; otherwise it falls back to the existing tint-name lookup
- [ ] The generator emits the projected tint as `.rf-tint--<name> { ... }` containing only **scope-eligible** token namespaces per SPEC-056's filter table:
  - **Included**: `color.bg`, `color.surface`, `color.text`, `color.primary`, `color.muted`, `color.border`, `color.code.*`, `syntax.*`
  - **Excluded**: `font.*`, `radius.*`, `spacing.*`, `shadow.*`, `color.status.*`
- [ ] Excluded keys present in a preset module are dropped silently from the projection. Dev-mode (or `NODE_ENV !== 'production'`) emits a warning naming the dropped keys so authors can find them; production build is silent
- [ ] An inline tint with `extends` pointing to a preset *and* its own `light`/`dark` overrides layers the overrides on top of the projection. The override vocabulary is the chrome accent set from SPEC-053 — overriding a syntax token in the inline `light`/`dark` is not supported (consistent with the "palettes are named artefacts" policy)
- [ ] The tint rune (`packages/runes/src/tags/tint.ts`) is unchanged at the *rune* level — the `preset` attribute lookup still resolves to a named tint by name; only the *generator* knows about preset-extension
- [ ] A site can list a preset in `theme.tints` *without* listing it in `theme.presets`. The preset's CSS is emitted only as a scoped tint class, not at `:root`. Verified by inspecting the generated stylesheet
- [ ] When a preset is listed in *both* `theme.presets` and `theme.tints`, both forms are emitted — the root form applies globally and the scoped form is available for sub-tree opt-in. Cascade specificity ensures the scoped form wins inside its subtree
- [ ] Unit tests cover: (a) `extends` → preset path, (b) `extends` → tint name (unchanged from SPEC-053), (c) preset with non-eligible keys gets filtered, (d) inline override on top of preset extension, (e) preset listed in tints but not presets
- [ ] No regressions in existing tint behaviour from SPEC-053 — user-defined inline tints with chrome accent overrides continue to work identically

## Approach

Two layers to touch:

**Config resolution layer.** Wherever `extends` is currently resolved (likely in the config loader for `@refrakt-md/sveltekit` or whichever package processes `refrakt.config.json` into a normalised theme), add a branch: if the string matches a known preset module path, load the module and use its `ThemeTokensConfig` as the base; otherwise resolve as a tint name (existing behaviour).

**Generator layer.** Wherever the tint stylesheet generator emits `.rf-tint--<name>` blocks (likely the same package that emits the `:root { --rf-* }` block from SPEC-048's WORK-187), add the scope-eligibility filter. The filter is a single declarative table — a `const SCOPE_ELIGIBLE_NAMESPACES: ReadonlySet<string>` or equivalent — so adding/removing eligible namespaces in a future spec is a one-line edit.

The filter operates on the flattened token shape, not the namespaced shape. After flattening a `ThemeTokensConfig` to `{ 'color.bg': '#...', 'syntax.keyword': '#...', 'font.sans': '...', ... }`, the filter keeps keys whose prefix matches an eligible namespace and drops the rest.

The dev warning should fire once per (preset, dropped-key) pair, not once per build — a `Set<string>` keyed by `"${preset}:${key}"` deduplicates noise.

The `--rf-syntax-token-*-explicit` indirection from {% ref "WORK-219" /%} must work the same way inside a scoped tint class — i.e. the projection emits `--rf-syntax-token-type-explicit: <value>` (not just `--rf-syntax-token-type`) so the fallback chain still functions correctly when the projection is partial. Audit this against WORK-219's implementation when both land.

## Out of scope for this work item

- **Auto-exposing presets as tints** — opt-in only via explicit declaration in `theme.tints`. See SPEC-056's "Out of scope" section.
- **Inline syntax overrides on tint extensions** — `{ extends: "<preset>", light: { keyword: "#fff" } }` is not supported. SPEC-056's "Palettes are named artefacts; accents are inline" principle locks this.
- **Extending the filter's eligibility table** — this WORK item ships the table as defined in SPEC-056. Future changes to eligibility require a new spec.

## Dependencies

- {% ref "WORK-219" /%} — the CSS generator's fallback chain logic must exist so the scoped projection can re-use it correctly inside `.rf-tint--<name>` blocks
- Conceptually depends on SPEC-053's existing tint infrastructure being in place (the `.rf-tint--<name>` selector pattern, the `tints` config field, the `extends` mechanism for tint→tint)

## References

- {% ref "SPEC-056" /%} — "Tint as scoped preset projection" and "Scope-eligibility filter" subsections
- {% ref "SPEC-053" /%} — original `TintDefinition` shape and `extends` semantics
- {% ref "SPEC-048" /%} and {% ref "WORK-187" /%} — token stylesheet generator (locate its source file from WORK-187's resolution)
- `packages/runes/src/tags/tint.ts` — tint rune (note: unchanged by this work item)

{% /work %}
