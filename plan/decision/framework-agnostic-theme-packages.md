{% decision id="ADR-009" status="proposed" date="2026-04-05" tags="themes, architecture, transform, astro, svelte" %}

# Framework-agnostic theme packages

## Context

Themes currently export per-framework adapter files. Lumina has six framework-specific entry points:

- `@refrakt-md/lumina/svelte` → exports `SvelteTheme`
- `@refrakt-md/lumina/html` → exports `HtmlTheme`
- `@refrakt-md/lumina/astro` → exports `AdapterTheme`
- `@refrakt-md/lumina/nuxt` → exports `AdapterTheme`
- `@refrakt-md/lumina/next` → exports `AdapterTheme`
- `@refrakt-md/lumina/eleventy` → exports `AdapterTheme`

The four non-Svelte adapter files are character-for-character identical — they assemble a `{ manifest, layouts }` object from the same inputs. The Svelte file adds `components` and `elements`, but both of those are re-exported from `@refrakt-md/svelte`, not defined by Lumina:

```ts
// lumina/svelte/registry.ts — just re-exports
export { registry } from '@refrakt-md/svelte';

// lumina/svelte/elements.ts — just re-exports
export { elements } from '@refrakt-md/svelte';
```

What Lumina *actually* owns:
- `manifest.json` — theme metadata, layout region declarations, dark mode config
- CSS — design tokens, rune styles, global styles
- Transform config — icon SVG overrides, rune config extensions
- Layout declarations — which regions each layout name supports

What Lumina *doesn't* own but currently assembles:
- `LayoutConfig` objects (`defaultLayout`, `docsLayout`, `blogArticleLayout`) — these come from `@refrakt-md/transform`
- Component registry — re-exported from `@refrakt-md/svelte`
- Element overrides — re-exported from `@refrakt-md/svelte`

This creates a maintenance burden: every new theme must create 6+ adapter files (growing with each new framework), most of which are boilerplate assembly of framework-agnostic inputs. Every new framework adapter requires updating every existing theme.

### Theme taxonomy

Themes fall into two distinct categories with fundamentally different relationships to frameworks:

**Neutral themes** (like Lumina) rely entirely on the identity transform — BEM classes, structural elements, data attributes — plus vanilla JS behaviors for interactivity and pure CSS for styling. They work with *every* adapter out of the box because they contain zero framework code. Users override individual runes with their own framework components via ADR-008's per-rune component override mechanism.

**Framework themes** ship actual framework components (React, Svelte, Vue) as rune overrides for deeper visual customization — animations, complex interactions, framework-specific patterns. These themes target a **single framework** because maintaining the same rich component across both React and Svelte is impractical. The frameworks are too different for cross-framework component parity to be a realistic goal. A "React theme" ships React components, period.

Astro is the one exception where a framework theme could theoretically mix component frameworks (e.g., `.astro` components for static runes + React islands for interactive ones), but even there the theme would target Astro specifically, not Astro-plus-React-plus-Svelte.

This taxonomy has an important implication: **neither category needs per-framework adapter files.** Neutral themes have no framework knowledge at all — the adapter should assemble the theme object from generic exports. Framework themes target exactly one framework — they don't need adapter files for the other five.

### How theme resolution works today

The SvelteKit plugin reads `refrakt.config.json`, computes `${config.theme}/${config.target}` (e.g., `@refrakt-md/lumina/svelte`), and generates a virtual module that imports the theme's adapter file:

```ts
// virtual:refrakt/theme
import { theme as _base } from '@refrakt-md/lumina/svelte';
export const theme = { ..._base, manifest: { ..._base.manifest, routeRules: [...] } };
```

The theme adapter file is responsible for assembling the complete theme object. The plugin then layers on `routeRules` from site config and component overrides.

## Options Considered

### 1. Status quo — themes export per-framework adapters

Each theme ships `{theme}/svelte`, `{theme}/astro`, etc.

