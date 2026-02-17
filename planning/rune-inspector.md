# Rune Inspector — Transformation Pipeline Debugger for VS Code

> **Packages:** `@refrakt-md/vscode`, `@refrakt-md/language-server`
> **Status:** Draft

---

## Context

When authoring runes, there's no way to see what the rune actually produces at each pipeline stage. Authors write Markdown inside `{% hero %}` and hope it transforms correctly. A "Rune Inspector" tree view in VS Code would show the transformation output at every stage, updating live as the cursor moves between runes.

This requires a prerequisite: relocating `serialize()` from `@refrakt-md/svelte` to `@refrakt-md/runes` so the language server can use it without depending on a framework-specific package. The identity transform uses `createTransform()` from `@refrakt-md/transform` with theme config discovered dynamically from `refrakt.config.json`.

---

## Decisions

1. **Display**: Tree View sidebar (always visible, native VS Code feel, auto-updates on cursor move)
2. **Pipeline stages**: All 4 — AST, Rune Transform, Serialized, Identity Transform
3. **serialize() relocation**: Move from `@refrakt-md/svelte` to `@refrakt-md/runes`, re-export for backward compatibility
4. **Theme-agnostic**: Language server reads `refrakt.config.json` and dynamically imports `${theme}/transform` — works with any theme, not just Lumina

---

## Prerequisites

### Move `serialize()` to `@refrakt-md/runes`

The function (24 lines, only depends on `@markdoc/markdoc`) currently lives in `packages/svelte/src/serialize.ts`. It has nothing Svelte-specific.

**Files to change:**

| File | Action |
|------|--------|
| `packages/runes/src/serialize.ts` | **Create** — copy `serialize()` and `serializeTree()` from svelte package |
| `packages/runes/src/index.ts` | Export `serialize`, `serializeTree` |
| `packages/svelte/src/serialize.ts` | Change to re-export from `@refrakt-md/runes` |
| `packages/svelte/src/index.ts` | No change — still exports serialize (now re-exported) |

Consumers (`site/src/routes/[...slug]/+page.server.ts`, `create-refrakt/template/...`) continue importing from `@refrakt-md/svelte` unchanged.

---

## Implementation

### 1. Language Server — New dependencies

Add to `packages/language-server/package.json`:
```json
"@refrakt-md/transform": "0.4.0"
```

Note: `@refrakt-md/runes` is already a dependency (provides `serialize()` after relocation). Theme config is dynamically imported at runtime — no hard dependency on any specific theme.

### 2. Language Server — Debug provider

**Create** `packages/language-server/src/providers/inspector.ts`

Core function: given a document URI and cursor position, run the full pipeline on the rune at the cursor and return structured debug output for all 4 stages.

```typescript
interface InspectorResult {
  runeName: string;
  stages: {
    ast: object;        // Markdoc AST node for the rune
    transform: object;  // Markdoc.transform() output (typeof markers, meta, refs)
    serialized: object; // serialize() output (plain JSON)
    identity: object;   // createTransform(config)() output (BEM classes, structure)
  };
}
```

**Pipeline execution:**
1. `Markdoc.parse(document.getText())` — get full AST
2. Find the rune AST node at cursor position
3. `Markdoc.transform(ast, { tags, nodes })` — run rune schemas (tags/nodes from registry)
4. Find the corresponding renderable node by matching typeof/position
5. `serialize()` — convert Tag instances to plain objects
6. Discover theme: read `refrakt.config.json` from workspace root, dynamically import `${theme}/transform`
7. `createTransform(themeConfig)()` — apply identity transform
8. Return all 4 stages

**Theme discovery** (mirrors `packages/sveltekit/src/plugin.ts` pattern):
```typescript
const configPath = path.join(workspaceRoot, 'refrakt.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const themeTransform = await import(`${config.theme}/transform`);
const themeConfig = themeTransform.luminaConfig ?? themeTransform.default;
const transform = createTransform(themeConfig);
```

