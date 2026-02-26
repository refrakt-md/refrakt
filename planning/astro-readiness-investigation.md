# Astro Readiness Investigation

## Context

Refrakt currently targets SvelteKit as its only framework. This investigation examines whether the architecture is ready for Astro as the next supported framework — what's reusable, what needs building, and whether there are blockers.

## Verdict: Ready

The architecture is in excellent shape for Astro. The heavy lifting has already been done — the layout transform migration, the empty component registry, and the web component strategy mean that **no core changes are needed**. What remains is a thin adapter layer.

---

## What's Already Framework-Agnostic (reusable as-is)

| Package | Status | Evidence |
|---------|--------|----------|
| `@refrakt-md/types` | Fully agnostic | Pure TS interfaces, `SerializedTag` is plain JSON-safe objects |
| `@refrakt-md/transform` | Fully agnostic | Zero framework imports. `createTransform()`, `layoutTransform()`, `renderToHtml()` all work anywhere |
| `@refrakt-md/runes` | Fully agnostic | 52 rune schemas, depends only on types + Markdoc |
| `@refrakt-md/content` | Fully agnostic | Content loading, routing, layout cascade — pure Node.js + Markdoc |
| `@refrakt-md/behaviors` | Fully agnostic | Vanilla JS behaviors + 4 web components (`rf-diagram`, `rf-nav`, `rf-map`, `rf-sandbox`). SSR-safe via `SafeHTMLElement` |
| `@refrakt-md/highlight` | Fully agnostic | Shiki-based tree transform |
| `@refrakt-md/theme-base` | Core is agnostic | `baseConfig` (74 runes), layout configs (`defaultLayout`, `docsLayout`, `blogArticleLayout`) — pure data. Svelte peer dep is optional, only for `svelte/` subpath |
| `@refrakt-md/lumina` CSS | Fully agnostic | All CSS in `styles/runes/`, tokens in `tokens/` — no framework coupling |

### Key architectural wins already in place

1. **Empty component registry** (`packages/theme-base/svelte/registry.ts`): All runes render through identity transform. Interactive runes use web components or vanilla JS behaviors. Zero Svelte components needed for rune rendering.

2. **Layout transform implemented** (`packages/transform/src/layout.ts`): Three declarative `LayoutConfig` objects replace the three Svelte layout components. `layoutTransform()` produces a complete `SerializedTag` tree — any renderer can walk it.

3. **`renderToHtml()` exists** (`packages/transform/src/html.ts`): A pure-JS function that renders `SerializedTag` → HTML string. Handles void elements, `data-codeblock` raw HTML, attribute escaping. Could serve as Astro's renderer (Astro is primarily SSR).

4. **Route rule matching is portable** (`packages/svelte/src/route-rules.ts`): `matchRouteRule()` is pure pattern matching — no Svelte dependency.

5. **Serialization is portable** (`packages/svelte/src/serialize.ts`): `serialize()` / `serializeTree()` convert Markdoc `Tag` class instances to plain `SerializedTag` objects. Could be moved to a shared package.

---

## What's Svelte-Specific (needs Astro equivalent)

### 1. Renderer (~90 lines of Svelte → ~60 lines of Astro or 0 lines)

`packages/svelte/src/Renderer.svelte` — recursive tree walker using `<svelte:element>`.

**Astro options:**
- **Option A — `Renderer.astro`**: Recursive `.astro` component using `Astro.self`. ~60 lines. Native Astro pattern.
- **Option B — Use `renderToHtml()` directly**: Since Astro is SSR-first and produces static HTML, call `renderToHtml()` and inject via `set:html`. Zero component needed. The function already handles all edge cases.

**Recommendation:** Option B for initial implementation — simpler, no recursive component concerns. Option A only becomes necessary if Astro needs per-element component interception (currently not needed since the registry is empty).

### 2. ThemeShell / Page wrapper (~140 lines of Svelte → ~50 lines of Astro)

`packages/svelte/src/ThemeShell.svelte` — layout selection, SEO head injection, behavior initialization.