**Pros:**
- Works today
- Theme authors have full control over what each adapter receives

**Cons:**
- N themes × M frameworks = N×M adapter files, mostly boilerplate
- Adding a new framework requires updating every theme
- Adding a new theme requires writing adapter files for every framework
- Lumina's adapter files are 90%+ identical — real customization is near zero

### 2. Themes export generic parts, adapters assemble theme objects

Themes export only framework-agnostic artifacts:
- `manifest.json` — metadata, layout regions, dark mode config
- CSS — tokens, rune styles (already framework-agnostic)
- Transform config — icon overrides, rune config extensions (already framework-agnostic)
- Layout map — layout name → `LayoutConfig` object

The adapter or framework plugin reads the manifest and assembles the theme object:
- For HTML-rendering adapters: `{ manifest, layouts }` from manifest + layout map
- For SvelteKit: `{ manifest, layouts, components, elements }` from manifest + layout map + the framework's default registries

Framework themes that ship actual components declare their target framework in the manifest. The corresponding adapter loads the components; other adapters fall back to identity transform rendering (the theme degrades gracefully rather than failing).

**Pros:**
- Neutral themes are purely declarative — no framework knowledge
- Framework themes declare one target, not N adapter files
- Adding a new framework requires zero changes to existing themes
- Adding a new theme requires zero adapter boilerplate
- Clear separation: themes define *what*, adapters define *how*

**Cons:**
- Layout resolution needs a new mechanism — the adapter must know how to map layout names to `LayoutConfig` objects
- Framework themes need a way to declare their components — but this is already solved by the manifest's `components` field and ADR-008's override mechanism

### 3. Themes export a single generic adapter, frameworks consume it

A middle ground: themes export one entry point (`{theme}/adapter` or just `{theme}`) that provides the generic parts, and each framework adapter wraps it.

```ts
// @refrakt-md/lumina/adapter
export { default as manifest } from './manifest.json';
export { themeConfig } from './src/config.js';
// CSS is consumed via package imports, not via JS exports
```

The framework plugin or adapter imports from this single entry point and assembles the theme object.

**Pros:**
- Single entry point per theme instead of N
- Still allows theme-specific customization if needed
- Less radical change to current structure

**Cons:**
- Themes still need to know they should export an "adapter" entry
- Doesn't fully eliminate the coupling — just reduces it from N to 1

### 4. Convention-based discovery with explicit override

The adapter reads the theme's `package.json` exports and `manifest.json` to discover what the theme provides, assembling the theme object by convention. Themes can optionally override this by providing a `{theme}/{framework}` entry point.

**Pros:**
- Zero-config for simple themes
- Escape hatch for advanced themes that need per-framework customization
- Backwards compatible — existing per-framework exports continue to work

**Cons:**
- Two resolution paths to maintain
- Convention-based discovery needs clear documentation

## Layout Resolution

A key sub-question: how does the adapter know which `LayoutConfig` to use for each layout name?

Today, Lumina hardcodes this mapping:

```ts
layouts: {
    default: defaultLayout,
    docs: docsLayout,
    'blog-article': blogArticleLayout,
}
```

These `LayoutConfig` objects are framework-agnostic (defined in `@refrakt-md/transform/layouts.ts`). The manifest declares which layout *names* exist and their *regions*, but doesn't reference the `LayoutConfig` objects.

Possible approaches:

**A. Manifest references layout configs by well-known name.** The manifest declares `"default": { "config": "default" }`, and the adapter resolves `"default"` to `defaultLayout` from transform. A registry of well-known layout configs lives in transform.

**B. Theme exports a layout map alongside the manifest.** The theme's generic entry point exports `{ manifest, layouts }` where `layouts` maps names to `LayoutConfig` objects. This is what the theme adapters do today, just without the per-framework wrapper.

**C. Layout configs are declared in the manifest itself.** The manifest's layout definitions include enough information for the adapter to construct `LayoutConfig` objects. This requires making `LayoutConfig` serializable (currently it has function references like `postTransform`).

