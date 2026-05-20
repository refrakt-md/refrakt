{% work id="WORK-218" status="ready" priority="high" complexity="medium" tags="highlight, shiki, syntax-highlighting" source="SPEC-056" milestone="v0.14.1" %}

# Extended Shiki css-variables theme in `@refrakt-md/highlight`

Replace the stock `createCssVariablesTheme({ variablePrefix: '--rf-syntax-' })` in `packages/highlight/src/highlight.ts` with an extended css-variables theme that wires the additional TextMate scopes needed for the new optional roles (`type`, `tag`, `attribute`, `operator`, `number`, `regex`) onto the corresponding `--rf-syntax-token-*` variables. Begin with an audit step to confirm which roles Shiki's stock theme already emits vs. which need additional scope mappings — that audit determines the size of the extended theme.

## Acceptance Criteria

- [ ] Audit produces a written record (in the PR description or a short note in `packages/highlight/README.md`) of which optional roles from SPEC-056 are free vs. which require additional scope mappings, with the exact Shiki source file(s) referenced
- [ ] `packages/highlight/src/highlight.ts` exports/uses an extended css-variables theme that emits `--rf-syntax-token-*` variables for *all* 16 roles in the SPEC-056 contract
- [ ] Scope mappings for newly wired roles cover at least the common TextMate scopes per language family (e.g. `type` covers `entity.name.type`, `entity.name.class`, `support.type`, `support.class`)
- [ ] The extended theme is *one* shared theme — not per-preset. Every refrakt preset (niwaki, nord, future imports) uses the same theme; only the variable *values* differ per preset
- [ ] Existing highlight tests in `packages/highlight/test/highlight.test.ts` pass unchanged. Add at least one test asserting that a snippet exercising the new roles (e.g. a TypeScript class with type annotations) emits spans referencing the new variables
- [ ] Niwaki preset rendering is visually unchanged — verified by a snapshot or by inspection, since niwaki doesn't set the extended roles and they cascade via fallback (delivered by WORK-219)
- [ ] `npm run build -w packages/highlight` and `npx vitest run packages/highlight/` pass

## Approach

Two phases:

**Phase 1 — Audit.** Read `node_modules/shiki/dist/themes/css-variables.mjs` (or the equivalent in Shiki's published source) and enumerate the exact token names the stock theme emits. The expectation from SPEC-056 conversation is roughly: `keyword`, `function`, `string`, `constant`, `comment`, `punctuation`, `variable`, `link`, `string-expression`, `property`, `parameter` are already emitted; `type`, `tag`, `attribute`, `operator`, `number`, `regex` need wiring. Confirm or correct this.

**Phase 2 — Extended theme.** Use `createCssVariablesTheme`'s `settings` field (or, if the stock primitive isn't flexible enough, hand-author a theme object with the full `tokenColors` array) to add scope→variable mappings for the gaps. Reference scope tables from a few well-tested TextMate grammars (TypeScript, Python, HTML, CSS) — don't invent scope names, use what real grammars actually emit.

Keep the extended theme small and readable — one entry per role-needing-wiring, with a comment naming the role.

The 16-role coverage is the success bar; don't over-engineer toward distinguishing rarer scopes that aren't in the contract.

## Dependencies

- Audit step is internal and self-contained
- Can land in parallel with {% ref "WORK-217" /%}; final integration assumes WORK-217 has shipped the type so the contract names are stable

## References

- {% ref "SPEC-056" /%} — "Highlighter Integration" section
- `packages/highlight/src/highlight.ts:12` — current `createCssVariablesTheme` call site
- Shiki source: `themes/css-variables.mjs` (in node_modules) — primary reference for the stock theme's scope map

{% /work %}
