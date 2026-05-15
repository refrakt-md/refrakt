{% spec id="SPEC-048" status="accepted" tags="theme, tokens, config, lumina, dark-mode, syntax-highlighting" %}

# Design tokens contract & config

Promote refrakt's design tokens from an implicit set of CSS custom properties owned by Lumina into a typed, theme-agnostic **contract** — so any theme can supply values for the same names, sites can override tokens declaratively in `refrakt.config.json`, presets become shareable data, dark mode is part of the same surface (not a separate CSS file), and the syntax-highlighting surface stops leaking the underlying highlighter (`--shiki-*` → `--rf-syntax-*`).

## Problem

Today the design token surface is defined entirely as CSS custom properties in `packages/lumina/tokens/base.css` (~71 variables across typography, color, radius, spacing, shadow, code, and syntax). Customization means writing a stylesheet that redefines `--rf-*` vars after Lumina's are loaded. That works for hand-built sites, but has four real costs:

**No machine-readable description of what runes depend on.** The "contract" between runes and themes is implicit — you have to read Lumina's CSS and the per-rune stylesheets in `packages/lumina/styles/runes/` to know which variables are required. A custom theme has no schema to type its tokens against; a hosted UI has no field list to render; an AI agent customizing a site has nothing to validate against.

**Hosted environments can't customize via CSS.** A "tweak your brand colors" form in a hosted dashboard can't ship arbitrary CSS to the build. It needs a structured config it can serialize, validate, and re-render — exactly what `refrakt.config.json` already does for plugins.

**Presets aren't shareable.** A "warm" or "high-contrast" variant means forking the CSS file. There's no way for a theme to ship a few starting points users can opt into, or for users to combine "Lumina + warm preset + my three overrides" without manual CSS work.

**The highlighter is leaking into the public token surface.** Eleven `--shiki-*` variables sit in `base.css` alongside `--rf-*` tokens. Per-rune CSS in `packages/lumina/styles/` reads them directly, which means swapping Shiki for Prism, Starry Night, or a server-side alternative is a breaking change for every downstream theme and any custom user CSS.

**Dark mode is a parallel CSS file with no typed surface.** `packages/lumina/tokens/dark.css` duplicates ~30 tokens twice — once under `[data-theme="dark"]` for explicit toggles, once under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` for system preference. Custom themes that want dark mode have to author the same duplicated CSS by hand; sites can't override a single dark-mode color via config; presets can't ship a coordinated light + dark pair. Treating dark as out-of-band keeps the contract permanently incomplete.

-----

## Design Principles

**The contract is universal, the values are themed.** The names runes depend on (`color.primary`, `radius.md`, `syntax.keyword`, ...) belong in `@refrakt-md/types`. Lumina supplies one set of values; other themes supply theirs. A theme is not required to use Lumina to be valid — it just needs to cover the contract.

**Strict, with an explicit escape hatch.** Contract keys are enumerated and typed. Themes and sites can also write to `extra: Record<string, string>` for theme-specific tokens that don't fit the universal contract. Strictness on the named surface keeps validation, hosted UIs, and AI tooling tractable; `extra` keeps the system non-precious.

**Config is sugar over CSS, not a replacement.** `theme.tokens` in `refrakt.config.json` compiles to a `:root { --rf-* }` stylesheet at build time. That stylesheet is injected after the theme's base CSS and before any user CSS, so power users can still drop a stylesheet to access anything CSS can do that config can't — `color-mix()`, media queries, scoped overrides. We don't try to model those in JSON.

**Presets are plain data.** A preset is a `ThemeTokensConfig` exported from a module — base tokens plus any mode overlays it wants to contribute. There's no preset registry, no runtime hook, no lifecycle — just an object that gets merged in order with other presets and user overrides. Lumina ships a couple as a starting point; any theme can ship its own.

**Highlighter is an implementation detail.** Rune CSS reads `--rf-syntax-*`. The Shiki integration writes those names (via its `cssVariablePrefix` / themed-tokens config) or maps internally — either way, the public surface is highlighter-agnostic.

**Modes are partials over the base, not parallel contracts.** Dark mode (and any future mode — high-contrast, sepia, print) is a `PartialTokenContract` overlay applied to a scoped CSS selector. Modes never have their own contract shape — they reuse `TokenContract` so the type system and validator work uniformly. Authors only specify the tokens that differ from the base; everything else inherits via CSS variable cascade.

**The site's initial mode is configurable, not hard-coded.** Today refrakt sites have no way to express "this is a dark-only site" or "default to light, ignore the user's system preference" — the OS preference always wins (via the `prefers-color-scheme` media query) unless the author writes their own script to set `data-theme` on `<html>`. A `theme.colorScheme` field on the config picks the initial state explicitly. The toggle UI itself (a button users click to switch at runtime) remains out of scope; this controls only the SSR-emitted attribute on `<html>`.

-----

## Authoring Surface

### Config

`refrakt.config.json`:

```json
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": ["@refrakt-md/lumina/presets/warm"],
    "colorScheme": "auto",
    "tokens": {
      "color": {
        "primary": "#7c3aed",
        "primary-hover": "#6d28d9",
        "text": "#0f172a"
      },
      "font": {
        "sans": "'Inter', system-ui, sans-serif"
      },
      "radius": {
        "md": "8px"
      },
      "extra": {
        "rf-hero-overlay": "rgba(15, 23, 42, 0.6)"
      }
    },
    "modes": {
      "dark": {
        "color": {
          "primary": "#a78bfa",
          "primary-hover": "#c4b5fd",
          "text": "#f1f5f9"
        }
      }
    }
  }
}
```

Layering order (last write wins, applied per scope):

1. Theme package's base tokens (e.g. Lumina's `base.css` values), plus the theme's own mode overlays
2. Each entry in `theme.presets[]` in declared order (preset can contribute to base **and** to any mode)
3. `theme.tokens` (site-specific base overrides) and `theme.modes` (site-specific mode overrides)
4. User-supplied CSS files imported after the generated stylesheet

Modes layer independently of the base: an override in `theme.tokens.color.primary` only changes the light value, even if `dark` is declared. To change both, write to both. This is intentional — a single-write-fixes-everything model would require derived-value rules (lighten/darken) we explicitly don't support in v1.

### Token contract shape

A typed nested object in `@refrakt-md/types`:

```ts
export interface TokenContract {
  font: { sans: string; mono: string };
  color: {
    text: string;
    muted: string;
    border: string;
    bg: string;
    primary: string;
    'primary-hover': string;
    'primary-scale': Record<'50' | '100' | '200' | '300' | '400' | '500'
      | '600' | '700' | '800' | '900' | '950', string>;
    surface: { base: string; hover: string; active: string; raised: string };
    info: { base: string; bg: string; border: string };
    warning: { base: string; bg: string; border: string };
    danger: { base: string; bg: string; border: string };
    success: { base: string; bg: string; border: string };
    code: { bg: string; text: string; 'inline-bg': string };
  };
  radius: Record<'sm' | 'md' | 'lg' | 'full', string>;
  spacing: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', string> & {
    section: Record<'base' | 'tight' | 'loose' | 'breathe', string>;
  };
  inset: Record<'flush' | 'tight' | 'loose' | 'breathe', string>;
  shadow: Record<'xs' | 'sm' | 'md' | 'lg', string>;
  syntax: {
    foreground: string;
    background: string;
    keyword: string;
    string: string;
    'string-expression': string;
    constant: string;
    comment: string;
    function: string;
    parameter: string;
    punctuation: string;
    link: string;
  };
  extra: Record<string, string>;
}