**D. Layout configs are resolved by naming convention.** The adapter looks for `{theme}/layouts/{name}.js` and imports the `LayoutConfig` from each. Themes that don't provide custom layout configs get the defaults from transform.

Approach B is the simplest migration path and doesn't require changes to the manifest format. Approach A is cleaner long-term but requires a layout registry. Approach D offers the most flexibility but adds import resolution complexity.

## Open Questions

1. ~~**Custom layout components.**~~ **Resolved.** Themes provide `LayoutConfig` objects generically. The `SvelteTheme.layouts` field supports both `Component<any> | LayoutConfig`, so a theme that truly needs a custom Svelte layout component can provide it via an escape hatch override — but this is a rare, advanced case. Most themes (including all neutral themes) use declarative layouts. Framework themes that want custom layout components would declare them via their target framework's conventions.

2. ~~**Component registry and element overrides.**~~ **Resolved.** The framework adapter provides default `components` and `elements` (from `@refrakt-md/svelte` for SvelteKit, from the future `@refrakt-md/react` for Next.js, etc.). The theme doesn't touch these for neutral themes — Lumina's current re-exports prove it. Framework themes declare component overrides in their manifest's `components` field or via a framework-specific entry point, and the adapter merges them. This is already how `virtual:refrakt/theme` works (it merges `config.overrides` from `refrakt.config.json`). The same mechanism works for theme-level overrides.

3. ~~**CSS entry points.**~~ **Resolved.** The SvelteKit plugin's `virtual:refrakt/tokens` module imports theme CSS via `{theme}/base.css` and `{theme}/styles/runes/{block}.css`. This already works without per-framework adapters. No change needed.

4. ~~**Theme config (icon overrides, rune extensions).**~~ **Resolved.** Currently imported via `{theme}/transform`. This is already framework-agnostic. No change needed.

5. ~~**Framework theme component loading.**~~ **Resolved.** No new mechanism needed. The manifest's `components` field already maps typeof names to `ComponentDefinition` objects with component paths. Today it's empty for Lumina (`"components": {}`). A framework theme populates it:

   ```json
   {
     "name": "Aurora",
     "target": "react",
     "components": {
       "Recipe": { "component": "./components/Recipe.tsx" },
       "Tabs": { "component": "./components/Tabs.tsx" }
     }
   }
   ```

   The adapter's virtual module generator reads `manifest.components`, resolves paths relative to the theme package (e.g., `./components/Recipe.tsx` → `@refrakt-md/aurora/components/Recipe.tsx`), and generates imports — the same pattern the SvelteKit plugin already uses for site-level `overrides`. Three layers of component declarations, each overriding the previous:

   ```
   Framework defaults (from @refrakt-md/svelte registry)
       ↑ overridden by
   Theme components (from manifest.components)
       ↑ overridden by
   Site overrides (from refrakt.config.json overrides)
   ```

   This preserves the user's ability to override any theme component at the site level, regardless of whether the theme is neutral or framework-specific.

6. **Astro mixed-framework themes.** An Astro theme could theoretically use `.astro` components for static runes and React/Svelte islands for interactive ones. This is a single-framework theme (Astro) that happens to use multiple component technologies internally. The manifest would declare `target: "astro"` and list component paths — the Astro adapter handles the island rendering mechanics. No special framework-agnostic support needed.

## Decision

*Proposed but not yet accepted — needs discussion.*

**Option 2: Themes export generic parts, adapters assemble theme objects.** Combined with layout resolution approach B (theme exports a layout map alongside the manifest).

A theme package would export:

```
{theme}/manifest.json    — metadata, layout regions     (exists today)
{theme}/base.css         — tokens + globals              (exists today)
{theme}/styles/runes/    — per-rune CSS                  (exists today)
{theme}/transform        — icon overrides, config        (exists today)
{theme}/layouts          — layout name → LayoutConfig    (NEW: replaces per-framework layout maps)
```

