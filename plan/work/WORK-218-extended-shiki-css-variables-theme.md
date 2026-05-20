{% work id="WORK-218" status="done" priority="high" complexity="medium" tags="highlight, shiki, syntax-highlighting" source="SPEC-056" milestone="v0.14.1" %}

# Extended Shiki css-variables theme in `@refrakt-md/highlight`

Replace the stock `createCssVariablesTheme({ variablePrefix: '--rf-syntax-' })` in `packages/highlight/src/highlight.ts` with an extended css-variables theme that wires the additional TextMate scopes needed for the new optional roles (`type`, `tag`, `attribute`, `operator`, `number`, `regex`) onto the corresponding `--rf-syntax-token-*` variables. Begin with an audit step to confirm which roles Shiki's stock theme already emits vs. which need additional scope mappings — that audit determines the size of the extended theme.

## Acceptance Criteria

- [x] Audit produces a written record (in the PR description or a short note in `packages/highlight/README.md`) of which optional roles from SPEC-056 are free vs. which require additional scope mappings, with the exact Shiki source file(s) referenced
- [x] `packages/highlight/src/highlight.ts` exports/uses an extended css-variables theme that emits `--rf-syntax-token-*` variables for *all* 16 roles in the SPEC-056 contract
- [x] Scope mappings for newly wired roles cover at least the common TextMate scopes per language family (e.g. `type` covers `entity.name.type`, `entity.name.class`, `support.type`, `support.class`)
- [x] The extended theme is *one* shared theme — not per-preset. Every refrakt preset (niwaki, nord, future imports) uses the same theme; only the variable *values* differ per preset
- [x] Existing highlight tests in `packages/highlight/test/highlight.test.ts` pass unchanged. Add at least one test asserting that a snippet exercising the new roles (e.g. a TypeScript class with type annotations) emits spans referencing the new variables
- [x] Niwaki preset rendering is visually unchanged — verified by a snapshot or by inspection, since niwaki doesn't set the extended roles and they cascade via fallback (delivered by WORK-219)
- [x] `npm run build -w packages/highlight` and `npx vitest run packages/highlight/` pass

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

## Resolution

Completed: 2026-05-20

Branch: `claude/spec-056-milestone-v0-14-1`

### What was done

- **Audited** Shiki's stock css-variables theme by reading `node_modules/@shikijs/core/dist/index.mjs` → `createCssVariablesTheme()`. Stock theme emits 9 `token-*` variables (link, string, comment, constant, keyword, parameter, function, string-expression, punctuation) plus diff-specific tokens. None of the 7 new SPEC-056 optional roles get their own scope→variable wiring; they currently fall through to broader roles via TextMate scope cascade. Full audit table in `packages/highlight/README.md`.
- **Created `packages/highlight/src/extended-theme.ts`** — `createExtendedCssVariablesTheme()` builds on stock `createCssVariablesTheme` and appends `tokenColors` entries for `type`, `tag`, `attribute`, `property`, broader `parameter`, `operator`, `number`, `regex`. TextMate scope matching cascades the new entries on top of the stock entries, so where the stock theme routes `entity.name.tag` to `token-string-expression`, the extended theme overrides it to `token-tag`.
- **Wired into `packages/highlight/src/highlight.ts`** — replaced the direct `createCssVariablesTheme({ variablePrefix: '--rf-syntax-' })` call with `createExtendedCssVariablesTheme({ variablePrefix: '--rf-syntax-' })`. Single shared theme; every preset cascades through it.
- **Added 8 new tests** to `packages/highlight/test/highlight.test.ts` under "SPEC-056 extended syntax roles". One test exercises a comprehensive TypeScript+JSX snippet and asserts all 10 expected `--rf-syntax-token-*` variables appear in the output (the full role set used by realistic code).
- **Created `packages/highlight/README.md`** — package overview with the audit table and notes on alternative theme paths.

### Audit findings

| Role | Stock Shiki emits dedicated `token-*`? | Action |
|---|---|---|
| `keyword`, `function`, `string`, `constant`, `comment`, `punctuation`, `string-expression`, `link`, `parameter` | ✓ | None — already emitted by stock theme |
| `type` | ✗ (routes to `token-function` via `entity.name.type` in stock tokenColors) | Override to `token-type` |
| `tag` | ✗ (routes to `token-string-expression` via `entity.name.tag` — surprising) | Override to `token-tag` |
| `attribute` | ✗ (routes to `token-function` via `entity.other.attribute-name`) | Override to `token-attribute` |
| `property` | ✗ (no scope mapping in stock theme) | Add `token-property` for `variable.other.property`, `meta.object-literal.key`, etc. |
| `operator` | ✗ (falls through to `token-keyword` via `keyword.operator → keyword`) | Override `keyword.operator.*` to `token-operator` |
| `number` | ✗ (folded into broad `token-constant` group) | Override `constant.numeric.*` to `token-number` |
| `regex` | ✗ (routes to `token-string-expression` via `string.regexp` in stock theme) | Override to `token-regex` |

Source reference: `@shikijs/core/dist/index.mjs` → search for `function createCssVariablesTheme`.

### Test results

- `npx vitest run packages/highlight/` — 35/35 pass (27 existing + 8 new). The comprehensive TypeScript+JSX test asserts 10 distinct `--rf-syntax-token-*` variables appear in real highlighted output.
- Full suite `npm test` — 2509/2509 pass across 204 test files.

### Niwaki regression check

Niwaki doesn't set any of the new extended roles. Under the new extended theme:
- Where niwaki *does* set a value (e.g. `keyword`), the highlighter span references `--rf-syntax-token-keyword` and Lumina's generated CSS resolves it to niwaki's keyword colour. Unchanged.
- Where niwaki *doesn't* set a value (e.g. `type`), the highlighter span references `--rf-syntax-token-type`, and WORK-219's broad-mapping derivation has emitted `--rf-syntax-token-type: <function-value>`. The rendered colour is niwaki's function colour — same as before, when type scopes routed through stock Shiki's `entity.name.* → token-function`. Visually unchanged.

### Files touched

- `packages/highlight/src/extended-theme.ts` (new)
- `packages/highlight/src/highlight.ts` (replaced stock-theme constructor call)
- `packages/highlight/test/highlight.test.ts` (added 8 tests)
- `packages/highlight/README.md` (new)

{% /work %}