export type PartialTokenContract = DeepPartial<TokenContract>;

export interface ThemeTokensConfig {
  tokens?: PartialTokenContract;
  modes?: Record<string, PartialTokenContract>;
  colorScheme?: 'auto' | 'light' | 'dark' | (string & {});
}

export interface Preset extends ThemeTokensConfig {
  meta: {
    id: string;          // 'warm' — stable identifier referenced from theme.presets
    name: string;        // 'Warm Tones' — human-readable label for pickers
    description: string; // one-line summary
    tags?: string[];     // optional faceting: ['color'], ['typography', 'serif']
    preview?: {
      colors?: string[]; // 1–6 hex strings for swatch hints in a picker UI
    };
  };
}
```

`ThemeTokensConfig` is the shape shared by `theme` in `refrakt.config.json`, by every preset, and by what a theme package exports as its base. Same shape, different layer in the merge order. `colorScheme` is the only field that doesn't merge as a deep partial — it's a scalar; the last layer to declare it wins (typically the site config).

A companion runtime const `tokenContract` enumerates each leaf path and its CSS variable name, so `tokensToCss()` and validators don't need TypeScript reflection:

```ts
export const tokenContract = {
  'font.sans':              '--rf-font-sans',
  'color.primary':          '--rf-color-primary',
  'color.primary-scale.500':'--rf-color-primary-500',
  'spacing.section.tight':  '--rf-spacing-section-tight',
  'syntax.keyword':         '--rf-syntax-keyword',
  // ...one entry per leaf
} as const;
```

### Generated CSS

`tokensToCss(partial)` in `packages/transform/src/tokens.ts` produces:

```css
:root {
  --rf-color-primary: #7c3aed;
  --rf-color-primary-hover: #6d28d9;
  --rf-color-text: #0f172a;
  --rf-font-sans: 'Inter', system-ui, sans-serif;
  --rf-radius-md: 8px;
  --rf-hero-overlay: rgba(15, 23, 42, 0.6);  /* from extra */
}
```

Emitted in deterministic key order. Empty partial → empty `:root` block (suppressed). Keys under `extra` are emitted verbatim — they must begin with `--` or `rf-` and contain only `[a-zA-Z0-9-]`; otherwise validation rejects them at config-load time.

### Composing presets

Presets are partials all the way down — `ThemeTokensConfig.tokens` is `PartialTokenContract`, both `tokens` and `modes` are optional, and each can write only the keys it cares about. That's the point: a preset can scope itself to one concern (color, type, shape, dark-mode tone), and authors stack several to assemble a look.

```json
"theme": {
  "package": "@refrakt-md/lumina",
  "presets": [
    "warm",                                  // bare id — looked up in @refrakt-md/lumina's manifest
    "serif",                                 // bare id — same theme registry
    "@my-org/presets/brand-radii"            // contains '/' — loaded as a module path
  ],
  "tokens": {
    "color": { "primary": "#7c3aed" }        // last word: site override beats every preset
  }
}
```

Each preset only touches its keys; the rest cascades through from the prior layer (theme base → preset 1 → preset 2 → preset 3 → site `tokens`). Last write wins per key.

This makes presets composable in the way design systems usually want them:

- A "color theme" preset and a "typography" preset can be authored independently and combined without coordination.
- A dark-only preset (writes only `modes.dark`) layers cleanly on top of any base preset that doesn't customize dark.
- Site authors can pull a third-party preset for one concern (e.g. brand radii) without inheriting opinions on color or type.

The cost of partial presets is debuggability — when three presets all touch `color.primary`, "why is my primary purple?" becomes a layered question. `refrakt inspect --tokens` (see Tooling) annotates each resolved value with its source layer for exactly this reason.

### Discoverable presets

For hosted environments (and any UI that wants a preset picker), the active theme exposes its preset registry through its **manifest** — the same surface that already advertises the theme's name, version, and layout regions today. No new export path: the manifest is the canonical "what does this theme offer?" file, and presets are part of that.

```ts
// extension to packages/lumina/manifest.json
{
  "name": "Lumina",
  "version": "0.3.0",
  // ...existing fields
  "presets": [
    {
      "meta": {
        "id": "warm",
        "name": "Warm Tones",
        "description": "Amber primary with warm cream surfaces",
        "tags": ["color", "warm"],
        "preview": { "colors": ["#d97706", "#fbbf24", "#fef3c7"] }
      },
      "tokens": { "color": { "primary": "#d97706" /* ... */ } },
      "modes": { "dark": { "color": { "primary": "#fbbf24" /* ... */ } } }
    }
    // ...
  ]
}
```

A hosted UI does:

```ts
import manifest from '@refrakt-md/lumina/manifest';
// manifest.presets is Preset[] — render names, descriptions, color swatches
// On user selection, write back theme.presets: ['warm', 'serif'] in refrakt.config.json
```

`theme.presets` resolution rule:

- Entry **without** a `/` (e.g. `'warm'`) — look up `meta.id === 'warm'` in the active theme's `manifest.presets`. Validator errors if no match.
- Entry **with** a `/` (e.g. `'@my-org/presets/brand-radii'`) — load as a module specifier, expect the default export to be a `Preset`. Same as today's intuition for module paths.

Preset ids are part of the theme's public API — renaming `warm` → `amber` is a breaking change, same discipline as plugin names. The `tags` and `preview.colors` fields are advisory only; absent them, a UI can still render id + name + description.

Custom themes that want preset discoverability follow the same pattern: ship a `manifest.json` (or whatever JSON the theme already publishes) with a `presets` array typed as `Preset[]`. Themes without presets simply omit the field; existing themes don't break.

-----

## Modes & Dark Mode

A **mode** is a `PartialTokenContract` overlay applied to a scoped CSS selector. Modes share the contract shape with the base — same keys, same types, same validation — so the type system, validator, and tooling work uniformly across base and mode tokens. Authors only specify the tokens that differ from the base; everything else inherits via the CSS variable cascade.

### Conventional mode names

The contract reserves three conventional mode names:

- `dark` — emits both `[data-theme="dark"]` (explicit) and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` (system preference with explicit-light opt-out). This matches the dual-selector pattern Lumina ships today in `dark.css`.
- `light` — emits only `[data-theme="light"]`. No media query — light is the base. The selector exists so users can explicitly force light even when their system prefers dark.
- Any other key (e.g. `high-contrast`, `sepia`, `print`) — emits only the data-attribute selector `[data-theme="<name>"]`. Custom modes get no system-pref hookup; that's an opt-in future feature.

