{% spec id="SPEC-035" status="draft" tags="architecture, transform, runes, cli, content, sveltekit, behaviors" %}

# Code Quality Refactoring — Specification

> Cross-package deduplication, function decomposition, and consistency improvements across the monorepo

---

## Problem

A full code quality audit of the monorepo identified systematic duplication, overly complex functions, and inconsistent patterns across packages. These issues increase maintenance burden, make bugs harder to fix (a fix in one copy doesn't propagate to duplicates), and make onboarding harder for contributors.

The issues fall into three categories:

1. **Cross-package duplication** — identical utility functions copied into 2-7 packages independently
2. **Function complexity** — single functions handling 5-10 concerns with 100-400 lines and deep nesting
3. **Pattern inconsistency** — the same logical operation implemented differently across files (argument parsing, validation, state management)

This spec defines what to consolidate, decompose, and standardize — scoped to changes that improve maintainability without altering public API or runtime behavior.

---

## Design Principles

**No public API changes.** All refactoring is internal. Existing imports, exports, and runtime behavior are preserved. Packages that re-export shared utilities may add new internal imports but must not change their public surface.

**Incremental adoption.** Each section of this spec is independently implementable. Work items can be completed in any order without blocking each other.

**Test preservation.** Existing tests must continue to pass. Extracted functions get tested via the existing test suites that exercise the calling code. New unit tests are added only for extracted utilities that have independent logic worth testing.

**No new packages.** Shared utilities go into existing packages (`packages/transform`, `packages/types`, `packages/runes`) rather than creating a new `packages/utils`. This avoids adding to the dependency graph.

---

## Section 1: Cross-Package Deduplication

### 1.1 `escapeHtml()` — 7 copies

Identical `escapeHtml()` implementations exist in:

| Location | Package |
|---|---|
| `packages/transform/src/html.ts` | `@refrakt-md/transform` |
| `packages/html/src/page-shell.ts` | `@refrakt-md/html` |
| `packages/editor/app/src/lib/editor/inline-markdown.ts` | editor app |
| `packages/editor/src/preview.ts` | `@refrakt-md/editor` |
| `runes/design/src/tags/preview.ts` | `@refrakt-md/design` |
| `runes/plan/src/commands/serve.ts` | `@refrakt-md/plan` |
| `packages/behaviors/src/behaviors/search.ts` | `@refrakt-md/behaviors` |

**Plan:** Canonical implementation stays in `packages/transform/src/html.ts` (already exported). All other copies import from `@refrakt-md/transform`. For `packages/behaviors` (no deps, runs in browser), the copy stays — browser bundles can't import from transform at runtime.

### 1.2 `serialize()` / `serializeTree()` — 2 copies

Identical implementations in:
- `packages/transform/src/serialize.ts`
- `packages/runes/src/serialize.ts`

**Plan:** Keep canonical in `packages/transform` (already a dependency of `packages/runes`). Re-export from `packages/runes` for backward compatibility.

### 1.3 `walkTags()` / `mapTags()` — 3 copies

Identical tree-walking functions in:
- `runes/plan/src/pipeline.ts:22-41`
- `runes/design/src/pipeline.ts:6-25`
- `runes/storytelling/src/pipeline.ts:11-24`

**Plan:** Extract to `packages/transform/src/helpers.ts` (or a new `tree.ts` in transform). Community packages import from `@refrakt-md/transform`.

### 1.4 `extractTextContent()` — 3 copies

Recursive text extraction from tag trees in:
- `runes/plan/src/pipeline.ts:66-70`
- `runes/storytelling/src/pipeline.ts:20-24`
- `packages/runes/src/seo.ts:23-33` (as `textContent()`)

**Plan:** Canonical in `packages/transform/src/helpers.ts`. Other copies import it.

### 1.5 `readField()` — 2 copies

Reads `data-field` metadata from tag children in:
- `runes/plan/src/pipeline.ts:43-48`
- `runes/storytelling/src/pipeline.ts:34-40`

**Plan:** Extract alongside `walkTags` into `packages/transform`.

### 1.6 `toKebabCase()` — inlined 3 times

`packages/transform/src/helpers.ts` exports `toKebabCase()`, but:
- `packages/transform/src/engine.ts:318` inlines the regex
- `packages/transform/src/contracts.ts:95` inlines the regex
- `runes/storytelling/src/pipeline.ts:27-32` redefines the function

**Plan:** All usages import from `helpers.ts`. Remove inline regex duplicates.

### 1.7 Frontmatter parsing — 2 copies

- `packages/content/src/frontmatter.ts:3-43`
- `packages/editor/app/src/lib/utils/frontmatter.ts:3-43`

Nearly identical `Frontmatter` interface and `parseFrontmatter()` function.

**Plan:** Canonical in `packages/content`. Editor app imports from `@refrakt-md/content`.

---

## Section 2: Function Decomposition

### 2.1 `transformRune()` — 398 lines, 10+ branches

**File:** `packages/transform/src/engine.ts:67-465`

This function handles tint processing, background injection, universal modifiers (width, spacing, inset), density, sequence annotation, projection, inline styles, meta filtering, structure injection, and postTransform hooks — all in a single function with 5+ levels of nesting.

**Plan:** Extract into focused sub-functions:

| Extracted function | Lines | Responsibility |
|---|---|---|
| `processTintModifiers()` | ~65 | Tint meta tag reading, token resolution, class generation |
| `processBackgroundModifiers()` | ~90 | Background layer injection, gradient handling |
| `processUniversalModifiers()` | ~40 | Width, spacing, inset, density |
| `buildInlineStyles()` | ~30 | Style map to CSS custom property conversion |
| `filterConsumedMeta()` | ~20 | Remove consumed meta tags from children |

The top-level `transformRune()` orchestrates these and assembles the final result. Each sub-function is a pure function taking relevant inputs and returning modifications.

### 2.2 `buildStructureElement()` — 122 lines

**File:** `packages/transform/src/engine.ts:773-894`

Complex conditional tree handling multiple element types (icon, badge, meta, heading, label).

**Plan:** Extract type-specific builders: `buildIconElement()`, `buildBadgeElement()`, `buildMetaDisplay()`.

### 2.3 `generateRuneContract()` — 159 lines

**File:** `packages/transform/src/contracts.ts:81-239`

Handles modifier contracts, element collection, style contracts, slot validation, and projection in one function.

**Plan:** Extract `generateModifierContract()`, `generateElementContract()`, `generateStyleContract()`.

### 2.4 `validateConfig()` — 166 lines

**File:** `packages/sveltekit/src/config.ts:27-192`

Nine validation blocks with 3+ levels of nesting.

**Plan:** Extract `validateStringField()`, `validateRunesConfig()`, `validateRouteRules()`. Share `isPlainObject()` guard across validate functions.

### 2.5 `previewBehavior()` — 296 lines

**File:** `packages/behaviors/src/behaviors/preview.ts:58-354`

Handles toolbar creation, view toggling, viewport presets, theme toggling, source tabs, and rendering.

**Plan:** Extract `createToolbar()`, `createViewControls()`, `createSourcePanel()`, `renderPreview()`.

### 2.6 `breadcrumb` transform — 99 lines with triple-nested loops

**File:** `packages/runes/src/tags/breadcrumb.ts:26-125`

**Plan:** Extract `extractBreadcrumbItems()` and `createBreadcrumbItemTag()`.

### 2.7 `datatable` render — 75 lines

**File:** `packages/behaviors/src/behaviors/datatable.ts:153-227`

Filtering, sorting, pagination, and DOM updates in one function.

**Plan:** Extract `filterRows()`, `sortRows()`, `getVisibleRows()`, `updatePagination()`.

---

## Section 3: Boilerplate Reduction

### 3.1 Meta tag creation helper — 106 occurrences

Nearly every rune tag file repeats:
```typescript
const variantMeta = new Tag('meta', { content: attrs.variant ?? 'default' });
```

**Plan:** Add to `packages/runes/src/tags/common.ts`:
```typescript
export function createMetaTags(
  attrs: Record<string, unknown>,
  keys: string[],
  defaults?: Record<string, string>
): Record<string, Tag | undefined>
```

Rune tag files call `createMetaTags(attrs, ['variant', 'layout', 'size'], { variant: 'default' })` instead of creating meta tags individually. Adoption is incremental — new runes use the helper, existing runes migrate over time.

### 3.2 Body wrapping pattern — 18 occurrences

Repeated across rune tags:
```typescript
const body = new RenderableNodeCursor(
  Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
).wrap('div');
```

**Plan:** Add to `packages/runes/src/lib/index.ts`:
```typescript
export function transformBody(resolved: ResolvedFields, config: Config): RenderableNodeCursor
```

### 3.3 `isPlainObject()` type guard — 15+ inline checks

The pattern `typeof x !== 'object' || x === null || Array.isArray(x)` is repeated in `packages/transform/src/validate.ts` and `packages/sveltekit/src/config.ts`.

**Plan:** Export from `packages/transform/src/helpers.ts`:
```typescript
export function isPlainObject(v: unknown): v is Record<string, unknown>
```

### 3.4 SSE/NDJSON stream parsing — 3 near-identical parsers

`packages/ai/src/providers/` has `parseAnthropicSSE()`, `parseGeminiSSE()`, `parseOllamaNDJSON()` sharing ~85% structure.

**Plan:** Extract generic parser:
```typescript
async function* parseStreamResponse(
  response: Response,
  extractText: (parsed: unknown) => string | undefined
): AsyncGenerator<string>
```

Provider-specific functions become thin wrappers passing their JSON extraction logic.

### 3.5 CLI argument parsing — 7 duplicated if-else chains

Every command in `packages/cli/src/bin.ts` (`runInspect`, `runWrite`, `runContracts`, `runScaffoldCss`, `runValidate`, `runTheme`, `runPackage`) repeats a 40-100 line if-else chain for `--flag` parsing with inconsistent error messages.

**Plan:** Create a lightweight argument parser in `packages/cli/src/lib/args.ts`:
```typescript
interface ArgDef { flags: string[]; value?: boolean; required?: boolean }
function parseArgs(args: string[], defs: Record<string, ArgDef>): Record<string, string | boolean>
```

Each command declares its flags declaratively and calls `parseArgs()`.

### 3.6 SVG `createIcon()` — 2 copies in behaviors

Identical functions in `copy.ts:8-20` and `preview.ts:5-17`, differing only in width/height.

**Plan:** Extract to `packages/behaviors/src/utils.ts` with optional size parameter.

### 3.7 Split layout meta tags not using shared helper

`runes/marketing/src/tags/feature.ts:166-175` and `steps.ts:50-54` manually create layout meta tags instead of using `buildLayoutMetas()` from `@refrakt-md/runes`.

**Plan:** Update marketing package to use the shared helper, matching storytelling and learning packages.

---

## Section 4: Consistency Improvements

### 4.1 Nullish coalescing vs logical OR

Some rune tags use `||` (wrong for falsy values like `0` or `""`) where `??` is correct. Example: `packages/runes/src/tags/blog.ts:41`.

**Plan:** Audit all `||` usage for attribute defaults. Replace with `??` where the intent is "use default only when undefined/null".

### 4.2 Data attribute string constants

`packages/transform/src/engine.ts` has 70+ occurrences of hardcoded strings like `'data-rune'`, `'data-name'`, `'data-density'`.

**Plan:** Create an `ATTRIBUTES` constant object in `packages/transform/src/constants.ts` and reference throughout engine.ts.

### 4.3 Inconsistent ARIA state management in behaviors

Tabs uses `data-state` + `aria-selected`, accordion uses `data-state` + `aria-expanded`, gallery uses only `data-state`. Cleanup thoroughness varies.

**Plan:** Standardize on a shared `setAriaState()` utility in `packages/behaviors/src/utils.ts` that consistently manages both `data-state` and the appropriate `aria-*` attribute.

### 4.4 Silent error swallowing in git operations

`packages/content/src/timestamps.ts` catches all git errors and returns empty maps with no logging.

**Plan:** Add `console.debug()` logging so failures are visible when debugging but don't break builds.

### 4.5 Incomplete XML escaping in sitemap

`packages/content/src/sitemap.ts:31-32` only escapes `&`, `<`, `>` but misses `"` and `'`.

**Plan:** Add the missing entity escapes.

### 4.6 Config loading duplication in CLI

`packages/cli/src/bin.ts` has `loadMergedConfig()` (complete) and an inline version in `runWrite()` (incomplete — skips local runes, aliases).

**Plan:** `runWrite()` calls `loadMergedConfig()` instead of reimplementing.

---

## Section 5: Cleanup

### 5.1 Unimplemented `buildNavigation()` stub

`packages/content/src/navigation.ts:31-38` exports a public function that returns an empty stub with a TODO comment.

**Plan:** Either implement or remove the export. If the function is planned for a future spec, keep the file with a clear "not yet implemented" error. If not, delete.

### 5.2 Self-referential aliases in media package

`runes/media/src/index.ts:53-74` has `'music-playlist'` with `aliases: ['music-playlist']` — a self-alias that does nothing.

**Plan:** Remove the self-referential aliases.

### 5.3 Deprecated exports in runes common.ts

`SplitablePageSectionModel = undefined` and `SplitLayoutModel` are deprecated but still exported.

**Plan:** Add deprecation JSDoc annotations. Remove in the next major version.

---

## Out of Scope

- **Public API changes** — this spec only covers internal refactoring
- **New abstractions** — no new packages, no new architectural patterns
- **Performance optimization** — git timestamp caching, CSS build optimization, etc. are separate concerns
- **Community package naming conventions** — standardizing child component names (`cast-member` vs `character-section`) is a separate spec

---

## Work Item Breakdown

This spec decomposes into the following work items, ordered by impact:

1. **Cross-package utility deduplication** (Section 1.1-1.6) — highest value, eliminates 7+ duplicate implementations
2. **`transformRune()` decomposition** (Section 2.1) — highest complexity function in the codebase
3. **Meta tag and body wrapping helpers** (Section 3.1-3.2) — reduces boilerplate across 28+ rune tag files
4. **Stream parser consolidation** (Section 3.4) — deduplicates AI provider code
5. **CLI argument parser** (Section 3.5) — eliminates 7 repeated if-else chains
6. **Remaining function decompositions** (Section 2.2-2.7) — individual extractions
7. **Validation helpers** (Section 3.3) — `isPlainObject()` and friends
8. **Consistency fixes** (Section 4) — nullish coalescing, constants, ARIA, error handling
9. **Cleanup** (Section 5) — stubs, self-aliases, deprecation annotations

{% /spec %}