The new `{theme}/layouts` entry point replaces the per-framework adapter files:

```ts
// @refrakt-md/lumina/layouts
import { defaultLayout, docsLayout, blogArticleLayout } from '@refrakt-md/transform';
export const layouts = { default: defaultLayout, docs: docsLayout, 'blog-article': blogArticleLayout };
```

Each adapter assembles the theme object by reading the manifest and layout map:

```ts
// Inside the SvelteKit plugin's virtual module
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
import { registry, elements } from '@refrakt-md/svelte';

export const theme = { manifest, layouts, components: registry, elements };
```

For HTML-rendering adapters, the same pattern without components/elements:

```ts
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';

const theme = { manifest, layouts };
renderPage({ theme, page });
```

## Rationale

Themes naturally fall into two categories — neutral and framework-specific — and neither needs per-framework adapter files.

**Neutral themes** (like Lumina) rely entirely on the identity transform, vanilla JS behaviors, and CSS. They have zero framework code. Asking them to maintain adapter files for every framework is pure overhead — the files are identical boilerplate. Even the Svelte adapter file just re-exports framework defaults that Lumina doesn't own. A neutral theme should export its manifest, CSS, layout configs, and icon overrides. The adapter assembles the rest.

**Framework themes** target a single framework by design. A React theme ships React components; nobody would maintain the same rich component in both React and Svelte. These themes don't need adapter files for the other five frameworks — they declare their target in the manifest, ship their components, and the corresponding adapter loads them. Other adapters fall back to identity transform rendering.

The maintenance cost of N×M adapter files is already visible with one theme and six frameworks — and both numbers will grow. Eliminating these files makes theme authoring simpler (one `layouts` export instead of six adapter files) and decouples theme evolution from framework evolution entirely.

Layout resolution via a dedicated `{theme}/layouts` export (Approach B) is the simplest migration path. It requires one new entry point per theme instead of removing six, and doesn't require manifest format changes or a layout registry.

## Consequences

1. **Neutral theme packages become simpler.** A minimal neutral theme needs: `manifest.json`, CSS files, and a `layouts` entry point. No framework knowledge, no per-framework adapter files. This is the common case — most themes will be neutral.

2. **Framework themes declare a single target.** A React theme sets `target: "react"` in its manifest, ships React components, and provides a `layouts` export. No adapter files for other frameworks. The adapter handles component loading; other adapters fall back to identity transform rendering (graceful degradation).

3. **Framework adapter code moves to the framework packages.** The SvelteKit plugin, Astro integration, etc. handle theme object assembly. This is where framework knowledge belongs.

4. **New frameworks require zero theme changes.** A new adapter (e.g., a future React renderer) assembles the theme object from the same generic exports. Neutral themes work immediately; framework themes targeting a different framework degrade to identity transform.

5. **Users customize via per-rune component overrides, not theme forks.** With ADR-008, a user on a neutral theme can override any rune with their own framework component via `refrakt.config.json`'s `overrides` field. This eliminates the main reason a theme might need framework-specific adapter files — rune customization happens at the site level, not the theme level.

6. **Existing themes need a minor migration.** Replace 6 per-framework adapter files with 1 `layouts` export. The per-framework files can continue to work as a fallback during migration.

7. **The Lumina Svelte adapter files (`registry.ts`, `elements.ts`, `manifest.json`) become unnecessary** since the framework adapter provides component and element defaults.

## References

- ADR-008 — Framework-native component interface (renderer architecture)
- SPEC-030 — Framework Adapter System (adapter packages)
- `packages/sveltekit/src/virtual-modules.ts` — current theme resolution
- `packages/lumina/svelte/index.ts` — current Svelte theme assembly
- `packages/transform/src/layouts.ts` — built-in layout configs
- `packages/svelte/src/theme.ts` — `SvelteTheme` type definition

{% /decision %}