**Astro equivalent:** A base layout (`BaseLayout.astro`) that:
- Calls `matchRouteRule()` to select layout config
- Calls `layoutTransform()` to produce the page tree
- Renders `<head>` with SEO tags (native HTML in Astro, no `<svelte:head>` needed)
- Injects behaviors via `<script>` tag (no hydration, no `$effect`)
- Sets `RfContext` for web components

This is **simpler in Astro** than in Svelte because Astro is MPA — no SPA cleanup, no `{#key}` blocks, no reactive effect lifecycle.

### 3. Astro Integration Plugin (~100 lines)

`packages/sveltekit/src/plugin.ts` — Vite plugin with virtual modules + content HMR.

**Astro equivalent:** An Astro integration (`packages/astro/src/integration.ts`) that:
- Reads `refrakt.config.json`
- Injects CSS (tokens + rune styles) via `injectScript` or Vite config
- Optionally does CSS tree-shaking at build time (same logic as SvelteKit plugin)
- Sets up content HMR (Astro has Vite under the hood — same watcher pattern)

Virtual modules may not be needed — Astro's integration API (`astro:config:setup`) can inject styles and scripts directly.

### 4. Lumina Astro Adapter (~35 lines)

`packages/lumina/svelte/index.ts` — theme object assembly.

**Astro equivalent:** `packages/lumina/astro/index.ts` — exports theme config (reuses `defaultLayout`, `docsLayout`, `blogArticleLayout` from theme-base), exports manifest, references CSS entry point.

Already planned in `internal-spec.md`: `@refrakt-md/lumina/astro -> (future) Astro adapter`

### 5. Element Overrides

`packages/theme-base/svelte/elements.ts` — Table and Pre Svelte components.

Already handled by `@refrakt-md/behaviors` (copy button behavior, scroll wrapper) — no Astro component needed.

### 6. Serialization (`serialize.ts`)

Currently in `@refrakt-md/svelte` but framework-agnostic. Should move to `@refrakt-md/content` or `@refrakt-md/transform` so both adapters can use it.

---

## Blockers: None

There are no architectural blockers. Every Svelte-specific piece has a clear, simpler Astro equivalent.

## Risks

1. **`Astro.self` recursion depth** — Mitigated by using `renderToHtml()` instead.
2. **Content collection vs dynamic routing** — `getStaticPaths()` is the natural fit since `loadContent()` already produces all page data.
3. **Behavior initialization timing** — `initRuneBehaviors()` should work in a `<script>`. View Transitions would need `astro:page-load` event listener.

---

## Recommended Implementation Order

### Phase 1: Shared utilities extraction
- Move `serialize.ts` and `route-rules.ts` from `@refrakt-md/svelte` to `@refrakt-md/transform`
- Re-export from `@refrakt-md/svelte` for backward compatibility

### Phase 2: `@refrakt-md/astro` package
```
packages/astro/
├── src/
│   ├── integration.ts     # Astro integration (CSS injection, HMR)
│   ├── BaseLayout.astro   # Page wrapper (layout selection + SEO + behaviors)
│   ├── types.ts           # AstroTheme interface
│   └── index.ts           # Public exports
├── package.json           # peer dep: astro@^5.0.0
└── tsconfig.json
```

### Phase 3: `@refrakt-md/lumina/astro` adapter
```
packages/lumina/astro/
├── index.ts               # Theme assembly (reuses theme-base configs)
└── manifest.json          # Astro-specific manifest
```

### Phase 4: Example site / smoke test
- Minimal Astro site using the same `site/content/` directory
- Validates all runes render correctly, behaviors attach, layouts work

---

## Estimated New Code

| Component | Lines | Complexity |
|-----------|-------|------------|
| Astro integration | ~100 | Low (port of SvelteKit Vite plugin) |
| BaseLayout.astro | ~50 | Low (simpler than ThemeShell.svelte) |
| Lumina/astro adapter | ~35 | Trivial (data assembly) |
| Shared utilities move | ~20 | Trivial (re-exports) |
| **Total** | **~205** | **Low** |

Compare to framework-agnostic code being reused: ~15,000+ lines across transform, runes, content, behaviors, highlight, theme-base, and lumina CSS.
