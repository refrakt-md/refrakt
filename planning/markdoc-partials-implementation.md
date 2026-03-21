# Markdoc Partials Implementation Plan

## Overview

Add support for Markdoc's native `{% partial %}` tag, enabling content authors to reuse common content fragments (CTAs, disclaimers, shared warnings, author bios) across pages without duplication.

**Syntax:**
```markdoc
{% partial file="cta.md" /%}
{% partial file="disclaimer.md" variables={product: "Pro"} /%}
```

**Location convention:** A single `_partials/` directory at the content root.
**Scope:** Core pipeline + Language Server + VS Code extension (browser editor deferred).

---

## Design Decisions

### Partial file location
- `_partials/` folder at content root only (e.g., `site/content/_partials/`)
- Files referenced by filename: `file="cta.md"` resolves to `_partials/cta.md`
- Subdirectories supported: `file="shared/cta.md"` resolves to `_partials/shared/cta.md`
- Partials are **not** regular pages — they have no routes, no frontmatter processing, no SEO extraction

### Resolution
- `file` attribute value is always relative to `_partials/`
- No relative path resolution from the including file (keeps it simple and predictable)
- Missing partial → Markdoc validation error (surfaced in diagnostics)

### Frontmatter
- Partials **do not** support frontmatter — they are pure content fragments
- If frontmatter is present, it's ignored (or optionally warned about)

### Runes in partials
- Yes — partials go through normal Markdoc transform, so runes work inside them

---

## Phase 1: Core Pipeline

### 1.1 Extend ContentTree to discover partials

**File:** `packages/content/src/content-tree.ts`

- Add `partials` field to `ContentDirectory` (only populated on root)
- In `readDirectory()`, detect `_partials` directory and read its `.md` files into a separate map
- Exclude `_partials/` from regular page traversal (it already skips dot-dirs; add skip for `_partials`)
- New type and generator:

```typescript
export interface PartialFile {
  /** Key used in Markdoc config.partials (e.g., "cta.md" or "shared/cta.md") */
  name: string;
  /** Absolute file path */
  filePath: string;
  /** Raw markdown content */
  raw: string;
}

// On ContentTree:
partials(): Map<string, PartialFile>
```

- New static method or extension to `fromDirectory()` that also scans `_partials/` at the root level
- Parse each partial with `Markdoc.parse()` to produce AST nodes

### 1.2 Pass partials to Markdoc transform config

**File:** `packages/content/src/site.ts`

- After building the content tree, collect partials:
  ```typescript
  const partialFiles = tree.partials();
  const partials: Record<string, Node> = {};
  for (const [name, partial] of partialFiles) {
    partials[name] = Markdoc.parse(partial.raw);
  }
  ```
- Extend `transformContent()` signature to accept `partials` parameter
- Add `partials` to the Markdoc config object:
  ```typescript
  const config = {
    tags: mergedTags,
    nodes,
    variables: { ... },
    partials,  // <-- new
  };
  ```

### 1.3 Export partials from loadContent

**File:** `packages/content/src/site.ts`

- Add `partials` to the `Site` interface so downstream consumers (Vite plugin, editor) can access the partial map
- This enables HMR and tooling to know which partials exist

```typescript
export interface Site {
  // ... existing fields
  /** Parsed partial files from _partials/ directory */
  partials: Map<string, PartialFile>;
}
```

### 1.4 Update ContentTree to exclude _partials from pages

**File:** `packages/content/src/content-tree.ts`

- In `readDirectory()`, when encountering a directory named `_partials`, read it into the partials map instead of recursing into it as a regular content directory
- This prevents partials from being treated as routable pages

---

## Phase 2: SvelteKit Vite Plugin (HMR)

### 2.1 Watch _partials/ for changes

**File:** `packages/sveltekit/src/plugin.ts`

- In `setupContentHmr()`, the watcher already watches `.md` files in the content directory
- `_partials/` is inside the content directory, so file changes are already detected
- However, a partial change should trigger a **full rebuild** (since any page could use it)
- Add logic: if changed file path includes `_partials/`, trigger full content reload rather than single-page HMR

### 2.2 Pass partials through the build

- The `loadContent()` call in `buildStart` already handles this if Phase 1 is complete
- No additional changes needed — partials flow through automatically

---

## Phase 3: Language Server

### 3.1 Track partial files in the registry

**File:** `packages/language-server/src/registry/loader.ts`

- Add a `partials` registry alongside the rune registry
- On `initializeRegistry(workspaceRoot)`:
  - Find `_partials/` directory relative to the content root
  - Scan all `.md` files in it
  - Store names (relative paths within `_partials/`) in a `Set<string>` or `Map<string, string>` (name → absolute path)
- Export: `getPartialNames(): string[]` and `hasPartial(name: string): boolean`
- On workspace file changes, re-scan `_partials/`

### 3.2 Completion for partial file names

