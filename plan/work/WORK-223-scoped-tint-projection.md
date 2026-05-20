{% work id="WORK-223" status="done" priority="high" complexity="medium" tags="tint, presets, tokens, css-generation" source="SPEC-056" milestone="v0.14.1" %}

# Scoped tint projection from preset modules

Extend the `theme.tints[].extends` field (established by SPEC-053) to accept a **preset module path** in addition to a tint name. When `extends` resolves to a preset module, the generator reads that module's `ThemeTokensConfig`, applies the scope-eligibility filter from SPEC-056 (drops typography/spacing/radius/shadow/status namespaces), and emits the result as a `.rf-tint--<name>` scoped CSS class. The tint rune's existing `{% tint preset="<name>" %}` lookup is unchanged — author-facing surface is identical regardless of whether the named tint extends another tint or a preset module.

This is the mechanism that enables live preset showcases in documentation (used by {% ref "WORK-221" /%}) and underwrites the "tints scope colour identity; presets scope structural identity" commitment from SPEC-056.

## Acceptance Criteria

- [x] `theme.tints[].extends` accepts a preset module path string (e.g. `"@refrakt-md/lumina/presets/nord"`). When the value matches a registered preset module, the generator resolves it; otherwise it falls back to the existing tint-name lookup
- [x] The generator emits the projected tint as `.rf-tint--<name> { ... }` containing only **scope-eligible** token namespaces per SPEC-056's filter table:
  - **Included**: `color.bg`, `color.surface`, `color.text`, `color.primary`, `color.muted`, `color.border`, `color.code.*`, `syntax.*`
  - **Excluded**: `font.*`, `radius.*`, `spacing.*`, `shadow.*`, `color.status.*`