If theme config can't be loaded (no config file, theme not installed), stage 4 is skipped gracefully with a message.

### 3. Language Server — Custom LSP request

**Edit** `packages/language-server/src/server.ts`

Register a custom request handler:
```typescript
connection.onRequest('refrakt/inspectRune', async (params: { uri: string; position: Position }) => {
  return inspectRuneAtPosition(documents, params.uri, params.position);
});
```

### 4. VS Code Extension — Tree View

**Edit** `packages/vscode/package.json` — add contributions:
```json
"views": {
  "explorer": [{
    "id": "refraktRuneInspector",
    "name": "Rune Inspector",
    "when": "resourceLangId == markdown"
  }]
},
"commands": [{
  "command": "refrakt.inspectRune",
  "title": "Inspect Rune at Cursor",
  "category": "Refrakt"
}]
```

**Create** `packages/vscode/src/inspector.ts` — TreeDataProvider implementation:
- Registers as the data provider for the `refraktRuneInspector` view
- Listens to `onDidChangeTextEditorSelection` and `onDidChangeActiveTextEditor`
- On cursor change: sends `refrakt/inspectRune` request to language server
- Builds tree items from the `InspectorResult`:

```
RUNE INSPECTOR (hero)
├── AST
│   └── tag: hero [align="center"]
│       ├── heading: "Hello World"
│       └── paragraph: "Welcome to..."
├── Transform
│   └── typeof: Hero
│       ├── properties: headline, blurb, image
│       ├── refs: actions
│       └── meta: align → "center"
├── Serialized
│   └── article [typeof="Hero"]
│       ├── meta [property="align"]
│       ├── header
│       └── div [data-name="actions"]
└── Identity Transform
    └── article.rf-hero.rf-hero--center
        ├── div.rf-hero__header
        │   ├── h1.rf-hero__headline
        │   └── p.rf-hero__blurb
        └── div.rf-hero__actions
```

Tree items have:
- **Icons**: different for each stage and node type (tag, attribute, text, meta)
- **Description**: key attributes shown inline (typeof, class, data-name)
- **Tooltip**: full JSON representation of the node (shown on hover)
- **Context menu**: "Copy as JSON" for any node

**Edit** `packages/vscode/src/extension.ts` — register the tree view provider and wire up cursor tracking.

### 5. Debouncing & Performance

- Debounce cursor change events (300ms) to avoid hammering the language server
- Cache the last inspect result per document — only re-run if the document changed or cursor moved to a different rune
- The language server should detect "cursor is on the same rune as last time" and return cached results

---

## Files Summary

| File | Action |
|------|--------|
| `packages/runes/src/serialize.ts` | **Create** — relocate serialize/serializeTree |
| `packages/runes/src/index.ts` | Add serialize exports |
| `packages/svelte/src/serialize.ts` | Re-export from `@refrakt-md/runes` |
| `packages/language-server/package.json` | Add `@refrakt-md/transform` dependency |
| `packages/language-server/src/providers/inspector.ts` | **Create** — pipeline execution + InspectorResult |
| `packages/language-server/src/server.ts` | Add `refrakt/inspectRune` custom request handler |
| `packages/vscode/package.json` | Add tree view contribution + command |
| `packages/vscode/src/inspector.ts` | **Create** — TreeDataProvider for Rune Inspector |
| `packages/vscode/src/extension.ts` | Register tree view, cursor tracking |

---

## Verification

1. `npm run build` — all packages compile (especially runes, svelte, language-server, vscode)
2. `npm test` — existing serialize tests still pass
3. Open a `.md` file with runes in VS Code with the extension loaded
4. Place cursor inside a `{% hero %}` block
5. Verify the Rune Inspector tree view shows all 4 stages with correct output
6. Move cursor to a different rune — tree updates
7. Move cursor outside any rune — tree shows "No rune at cursor"
8. Test with no `refrakt.config.json` — Stage 4 shows "Theme not found" gracefully