**File:** `packages/language-server/src/providers/completion.ts`

- In `completeAttributeValues()`, add special handling:
  - When `tagName === 'partial'` and `attrName === 'file'`:
    - Return completion items from `getPartialNames()`
    - Filter by `prefix` (what the user has typed so far)
    - Kind: `CompletionItemKind.File`
- This provides autocomplete inside `{% partial file="|" /%}`

### 3.3 Diagnostics for missing partials

**File:** `packages/language-server/src/providers/diagnostics.ts`

- After Markdoc validation, add a second pass:
  - Scan the document AST for `partial` tags
  - For each, extract the `file` attribute value
  - Check `hasPartial(name)` — if false, emit a Warning diagnostic:
    `"Partial file not found: 'missing.md'. Expected in _partials/ directory."`
  - Use `findSimilar()` pattern for typo suggestions if the name is close to an existing partial

### 3.4 Definition provider (go-to-definition)

**File:** `packages/language-server/src/providers/definition.ts` (new file)

- Register a `textDocument/definition` handler
- When cursor is on a `file="..."` value inside a `{% partial %}` tag:
  - Resolve the partial file path
  - Return a `Location` pointing to the partial file
- This enables Ctrl+Click / F12 navigation from usage to partial file

---

## Phase 4: VS Code Extension

### 4.1 Go-to-definition support

**File:** `packages/vscode/src/extension.ts`

- The language client already forwards LSP requests, so the definition provider from Phase 3.4 works automatically
- No additional extension code needed for basic go-to-definition

### 4.2 File watcher for _partials/

- The extension already watches `**/*.md` — partial files are covered
- Language server re-scans on file change notifications

### 4.3 Snippet for partial tag

**File:** `packages/vscode/snippets/runes.json`

- Add a snippet for the partial tag:
  ```json
  "Partial": {
    "prefix": "partial",
    "body": "{% partial file=\"${1}\" /${2}%}",
    "description": "Include a reusable content partial from _partials/"
  }
  ```

---

## Phase 5: Tests

### 5.1 Content tree tests

**File:** `packages/content/test/content-tree.test.ts` (new or extend existing)

- Test that `_partials/` directory is discovered and parsed
- Test that partials are excluded from regular pages
- Test subdirectory partials (e.g., `_partials/shared/cta.md` → name `shared/cta.md`)
- Test that missing `_partials/` directory is handled gracefully (empty map)

### 5.2 Transform integration tests

**File:** `packages/content/test/partials.test.ts` (new)

- Test that `{% partial file="test.md" /%}` correctly includes partial content
- Test variable passing: `{% partial file="test.md" variables={name: "World"} /%}`
- Test that runes work inside partials
- Test error on missing partial file reference
- Test nested partials (partial including another partial)

### 5.3 Language server tests

- Completion: verify partial file names appear in `file=""` attribute completions
- Diagnostics: verify warning for missing partial references
- Definition: verify go-to-definition resolves to the correct partial file

---

## File Change Summary

| File | Change Type | Description |
|------|------------|-------------|
| `packages/content/src/content-tree.ts` | Modify | Add `PartialFile` type, `_partials/` scanning, exclude from pages |
| `packages/content/src/site.ts` | Modify | Load partials, pass to `transformContent()`, add to `Site` interface |
| `packages/sveltekit/src/plugin.ts` | Modify | Full reload on partial file change |
| `packages/language-server/src/registry/loader.ts` | Modify | Add partial file registry |
| `packages/language-server/src/providers/completion.ts` | Modify | Add `file=""` attribute completion for partials |
| `packages/language-server/src/providers/diagnostics.ts` | Modify | Add missing-partial warning |
| `packages/language-server/src/providers/definition.ts` | New | Go-to-definition for partial file references |
| `packages/vscode/snippets/runes.json` | Modify | Add partial snippet |
| `packages/content/test/partials.test.ts` | New | Integration tests |

---

## Implementation Order

1. **Content tree** — discover and parse `_partials/` (foundation for everything)
2. **Site loader** — wire partials into Markdoc config (makes partials functional)
3. **Tests** — verify core functionality works
4. **Vite plugin HMR** — full reload on partial changes
5. **Language server registry** — track partial file names
6. **LSP completion** — autocomplete `file=""` values
7. **LSP diagnostics** — warn on missing partials
8. **LSP definition** — go-to-definition for partial files
9. **VS Code snippet** — convenience snippet

Steps 1-3 are the MVP. Steps 4-9 are the tooling layer.

---

## Future Considerations (out of scope)

- **Browser editor integration**: Show partial content inline in block editor, enable editing partials from the editor UI
- **Nested _partials/ directories**: Allow `_partials/` at any content directory level with cascading resolution
- **Partial usage tracking**: Show which pages use a given partial (reverse index)
- **Variables + Conditionals bundle**: The gap analysis recommends implementing partials alongside content variables and conditionals as a feature cluster
