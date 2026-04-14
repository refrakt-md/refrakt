{% spec id="SPEC-040" status="draft" version="1.0" tags="plan, architecture, edge-runtime" %}

# Edge Runtime Compatibility for Plan Package

Refactor `@refrakt-md/plan` so that its pure logic — parsing, diffing, filtering, relationship building, entity card construction — can be imported in edge runtimes (Cloudflare Workers, Deno Deploy, Vercel Edge Functions) without pulling in Node.js APIs (`node:fs`, `node:child_process`, `node:path`).

## Problem

The plan package contains substantial pure logic that operates on in-memory data: parsing plan entities from strings, diffing attribute snapshots, filtering/sorting/grouping entity collections, building relationship graphs, and constructing entity card renderables. None of this logic inherently requires Node.js APIs.

However, the pure functions are entangled with Node-dependent code at the module level. `scanner.ts` mixes `parseFileContent()` (pure — accepts a string) with `scanPlanFiles()` (reads the filesystem). `history.ts` mixes `diffAttributes()` (pure — compares two maps) with `getFileCommits()` (shells out to `git log`). `pipeline.ts` inlines relationship building and entity card construction alongside `execSync` calls for git history extraction.

Edge runtimes fail on `import { execSync } from 'node:child_process'` even if the imported symbol is never called. The module-level imports are the problem, not the function bodies. Any consumer that imports `parseFileContent` from `./scanner` transitively imports `fs`, `path`, and `@refrakt-md/content` — all Node-only.

This makes the package unusable in edge runtimes, serverless functions, and browser-based tooling despite the underlying logic being runtime-agnostic.

-----

## Design Principles

**Extract, don't rewrite.** Every function being extracted already exists and is tested. The refactoring moves code between files and adds entry points — it does not change any function signatures, return types, or behaviour.

**Backwards compatibility is non-negotiable.** All existing imports continue to work. The main entry point (`.`), `./scanner`, and `./cli-plugin` entry points are unchanged. Internal refactoring is invisible to current consumers.

**Edge-safe surface is explicit.** New entry points (`./diff`, `./filter`, `./relationships`, `./cards`) are guaranteed free of Node.js API imports. The main entry point (`.`) and `./scanner` remain Node-dependent — this is documented, not hidden.

**Types travel with their functions.** Each new entry point exports the TypeScript interfaces its functions consume and produce. Edge consumers don't need to import from internal modules or `./types` to use the API.

-----

## Current Module Dependency Map

```
index.ts
  ├── pipeline.ts        ← imports execSync, history.ts
  │   ├── filter.ts      ← pure (no Node.js imports)
  │   ├── history.ts     ← imports execSync, fs, path
  │   └── tags/*.ts      ← pure
  └── scanner.ts         ← imports fs, path, @refrakt-md/content
```

### What's pure (no Node.js dependency)

- `parseFileContent(source, relPath)` — parse a string into `PlanEntity`
- `scanPlanSources(sources)` — parse `FileSource[]` into `PlanEntity[]`
- `diffAttributes(prev, curr)` — diff two attribute maps
- `diffCriteria(prev, curr)` — diff two checkbox lists
- `parseTagAttributes(line)` — parse rune opening tag attributes
- `parseCheckboxes(content)` — extract checkbox items from content
- `hasResolutionSection(content)` — detect resolution section
- `parseFilter(expr)` — parse filter expression
- `matchesFilter(entity, filter)` — test entity against filter
- `sortEntities(entities, field)` — sort by field
- `groupEntities(entities, field)` — group by field
- `buildEntityCard(entity)` — build summary card Tag
- `buildDecisionEntry(entity)` — build decision log entry Tag
- `buildMetaBadge(label, value, opts)` — build metadata badge Tag
- Sentiment maps (`WORK_STATUS_SENTIMENT`, `PRIORITY_SENTIMENT`, etc.)
- Relationship graph construction (source refs, dependency refs, text refs → bidirectional relationship edges)
- All rune tag definitions

### What requires Node.js

- `scanPlanFiles(dir)` — reads filesystem, uses git timestamps
- `parseFile(filePath, relPath)` — reads file from disk
- Cache management (`readCache`, `writeCache`) — reads/writes `.plan-cache.json`
- `getFileCommits(filePath, cwd)` — `execSync('git log ...')`
- `getFileAtCommit(hash, filePath, cwd)` — `execSync('git show ...')`
- `extractBatchHistory(planDir, cwd)` — combines multiple git commands
- `extractEntityHistory(filePath, cwd)` — per-file git history
- History cache read/write — filesystem
- Pipeline aggregate hook's history injection — calls `extractBatchHistory` and `execSync` for git remote

-----

## Proposed Changes

### 1. Split scanner into scanner-core + scanner

**Current:** `scanner.ts` exports both `parseFileContent()` (pure) and `scanPlanFiles()` (filesystem) from one module. Importing `scanPlanSources` also imports `fs`, `path`, and `@refrakt-md/content`.