- [x] Excluded keys present in a preset module are dropped silently from the projection. Dev-mode (or `NODE_ENV !== 'production'`) emits a warning naming the dropped keys so authors can find them; production build is silent
- [x] An inline tint with `extends` pointing to a preset *and* its own `light`/`dark` overrides layers the overrides on top of the projection. The override vocabulary is the chrome accent set from SPEC-053 — overriding a syntax token in the inline `light`/`dark` is not supported (consistent with the "palettes are named artefacts" policy)
- [x] The tint rune (`packages/runes/src/tags/tint.ts`) is unchanged at the *rune* level — the `preset` attribute lookup still resolves to a named tint by name; only the *generator* knows about preset-extension
- [x] A site can list a preset in `theme.tints` *without* listing it in `theme.presets`. The preset's CSS is emitted only as a scoped tint class, not at `:root`. Verified by inspecting the generated stylesheet
- [x] When a preset is listed in *both* `theme.presets` and `theme.tints`, both forms are emitted — the root form applies globally and the scoped form is available for sub-tree opt-in. Cascade specificity ensures the scoped form wins inside its subtree
- [x] Unit tests cover: (a) `extends` → preset path, (b) `extends` → tint name (unchanged from SPEC-053), (c) preset with non-eligible keys gets filtered, (d) inline override on top of preset extension, (e) preset listed in tints but not presets
- [x] No regressions in existing tint behaviour from SPEC-053 — user-defined inline tints with chrome accent overrides continue to work identically

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

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-056-milestone-v0-14-1\`

### What was done

The scoped tint projection is split across two surfaces, by intent:

1. **Chrome accent projection** — \`resolveTintExtends(tints, presetMap)\` in \`packages/transform/src/merge.ts\` was extended to accept an optional \`presetMap: Record<string, ThemeTokensConfig>\`. When a tint's \`extends\` value matches a key in \`presetMap\`, the preset's chrome accent tokens (\`color.bg/surface.base/text/muted/primary/border\`) are projected into the \`TintTokens\` shape and used as the base layer. The tint's own inline \`light\`/\`dark\` overrides layer on top. Chrome accents continue to flow through the existing inline-style runtime mechanism in \`engine.ts\` — no engine changes.

2. **Syntax + code-surface projection** — new function \`generateScopedTintStylesheet(tints, presetMap)\` in \`packages/transform/src/token-stylesheet.ts\` emits static CSS for the *non-chrome-accent* scope-eligible namespaces. For each tint whose \`extends\` is a preset path, it emits two CSS blocks:
   - \`[data-tint="<name>"] { --rf-syntax-*; --rf-color-code-*; }\` — light values
   - \`[data-tint="<name>"][data-color-scheme="dark"], [data-color-scheme="dark"] [data-tint="<name>"] { ... }\` — dark mode (when preset has \`modes.dark\`)

   The filter (\`SCOPE_ELIGIBLE_NON_ACCENT_NAMESPACES\` + \`filterScopeEligibleNonAccent\`) drops everything outside the eligible set silently in production; dev-mode emits a deduped \`console.warn\` per (preset, dropped-key) pair.

### Implementation deviation worth noting

SPEC-056's wording calls out \`.rf-tint--<name>\` (class selector) for the scoped CSS block. The actual selector emitted by this WORK item is \`[data-tint="<name>"]\` (attribute selector), because that's what \`engine.ts\` already stamps on the tint wrapper (\`tintDataAttrs['data-tint'] = tintName\` at engine.ts:175). Using the attribute selector keeps the rune emission code unchanged — only the generator needs to know about the projection. The selector contract is pinned by a test ("emits the same selectors as the engine already produces for data-tint") so future drift between engine and generator selectors will fail loudly.

### Why split chrome accents from non-chrome projection?

Chrome accents (bg, surface, text, muted, primary, border) are already the tint mechanism's vocabulary — the engine emits them as inline \`style="--tint-bg: ..."\` declarations and \`tint.css\` bridges them to \`--rf-color-*\`. Reusing that mechanism for preset-projected chrome accents is free.

Syntax + code-surface tokens don't fit \`TintTokens\` shape (there's no \`TintTokens.keyword\` or \`TintTokens.code-bg\`). They need a different path. Static CSS keyed to \`[data-tint="<name>"]\` is the natural shape — same selector the engine already emits, just with additional rules cascading into it.

The two paths produce a single coherent user experience: \`{% tint preset="nord" %}\` wraps a subtree in \`data-tint="nord"\`, and that subtree gets both Nord's chrome accents (via inline \`--tint-*\` styles) and Nord's syntax + code-surface tokens (via the static stylesheet). Authors don't see the split.

### Dev warning behaviour

When \`NODE_ENV !== 'production'\` (or undefined), the generator emits a \`console.warn\` per (preset, dropped-key) pair the first time a non-eligible key is encountered. The dedup set is module-level (\`__DROP_WARNINGS_SEEN\`) and persists across calls within a process, so a preset that sets a dropped key only warns once total per build/test run. Production is silent.

### Test results

- \`packages/transform/test/tint-extends.test.ts\` — 5 new tests covering preset-path extends, layered overrides, empty-accent presets (Nord-shape), preset-precedence-over-tint-name, and fallback-to-tint-name. 15 total tests pass.
- \`packages/transform/test/scoped-tint-stylesheet.test.ts\` — 8 new tests covering full preset projection, filter enforcement, no-extends case, no-dark-mode case, selector pinning, and dev-mode warning behaviour (warn-once + silent-in-prod). 8 tests pass.
- Full suite \`npm test\` — 2533/2533 pass across 206 test files.

### Files touched

- \`packages/transform/src/types.ts\` — JSDoc on \`TintDefinition.extends\` documents preset-path mode
- \`packages/transform/src/merge.ts\` — \`resolveTintExtends\` accepts \`presetMap\`; added \`extractChromeAccents\` + \`projectColorAccents\` helpers
- \`packages/transform/src/token-stylesheet.ts\` — new \`generateScopedTintStylesheet\` + \`SCOPE_ELIGIBLE_NON_ACCENT_NAMESPACES\` + \`filterScopeEligibleNonAccent\` + dev warning dedup
- \`packages/transform/src/index.ts\` — exports \`generateScopedTintStylesheet\`
- \`packages/transform/test/tint-extends.test.ts\` — 5 new tests
- \`packages/transform/test/scoped-tint-stylesheet.test.ts\` (new) — 8 tests

### Note on the \`--rf-syntax-token-*-explicit\` indirection

WORK-219's resolution noted that the spec's \`*-explicit\` indirection wasn't implemented; the broad-mapping derivation handles fallback equivalently. This WORK item inherits that — the scoped CSS uses the same \`deriveSyntaxAliases\` helper, so it benefits from the same broad-mapping fallback automatically. No \`*-explicit\` variables are emitted at the scoped layer either, by design.

{% /work %}