For `print`, themes that want `@media print` instead of a data attribute can author a CSS file alongside — out of scope for the generator. Modes in the contract are about **theme variants** the user can toggle, not media-type variants.

### Picking the initial mode (`theme.colorScheme`)

`theme.colorScheme` controls what `data-theme` value (if any) the SvelteKit integration writes onto the `<html>` element at SSR time. It does not generate any CSS — it's purely about which of the already-emitted selector blocks wins on first paint.

- `'auto'` (default) — emit no `data-theme` attribute. The `prefers-color-scheme` media query in the dark-mode block decides; light is the fallback. Equivalent to today's behavior.
- `'light'` — set `data-theme="light"` on `<html>`. The dark-mode media query is gated by `:root:not([data-theme="light"])`, so this disables system-preference dark mode entirely.
- `'dark'` — set `data-theme="dark"` on `<html>`. Forces dark mode for every visitor regardless of OS preference.
- A custom mode name (e.g. `'high-contrast'`) — set `data-theme="<name>"` on `<html>`. Only valid if the same key exists under `theme.modes`; validator rejects unknown values.

The integration writes the attribute by transforming the SvelteKit response (e.g. via the adapter's HTML transform). No client-side JavaScript runs to pick the mode — it's baked into the SSR output, so there's no flash-of-wrong-theme.

A future runtime toggle (out of scope here) would: (a) read this initial value from `<html data-theme>` on hydration, (b) flip the attribute on user click, (c) optionally persist to `localStorage`. The contract gives the toggle a stable starting point; the toggle itself is separate.

### `tokensToCss` mode output

```ts
tokensToCss({
  tokens: { color: { primary: '#7c3aed' } },
  modes: {
    dark: { color: { primary: '#a78bfa' } }
  }
});
```

emits:

```css
:root {
  --rf-color-primary: #7c3aed;
}

[data-theme="dark"] {
  --rf-color-primary: #a78bfa;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --rf-color-primary: #a78bfa;
  }
}
```

A mode block is suppressed entirely when its partial is empty. Output order is deterministic: `:root` first, then each mode in stable iteration order (dark first if present, then alphabetical).

### Merging modes across layers

`mergeTokens` deep-merges modes alongside the base. Given:

```
theme base:  { tokens: { color: { primary: '#1d3557' } }, modes: { dark: { color: { primary: '#70b4c0' } } } }
preset warm: { tokens: { color: { primary: '#d97706' } }, modes: { dark: { color: { primary: '#fbbf24' } } } }
site:        { tokens: { color: { text: '#0f172a' } } }
```

the merge produces:
- base `color.primary`: `#d97706` (preset wins)
- base `color.text`: `#0f172a` (site adds)
- dark `color.primary`: `#fbbf24` (preset wins)
- dark `color.text`: *not set* (site only wrote to base; dark inherits via cascade)

This is the intended behavior — writing to `tokens.color.text` doesn't silently fork a dark equivalent. Authors who want a different dark value write it explicitly in `modes.dark.color.text`.

### Presets ship modes

A preset is a `ThemeTokensConfig`, not a bare `PartialTokenContract`:

```ts
// packages/lumina/presets/warm.ts
import type { ThemeTokensConfig } from '@refrakt-md/types';

export const warm: ThemeTokensConfig = {
  tokens: { color: { primary: '#d97706', 'primary-hover': '#b45309' } },
  modes: {
    dark: { color: { primary: '#fbbf24', 'primary-hover': '#fcd34d' } },
  },
};
```

Presets that only customize one mode (a "dark-only" preset) leave `tokens` empty and write only to `modes.dark`. Valid and useful — e.g. a "midnight" preset that only changes dark-mode surface colors.

### Lumina migration

`packages/lumina/tokens/dark.css` becomes a build artifact, regenerated from `packages/lumina/src/tokens.ts` where Lumina's values include a `modes.dark` overlay. Same generator that produces `base.css` produces `dark.css` — one script, one source of truth, two output files. Both stay committed so downstream consumers (CSS imports in user sites) work without running a build.

-----

## Syntax Highlighting Abstraction

Today `packages/lumina/tokens/base.css` defines `--shiki-foreground`, `--shiki-token-keyword`, etc., and per-rune CSS reads them directly. This spec renames the public surface to `--rf-syntax-*` and treats Shiki as an implementation detail of the code-block integration.

Two things change:

1. **Token names.** `--shiki-foreground` → `--rf-syntax-foreground`; `--shiki-token-keyword` → `--rf-syntax-keyword`; same for `string`, `string-expression`, `constant`, `comment`, `function`, `parameter`, `punctuation`, `link`. Lumina's `base.css` and `dark.css` are updated; every CSS file in `packages/lumina/styles/` that mentions `--shiki-*` is updated.

2. **Highlighter integration.** Wherever Shiki is invoked (the code-block transform / pre rune integration), its output is configured to write the refrakt names. Shiki supports a `cssVariablePrefix` option and themed token-class output — either is fine; the constraint is that no `--shiki-*` name appears in the rendered HTML or in any CSS file. If Shiki's surface doesn't map 1:1 to ours, the integration maps internally — the **contract** is what runes consume.

The 11 syntax tokens above are the contract. A future highlighter swap means rewriting the integration, not the contract.

-----

## Package Layout & Helpers

- `packages/types/src/tokens.ts` — `TokenContract`, `PartialTokenContract`, `ThemeTokensConfig`, `tokenContract` const. Zero runtime deps. Re-exported from `packages/types/src/index.ts`.
- `packages/transform/src/tokens.ts` — `tokensToCss(config: ThemeTokensConfig): string`, `mergeTokens(...layers: ThemeTokensConfig[]): ThemeTokensConfig`, `validateTokens(config): { ok: boolean; warnings: string[]; errors: string[] }`, `applyTokens(config: ThemeTokensConfig, target?: HTMLElement): void`. All four are pure data utilities with no Node-only dependencies — `tokensToCss`, `mergeTokens`, and `validateTokens` work identically in the browser; `applyTokens` is browser-only (writes inline `style.setProperty` calls onto `target ?? document.documentElement`, defaults included). All operate on full `ThemeTokensConfig` (base + modes) uniformly.
- `packages/lumina/src/tokens.ts` — Lumina's values typed against `ThemeTokensConfig`. Single source of truth: both `tokens/base.css` and `tokens/dark.css` are generated from this file by `packages/lumina/scripts/build-tokens.ts`, which runs as a `prebuild` step. The generated CSS files are committed to the repo (so installing `@refrakt-md/lumina` doesn't require running a build) and CI asserts that re-running the generator produces no diff against `HEAD` — that's how drift is caught.
- `packages/lumina/src/presets/` — `Preset` objects exported per preset (e.g. `warm.ts`, `slate.ts`). Each preset can contribute to base and/or to any mode and carries a `meta` block. The build-tokens script also re-emits these into `packages/lumina/manifest.json`'s `presets` field so they're discoverable via `@refrakt-md/lumina/manifest` without a separate import path. Direct import (`@refrakt-md/lumina/presets/warm`) keeps working as a module specifier for users who prefer that form.
- `packages/sveltekit/` — the Vite plugin reads `refrakt.config.json`, calls `mergeTokens(theme.base, ...presets, { tokens: theme.tokens, modes: theme.modes, colorScheme: theme.colorScheme })`, runs `tokensToCss()`, and exposes the result as a virtual module (e.g. `virtual:refrakt-tokens.css`) injected into the document head before user CSS. When the merged `colorScheme` is `'light'`, `'dark'`, or a custom mode name, the integration also writes `data-theme="<value>"` onto the `<html>` element of every SSR response (via SvelteKit's `transformPageChunk` hook in a server `handle`). For `'auto'` (or unset), no attribute is emitted — the media query in the dark-mode block decides at the browser. HMR re-runs on config change.

-----

## Validation

`validateTokens(partial)` produces warnings (not errors) for:

- Keys not in the contract that also aren't under `extra` — likely a typo (`color.primry`).
- `extra` keys that don't begin with `--` or `rf-`, or that collide with a contract-mapped CSS variable name.

Errors (build fails) for:

- Non-string leaf values.
- Malformed `extra` keys (containing characters outside `[a-zA-Z0-9-]`, or `--rf-*` names that collide with the contract).
- `colorScheme` set to a value that isn't `'auto'`, `'light'`, `'dark'`, or a key declared under `theme.modes`. Forcing a mode that has no token overlay would set `data-theme="<name>"` against an empty selector block, silently doing nothing — better to fail loudly.

Warnings surface in the build log and in `refrakt inspect --tokens` (see below). Failing fast on errors keeps hosted UIs honest.

-----

## Tooling

- **`refrakt inspect --tokens`** — prints the resolved token set (after merging base + presets + overrides) as a table or `--json`. Shows source of each value (which layer set it). Useful for debugging "why is my primary still blue?" cases.
- **`refrakt contracts --tokens`** — emits the token contract as JSON (path, CSS var name, required/optional). Pairs with the existing structure contracts surface for CI snapshot tests.
- **JSON Schema for `refrakt.config.json`** — generated from `TokenContract` so editors give autocomplete on `theme.tokens` paths. Lives next to the existing config schema.

-----

## Runtime Use for Live Editors

The build-time CSS generation produces a `:root { --rf-* }` stylesheet for *persisted* output, but the underlying substrate — CSS custom properties — is fully runtime-mutable. Hosted theme editors, brand-picker panels, and "preview your changes live" UIs work against the same contract without rebuilding anything: a `setProperty` call on `<html>` re-paints every rune that reads via `var(--rf-*)`.

This is an intentional outcome of the design, not an afterthought. To make the runtime story first-class, the three pure utilities in `packages/transform/src/tokens.ts` (`tokensToCss`, `mergeTokens`, `validateTokens`) ship without Node-only imports and are safe to call in the browser. A fourth helper, `applyTokens`, exists specifically for the runtime case.

### `applyTokens(config, target?)`

```ts
import { applyTokens, mergeTokens } from '@refrakt-md/transform/tokens';

// User drags the primary color picker:
applyTokens({
  tokens: { color: { primary: '#7c3aed' } }
});
// Every rune referencing var(--rf-color-primary) re-paints instantly.

// Compose a preview state from current site config + user's pending edits:
const preview = mergeTokens(currentSiteConfig, pendingEdits);
applyTokens(preview);
```

`applyTokens` writes one `style.setProperty('--rf-color-primary', '#7c3aed')` per leaf value onto `target ?? document.documentElement`. For `modes`, the helper inspects the current `data-theme` attribute and applies the matching mode overlay on top of the base — so a dark-mode preview stays dark while the user tweaks. To preview a different mode, set `data-theme="dark"` on the target before calling.

To roll back a preview, the editor either re-applies the persisted config or calls `target.removeAttribute('style')` if no other inline styles need to survive. No memoization, no diffing — the helper is intentionally trivial; if a hosted product needs cleverer reconciliation, it composes its own on top of `mergeTokens` + `setProperty`.

### Whole-stylesheet swap

For larger changes (preset swap, multi-token overhaul), some editors prefer replacing a `<style>` block rather than calling `setProperty` per token. `tokensToCss(config)` runs identically in the browser:

```ts
const css = tokensToCss(preview);
document.querySelector('#rf-preview-tokens')!.textContent = css;
```

A `<style id="rf-preview-tokens">` placed after the build-time stylesheet wins by source-order. Same effect as `applyTokens`, different mechanism — pick whichever fits the editor's reconciliation model.

### Validating user input

`validateTokens(config)` runs the same in the browser as in the build. Editors should call it on every keystroke (or debounced) to surface the same warnings/errors a user would see at build time — typo'd token names, malformed `extra` keys, invalid `colorScheme` values. The shape of the result (`{ warnings, errors }`) is uniform across environments.

### Persisting changes

Live preview is one half; persisting is the other. When the user clicks "save," the hosted product POSTs the merged `ThemeTokensConfig` (or just the user's partial) to its backend, which writes `refrakt.config.json` and queues a regular build. Everything between "live preview" and "deployed CSS" is identical because the runtime helpers and the build-time generator share the same data shape and merge rules.

-----

## Migration

Existing sites consuming `--shiki-*` in custom CSS need to rename to `--rf-syntax-*`. This is the only breaking change in this spec.

- A changeset documents the rename with a search/replace mapping (one entry per syntax token).
- `packages/lumina/tokens/base.css` keeps `--shiki-*` aliases pointing at the new names for **one minor version** as a deprecation bridge: `--shiki-foreground: var(--rf-syntax-foreground);`. Removed in the following minor release.
- No migration needed for sites that only override `--rf-*` tokens via CSS — those names are unchanged.
- Theme packages that want to opt into the typed surface convert their CSS-only token file into a `tokens.ts` and re-export; the CSS file can stay generated from it.

-----

## Acceptance Criteria

- [ ] `TokenContract`, `PartialTokenContract`, `ThemeTokensConfig`, `Preset`, and `tokenContract` const defined in `packages/types/src/tokens.ts` and re-exported from the package index
- [ ] `tokenContract` enumerates every `--rf-*` variable currently defined in `packages/lumina/tokens/base.css` (~71 entries, post-rename)
- [ ] `extra: Record<string, string>` field present on `TokenContract` for theme-specific tokens outside the universal surface
- [ ] `ThemeTokensConfig` is the shape shared by `theme` in `refrakt.config.json`, presets, and theme package base exports — with `tokens?: PartialTokenContract` and `modes?: Record<string, PartialTokenContract>` fields
- [ ] `tokensToCss(config)` in `packages/transform/src/tokens.ts` emits a deterministic stylesheet from a `ThemeTokensConfig`: `:root { ... }` for base, plus a block per mode
- [ ] `tokensToCss`, `mergeTokens`, and `validateTokens` are browser-safe: no Node-only imports, no `process`/`fs`/`path` references. A vitest case under `@vitest-environment jsdom` exercises each in a DOM environment to lock the guarantee.
- [ ] `applyTokens(config, target?)` in `packages/transform/src/tokens.ts` writes one `style.setProperty(--rf-*, value)` per leaf value onto `target ?? document.documentElement`
- [ ] `applyTokens` consults `target`'s `data-theme` attribute and layers the matching `modes[<value>]` overlay onto the base when writing
- [ ] `applyTokens` is tested in jsdom: writes the expected inline custom properties for a base-only config, for a config with `modes.dark` when `data-theme="dark"` is set, and is a no-op for an empty `ThemeTokensConfig`
- [ ] `tokensToCss` emits `[data-theme="dark"] { ... }` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` blocks when `modes.dark` is present
- [ ] `tokensToCss` emits only `[data-theme="<name>"] { ... }` for non-conventional mode names (no media query)
- [ ] `tokensToCss` emits `[data-theme="light"] { ... }` for `modes.light` (no media query — light is the base)
- [ ] Empty mode partials (no keys after merge) produce no CSS output for that mode
- [ ] `mergeTokens(...layers)` merges multiple `ThemeTokensConfig` objects with last-write-wins semantics, deep-merging both `tokens` and each entry under `modes` independently
- [ ] Writing to `tokens.color.X` does not implicitly mutate `modes.dark.color.X` — mode overlays are independent of base overrides (cascade handles inheritance of unset keys)
- [ ] `validateTokens(config)` returns warnings for unknown keys (outside `extra`) in both `tokens` and any mode, and errors for malformed `extra` keys or non-string leaf values
- [ ] `--shiki-*` token names renamed to `--rf-syntax-*` in `packages/lumina/tokens/base.css` and `packages/lumina/tokens/dark.css`
- [ ] All references to `--shiki-*` in `packages/lumina/styles/` updated to `--rf-syntax-*` (`grep -r '\-\-shiki' packages/lumina/styles/` returns nothing)
- [ ] Shiki integration configured so the rendered code-block HTML and any CSS it emits use `--rf-syntax-*` names (not `--shiki-*`)
- [ ] Deprecation aliases (`--shiki-* : var(--rf-syntax-*)`) shipped in `base.css` for one minor version with a `/* deprecated, remove in vX.Y.Z */` comment
- [ ] `packages/lumina/src/tokens.ts` exports Lumina's values typed against `ThemeTokensConfig` including a `modes.dark` overlay
- [ ] `packages/lumina/scripts/build-tokens.ts` generates `packages/lumina/tokens/base.css` and `packages/lumina/tokens/dark.css` from `src/tokens.ts`, runs as a `prebuild` npm script, and produces byte-identical output across runs
- [ ] Generated `base.css` and `dark.css` files are committed to the repo (so consumers don't need to run a build step to import them)
- [ ] CI runs the generator and fails if `git diff --exit-code packages/lumina/tokens/` shows any change — catches commits that hand-edited the CSS without updating `src/tokens.ts`
- [ ] At least one preset besides default ships under `packages/lumina/src/presets/` (e.g. `warm.ts`) as a `Preset` (with `meta` and at least `tokens`); the preset includes both base and `modes.dark` values
- [ ] `packages/lumina/manifest.json` extended with a `presets: Preset[]` field, populated by the build-tokens script from `src/presets/`
- [ ] Hosted UIs can read all available presets via `import manifest from '@refrakt-md/lumina/manifest'` without a separate sub-path import
- [ ] `theme.presets` config field accepts both bare ids (resolved against the active theme manifest's `presets[].meta.id`) and module specifiers containing `/` (loaded as before)
- [ ] Validator errors when a bare-id `theme.presets` entry doesn't match any `meta.id` in the active theme's manifest (with the list of available ids in the error message)
- [ ] `Preset.meta.id`, `name`, and `description` are required; `tags` and `preview.colors` are optional and treated as advisory by validators and tooling
- [ ] `refrakt.config.json` accepts `theme.tokens: PartialTokenContract`, `theme.modes: Record<string, PartialTokenContract>`, `theme.colorScheme: 'auto' | 'light' | 'dark' | string`, and `theme.presets: string[]` fields; all optional
- [ ] `theme.colorScheme` defaults to `'auto'` when unset; `mergeTokens` treats `colorScheme` as a scalar (last layer wins) rather than deep-merging it
- [ ] Validator errors when `theme.colorScheme` is set to a value that is neither `'auto'`, `'light'`, `'dark'`, nor a key present under `theme.modes`
- [ ] SvelteKit integration writes `data-theme="<value>"` onto the `<html>` element of every SSR response when `colorScheme` is `'light'`, `'dark'`, or a custom mode name; emits no attribute when `'auto'`
- [ ] No client-side script is required for the initial mode to apply — the SSR-emitted attribute is sufficient (no flash-of-wrong-theme)
- [ ] SvelteKit Vite plugin in `packages/sveltekit/` reads `theme.tokens`, `theme.modes`, and `theme.presets`, merges them via `mergeTokens`, generates a stylesheet via `tokensToCss`, and exposes it as a virtual module injected after theme base CSS and before user CSS
- [ ] Config changes trigger HMR re-render of the generated token stylesheet during `npm run dev`
- [ ] `refrakt inspect --tokens` command prints the resolved token set (base + every mode) with source-of-value annotations; supports `--json` and an optional `--mode <name>` filter
- [ ] `refrakt contracts --tokens` emits the token contract as JSON (paths + CSS var names) for CI snapshot use
- [ ] JSON Schema for `refrakt.config.json` updated to include `theme.tokens`, `theme.modes`, `theme.colorScheme`, and `theme.presets` with autocomplete-friendly key suggestions
- [ ] CSS coverage tests updated for renamed syntax tokens
- [ ] Theming docs at `site/content/docs/themes/configuration.md` updated to cover `theme.tokens`, `theme.modes`, `theme.colorScheme`, `theme.presets`, the layering order, and the conventional mode-name semantics (`dark` / `light` / custom)
- [ ] A new doc page at `site/content/docs/themes/live-editing.md` (or equivalent under themes/) documents the runtime helpers (`applyTokens`, browser-safe `tokensToCss` / `validateTokens`) and the live-editor pattern for hosted products
- [ ] Theming docs at `site/content/docs/themes/css.md` updated to point at `--rf-syntax-*` (not `--shiki-*`)
- [ ] Changeset entry documents the `--shiki-* → --rf-syntax-*` rename with the full mapping table and the deprecation timeline

-----

## Out of Scope

- **Derived / computed tokens in config.** No `color-mix()`, no token references (`"primary-hover": "{color.primary} darken 10%"`). Power users drop a CSS file for this. Config stays a static value map. (This is also why writing to `tokens.color.X` doesn't auto-derive `modes.dark.color.X` — there's no derivation engine.)
- **Mode-aware media queries beyond dark.** Only `modes.dark` gets the `@media (prefers-color-scheme)` hookup. `print`, `reduced-motion`, `high-contrast` system-pref bindings are deferred; they need their own opt-in mechanism rather than overloading the mode key.
- **Runtime mode toggling UI.** This spec covers the SSR-emitted *initial* `data-theme` (via `theme.colorScheme`) and the CSS selectors modes resolve to. A user-clickable toggle button — flipping `data-theme` on the fly, persisting to `localStorage`, syncing across tabs — is a separate concern, likely a `@refrakt-md/behaviors` addition that builds on this foundation.
- **Per-page or per-route token overrides.** Scoped CSS injection is a different mechanism; out of scope here.
- **A hosted UI for token customization.** This spec enables one by giving it a contract, browser-safe utilities (`tokensToCss`, `mergeTokens`, `validateTokens`, `applyTokens`), and a manifest-based preset registry. Actually building the panel — auth, storage, deployment — is separate product work.
- **Runtime theme switching.** Build-time output only. Runtime switching is achievable via standard CSS techniques on top of this work.
- **Token naming overhaul.** Names (`primary`, `surface.raised`, `spacing.section.tight`) are preserved as-is from current Lumina CSS, modulo the `--shiki-* → --rf-syntax-*` rename. Reorganizing the namespace is its own spec.
- **Plugin-contributed tokens.** Plugins can read tokens via CSS today; whether they can *contribute* to the contract is a follow-up question once we see what plugins actually need.

-----

## Decisions

Decisions made during spec drafting, recorded here for future reference. Each entry is a closed question — implementation follows the resolution.

**`tokensToCss` and validator live in `@refrakt-md/transform`.** Transform already owns CSS-adjacent merge logic (`mergeThemeConfig`) and is the natural home. A separate `@refrakt-md/tokens` package only pays off if non-transform code paths need token utilities without pulling transform; not the case today.

**CSS files are generated from `tokens.ts`, not hand-written + parity-tested.** With dark mode in the contract there are three files to keep in sync; a parity test catches drift after it happens, whereas a generator prevents it. `packages/lumina/scripts/build-tokens.ts` produces `base.css` and `dark.css` deterministically, runs as a `prebuild` step, and CI fails if re-running the generator changes anything tracked in git. Generated files stay committed so consumers don't need a build step on install.

**Presets ship from Lumina, not a shared package.** Same model as today's design plugins. A shared `@refrakt-md/presets` package only makes sense once multiple themes ship and want a common set — defer until that's real.

**Preset discoverability lives on the theme manifest.** Hosted UIs and pickers read available presets via `@refrakt-md/lumina/manifest`'s new `presets: Preset[]` field — the same surface that already advertises the theme's name, version, and layout regions. No new export path, no separate registry file. `theme.presets` accepts bare ids (looked up against the manifest) for ergonomics and module specifiers with `/` for third-party presets.

**Syntax contract starts at the 11 names Lumina uses today.** Covers what current rune CSS reads. Mirroring Shiki's full ~30+ token catalog bloats the contract for runes that never reference the extras. Add tokens to the syntax group only when a real use case appears.

**JSON Schema is generated at build time, committed to the repo.** Simpler for consumers, CI, and editor integration. Runtime generation would let downstream themes contribute to the schema; revisit if themes start shipping contract extensions.

**`extra` keys must begin with `--rf-*`.** Enforced by `validateTokens`. Keeps the namespace consistent, avoids collision with user-authored CSS variables, and means a hosted UI can safely emit `extra` keys knowing they won't shadow anything outside the refrakt surface.

**Mode selector pattern is hard-coded to `[data-theme="<name>"]`.** Matches Lumina's existing `dark.css`. Themes that want Tailwind-style `.dark` classes or a different attribute can author their own CSS file. A `theme.modeSelector` knob can be added later if multiple themes need it — a single convention is worth more than flexibility no one's asked for yet.

**`validateTokens` warns in dev, fails in CI / production builds.** The validator returns both lists; the SvelteKit integration treats `errors` as fatal when `process.env.NODE_ENV === 'production'` or when an explicit `RF_STRICT_TOKENS=1` is set. In local dev, errors print loudly but don't break HMR — a typo in `refrakt.config.json` shouldn't take down the dev server.

{% /spec %}