**After:** Move `parseFileContent()`, `scanPlanSources()`, and all supporting pure functions (`extractCriteria`, `extractResolution`, `extractRefs`, `extractScopedRefs`, `walkNodes`, AST helpers) into `scanner-core.ts`. This module has zero Node.js imports. The existing `scanner.ts` imports from `scanner-core.ts` and adds filesystem functions (`parseFile`, `scanPlanFiles`, cache management). The `./scanner` entry point continues to export everything via `scanner.ts`.

### 2. Extract diffing functions into diff module

**Current:** `history.ts` mixes pure diffing functions with git transport (`execSync`).

**After:** Extract into `diff.ts`:
- `diffAttributes(prev, curr)` → `AttributeChange[]`
- `diffCriteria(prev, curr)` → `CriteriaChange[]`
- `parseTagAttributes(line)` → `Record<string, string>`
- `parseCheckboxes(content)` → `ParsedCheckbox[]`
- `hasResolutionSection(content)` → `boolean`
- Types: `AttributeChange`, `CriteriaChange`, `ParsedCheckbox`

The existing `history.ts` re-imports from `diff.ts` — no breaking change.

### 3. Extract relationship builder from pipeline

**Current:** Relationship graph construction (~120 lines) is inside `planPipelineHooks.aggregate()` in `pipeline.ts`, which imports `execSync`.

**After:** Extract into `relationships.ts`:

```typescript
interface EntityRelationship {
  fromId: string;
  fromType: string;
  toId: string;
  toType: string;
  kind: 'blocks' | 'blocked-by' | 'depends-on' | 'dependency-of'
      | 'implements' | 'implemented-by' | 'informs' | 'informed-by' | 'related';
}

function buildRelationships(
  entities: Map<string, { type: string; data: Record<string, any> }>,
  sourceReferences: Map<string, { id: string; type: string }[]>,
  scannerDependencies: Map<string, string[]>,
  idReferences: Map<string, { id: string; type: string }[]>
): Map<string, EntityRelationship[]>;
```

Pipeline's aggregate hook calls `buildRelationships()` instead of inlining the logic.

### 4. Extract entity card builder and sentiments

**Current:** `buildEntityCard()`, `buildDecisionEntry()`, `buildMetaBadge()`, and all sentiment maps are in `pipeline.ts`.

**After:** Extract into `cards.ts`:
- `buildEntityCard(entity)` — builds summary card Tag
- `buildDecisionEntry(entity)` — builds decision log entry Tag
- `buildMetaBadge(label, value, opts)` — builds metadata badge Tag
- Sentiment constants: `WORK_STATUS_SENTIMENT`, `BUG_STATUS_SENTIMENT`, `PRIORITY_SENTIMENT`, `SEVERITY_SENTIMENT`, `SPEC_STATUS_SENTIMENT`, `DECISION_STATUS_SENTIMENT`, `MILESTONE_STATUS_SENTIMENT`

Pipeline imports from this module — no public API change.

### 5. Add filter entry point

**Current:** `filter.ts` is pure and self-contained but has no package entry point.

**After:** Add `./filter` entry point exporting `parseFilter`, `matchesFilter`, `sortEntities`, `groupEntities`, and the `ParsedFilter` type.

-----

## Entry Points After Refactoring

```json
{
  ".":               "./dist/index.js",
  "./scanner":       "./dist/scanner.js",
  "./cli-plugin":    "./dist/cli-plugin.js",
  "./diff":          "./dist/diff.js",
  "./filter":        "./dist/filter.js",
  "./relationships": "./dist/relationships.js",
  "./cards":         "./dist/cards.js"
}
```

**Edge-safe** (zero Node.js imports): `./diff`, `./filter`, `./relationships`, `./cards`

**Node-dependent** (unchanged): `.`, `./scanner`, `./cli-plugin`

Edge consumers that need `parseFileContent` or `scanPlanSources` can import from `./scanner-core` (new internal entry point) or rely on bundler tree-shaking from `./scanner`. The safest approach for edge runtimes is the explicit sub-entry points.

-----

## Backwards Compatibility

- All existing imports continue to work unchanged
- The main entry point (`.`) still exports the full package with pipeline hooks
- `./scanner` still exports all scanner functions including filesystem ones
- `./cli-plugin` is unchanged
- The pipeline hooks internally call extracted modules but the public API is identical
- No function signatures, return types, or behaviours change

-----

## Out of Scope

- Changing the pipeline's public API
- Refactoring the CLI commands
- Modifying rune tag definitions
- Adding new rune types
- New features to the extracted modules (branch grouping, new relationship kinds, etc.)
- Making the main entry point (`.`) edge-safe — it re-exports `planPipelineHooks` which will remain Node-dependent

-----

## References

- {% ref "SPEC-021" /%} — Plan Runes (the rune system being refactored)
- {% ref "SPEC-022" /%} — Plan CLI (unchanged by this work)
- {% ref "SPEC-038" /%} — Git-Native Entity History (history module being split)

{% /spec %}
