{% spec id="SPEC-048" status="draft" tags="theme, tokens, config, lumina, syntax-highlighting" %}

# Design tokens contract & config

Promote refrakt's design tokens from an implicit set of CSS custom properties owned by Lumina into a typed, theme-agnostic **contract** — so any theme can supply values for the same names, sites can override tokens declaratively in `refrakt.config.json`, presets become shareable data, and the syntax-highlighting surface stops leaking the underlying highlighter (`--shiki-*` → `--rf-syntax-*`).

## Problem

Today the design token surface is defined entirely as CSS custom properties in `packages/lumina/tokens/base.css` (~71 variables across typography, color, radius, spacing, shadow, code, and syntax). Customization means writing a stylesheet that redefines `--rf-*` vars after Lumina's are loaded. That works for hand-built sites, but has four real costs:

**No machine-readable description of what runes depend on.** The "contract" between runes and themes is implicit — you have to read Lumina's CSS and the per-rune stylesheets in `packages/lumina/styles/runes/` to know which variables are required. A custom theme has no schema to type its tokens against; a hosted UI has no field list to render; an AI agent customizing a site has nothing to validate against.

**Hosted environments can't customize via CSS.** A "tweak your brand colors" form in a hosted dashboard can't ship arbitrary CSS to the build. It needs a structured config it can serialize, validate, and re-render — exactly what `refrakt.config.json` already does for plugins.

**Presets aren't shareable.** A "warm" or "high-contrast" variant means forking the CSS file. There's no way for a theme to ship a few starting points users can opt into, or for users to combine "Lumina + warm preset + my three overrides" without manual CSS work.

**The highlighter is leaking into the public token surface.** Eleven `--shiki-*` variables sit in `base.css` alongside `--rf-*` tokens. Per-rune CSS in `packages/lumina/styles/` reads them directly, which means swapping Shiki for Prism, Starry Night, or a server-side alternative is a breaking change for every downstream theme and any custom user CSS.

-----

## Design Principles

**The contract is universal, the values are themed.** The names runes depend on (`color.primary`, `radius.md`, `syntax.keyword`, ...) belong in `@refrakt-md/types`. Lumina supplies one set of values; other themes supply theirs. A theme is not required to use Lumina to be valid — it just needs to cover the contract.

**Strict, with an explicit escape hatch.** Contract keys are enumerated and typed. Themes and sites can also write to `extra: Record<string, string>` for theme-specific tokens that don't fit the universal contract. Strictness on the named surface keeps validation, hosted UIs, and AI tooling tractable; `extra` keeps the system non-precious.

**Config is sugar over CSS, not a replacement.** `theme.tokens` in `refrakt.config.json` compiles to a `:root { --rf-* }` stylesheet at build time. That stylesheet is injected after the theme's base CSS and before any user CSS, so power users can still drop a stylesheet to access anything CSS can do that config can't — `color-mix()`, media queries, scoped overrides. We don't try to model those in JSON.

**Presets are plain data.** A preset is a `Partial<TokenContract>` exported from a module. There's no preset registry, no runtime hook, no lifecycle — just an object that gets merged in order with other presets and user overrides. Lumina ships a couple as a starting point; any theme can ship its own.

**Highlighter is an implementation detail.** Rune CSS reads `--rf-syntax-*`. The Shiki integration writes those names (via its `cssVariablePrefix` / themed-tokens config) or maps internally — either way, the public surface is highlighter-agnostic.

-----

## Authoring Surface

### Config

`refrakt.config.json`:

```json
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": ["@refrakt-md/lumina/presets/warm"],
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
    }
  }
}
```

Layering order (last write wins):

1. Theme package's base tokens (e.g. Lumina's `base.css` values)
2. Each entry in `theme.presets[]` in declared order
3. `theme.tokens` (site-specific overrides)
4. User-supplied CSS files imported after the generated stylesheet

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
```

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

-----

## Syntax Highlighting Abstraction

Today `packages/lumina/tokens/base.css` defines `--shiki-foreground`, `--shiki-token-keyword`, etc., and per-rune CSS reads them directly. This spec renames the public surface to `--rf-syntax-*` and treats Shiki as an implementation detail of the code-block integration.

Two things change:

1. **Token names.** `--shiki-foreground` → `--rf-syntax-foreground`; `--shiki-token-keyword` → `--rf-syntax-keyword`; same for `string`, `string-expression`, `constant`, `comment`, `function`, `parameter`, `punctuation`, `link`. Lumina's `base.css` and `dark.css` are updated; every CSS file in `packages/lumina/styles/` that mentions `--shiki-*` is updated.

2. **Highlighter integration.** Wherever Shiki is invoked (the code-block transform / pre rune integration), its output is configured to write the refrakt names. Shiki supports a `cssVariablePrefix` option and themed token-class output — either is fine; the constraint is that no `--shiki-*` name appears in the rendered HTML or in any CSS file. If Shiki's surface doesn't map 1:1 to ours, the integration maps internally — the **contract** is what runes consume.

The 11 syntax tokens above are the contract. A future highlighter swap means rewriting the integration, not the contract.

-----

## Package Layout & Helpers

- `packages/types/src/tokens.ts` — `TokenContract`, `PartialTokenContract`, `tokenContract` const. Zero runtime deps. Re-exported from `packages/types/src/index.ts`.
- `packages/transform/src/tokens.ts` — `tokensToCss(partial: PartialTokenContract): string`, `mergeTokens(...layers: PartialTokenContract[]): PartialTokenContract`, `validateTokens(partial): { ok: boolean; warnings: string[]; errors: string[] }`.
- `packages/lumina/src/tokens.ts` — Lumina's values typed against `TokenContract`. Single source of truth; `packages/lumina/tokens/base.css` is generated from this file at build time (or covered by a parity test if generation is deferred — see Open Questions).
- `packages/lumina/presets/` — small `Partial<TokenContract>` objects exported per preset (e.g. `warm.ts`, `slate.ts`). Importable as `@refrakt-md/lumina/presets/warm`.
- `packages/sveltekit/` — the Vite plugin reads `refrakt.config.json`, calls `mergeTokens(theme.base, ...presets, theme.tokens)`, runs `tokensToCss()`, and exposes the result as a virtual module (e.g. `virtual:refrakt-tokens.css`) injected into the document head before user CSS. HMR re-runs on config change.

-----

## Validation

`validateTokens(partial)` produces warnings (not errors) for:

- Keys not in the contract that also aren't under `extra` — likely a typo (`color.primry`).
- `extra` keys that don't begin with `--` or `rf-`, or that collide with a contract-mapped CSS variable name.

Errors (build fails) for:

- Non-string leaf values.
- Malformed `extra` keys (containing characters outside `[a-zA-Z0-9-]`, or `--rf-*` names that collide with the contract).

Warnings surface in the build log and in `refrakt inspect --tokens` (see below). Failing fast on errors keeps hosted UIs honest.

-----

## Tooling

- **`refrakt inspect --tokens`** — prints the resolved token set (after merging base + presets + overrides) as a table or `--json`. Shows source of each value (which layer set it). Useful for debugging "why is my primary still blue?" cases.
- **`refrakt contracts --tokens`** — emits the token contract as JSON (path, CSS var name, required/optional). Pairs with the existing structure contracts surface for CI snapshot tests.
- **JSON Schema for `refrakt.config.json`** — generated from `TokenContract` so editors give autocomplete on `theme.tokens` paths. Lives next to the existing config schema.

-----

## Migration

Existing sites consuming `--shiki-*` in custom CSS need to rename to `--rf-syntax-*`. This is the only breaking change in this spec.

- A changeset documents the rename with a search/replace mapping (one entry per syntax token).
- `packages/lumina/tokens/base.css` keeps `--shiki-*` aliases pointing at the new names for **one minor version** as a deprecation bridge: `--shiki-foreground: var(--rf-syntax-foreground);`. Removed in the following minor release.
- No migration needed for sites that only override `--rf-*` tokens via CSS — those names are unchanged.
- Theme packages that want to opt into the typed surface convert their CSS-only token file into a `tokens.ts` and re-export; the CSS file can stay generated from it.

-----

## Acceptance Criteria

- [ ] `TokenContract`, `PartialTokenContract`, and `tokenContract` const defined in `packages/types/src/tokens.ts` and re-exported from the package index
- [ ] `tokenContract` enumerates every `--rf-*` variable currently defined in `packages/lumina/tokens/base.css` (~71 entries, post-rename)
- [ ] `extra: Record<string, string>` field present on `TokenContract` for theme-specific tokens outside the universal surface
- [ ] `tokensToCss(partial)` in `packages/transform/src/tokens.ts` emits a deterministic `:root { ... }` block from a `PartialTokenContract`
- [ ] `mergeTokens(...layers)` merges multiple `PartialTokenContract` objects with last-write-wins semantics, deep-merging nested groups
- [ ] `validateTokens(partial)` returns warnings for unknown keys (outside `extra`) and errors for malformed `extra` keys or non-string leaf values
- [ ] `--shiki-*` token names renamed to `--rf-syntax-*` in `packages/lumina/tokens/base.css` and `packages/lumina/tokens/dark.css`
- [ ] All references to `--shiki-*` in `packages/lumina/styles/` updated to `--rf-syntax-*` (`grep -r '\-\-shiki' packages/lumina/styles/` returns nothing)
- [ ] Shiki integration configured so the rendered code-block HTML and any CSS it emits use `--rf-syntax-*` names (not `--shiki-*`)
- [ ] Deprecation aliases (`--shiki-* : var(--rf-syntax-*)`) shipped in `base.css` for one minor version with a `/* deprecated, remove in vX.Y.Z */` comment
- [ ] `packages/lumina/src/tokens.ts` exports Lumina's values typed against `TokenContract`; `base.css` is either generated from it at build time, or a vitest parity test asserts the two are in sync
- [ ] At least one preset besides default ships under `packages/lumina/presets/` (e.g. `warm.ts`) and is importable as `@refrakt-md/lumina/presets/warm`
- [ ] `refrakt.config.json` accepts `theme.tokens: PartialTokenContract` and `theme.presets: string[]` fields; both optional
- [ ] SvelteKit Vite plugin in `packages/sveltekit/` reads `theme.tokens` and `theme.presets`, merges them via `mergeTokens`, generates a stylesheet via `tokensToCss`, and exposes it as a virtual module injected after theme base CSS and before user CSS
- [ ] Config changes trigger HMR re-render of the generated token stylesheet during `npm run dev`
- [ ] `refrakt inspect --tokens` command prints the resolved token set with source-of-value annotations; supports `--json`
- [ ] `refrakt contracts --tokens` emits the token contract as JSON (paths + CSS var names) for CI snapshot use
- [ ] JSON Schema for `refrakt.config.json` updated to include `theme.tokens` and `theme.presets` with autocomplete-friendly key suggestions
- [ ] CSS coverage tests updated for renamed syntax tokens
- [ ] Theming docs at `site/content/docs/themes/configuration.md` updated to cover `theme.tokens`, `theme.presets`, and the layering order
- [ ] Theming docs at `site/content/docs/themes/css.md` updated to point at `--rf-syntax-*` (not `--shiki-*`)
- [ ] Changeset entry documents the `--shiki-* → --rf-syntax-*` rename with the full mapping table and the deprecation timeline

-----

## Out of Scope

- **Dark-mode tokens via config.** This spec keeps `dark.css` as-is. A future spec can introduce `theme.tokensDark` as a parallel `PartialTokenContract` if the demand is real; doing it now bloats the surface before we know what people actually need.
- **Derived / computed tokens in config.** No `color-mix()`, no token references (`"primary-hover": "{color.primary} darken 10%"`). Power users drop a CSS file for this. Config stays a static value map.
- **Per-page or per-route token overrides.** Scoped CSS injection is a different mechanism; out of scope here.
- **A hosted UI for token customization.** This spec enables one by giving it a contract to render against. Building the UI itself is separate.
- **Runtime theme switching.** Build-time output only. Runtime switching is achievable via standard CSS techniques on top of this work.
- **Token naming overhaul.** Names (`primary`, `surface.raised`, `spacing.section.tight`) are preserved as-is from current Lumina CSS, modulo the `--shiki-* → --rf-syntax-*` rename. Reorganizing the namespace is its own spec.
- **Plugin-contributed tokens.** Plugins can read tokens via CSS today; whether they can *contribute* to the contract is a follow-up question once we see what plugins actually need.

-----

## Open Questions

**Where do `tokensToCss` and the validator live — `transform` or a new `@refrakt-md/tokens` package?** Bias toward `transform` since it already owns CSS-adjacent merge logic (`mergeThemeConfig`) and avoids a new package. A separate package only pays off if non-transform code paths (e.g. the AI package or a future CLI-only tool) need token utilities without pulling transform.

**Generate `base.css` from `tokens.ts`, or keep both hand-written + parity test?** Generation is cleaner long-term (one source of truth) but means the CSS file becomes a build artifact, complicating `npm run build` ordering and IDE navigation. A parity test (vitest snapshot) is cheaper for v1; promote to generation in a follow-up if drift becomes a real cost.

**Preset distribution — Lumina-only, or a shared `@refrakt-md/presets` package?** Lumina-only is simpler and matches how the design plugin packages today. A shared package only makes sense if multiple themes ship and want a common set. Defer until that's real.

**Should the syntax contract mirror Shiki's full token catalog, or stay at the 11 names Lumina uses today?** The 11 names cover what current rune CSS reads. Mirroring Shiki's full catalog (~30+ token classes) gives finer control but bloats the contract for runes that never reference the extras. Recommend: start with the 11; add more if a real use case appears.

**JSON Schema generation — runtime or build-time?** Generating at build time (committed to the repo) is simpler for consumers and CI; generating at runtime would let downstream themes contribute to the schema. Start build-time, revisit if themes ship contract extensions.

**`extra` key prefix — require `--rf-*`, or just `--`?** Requiring `--rf-*` keeps the namespace consistent and avoids collision with user-authored CSS variables. Just `--` is more flexible but invites accidental shadowing. Recommend `--rf-*` only, enforced by validation.

**Should `validateTokens` errors fail the build, or just warn loudly?** Failing fast is better for hosted environments (catch bad input before deploying) but worse for local dev (surprise build break from a typo). Recommend: warn locally during dev, fail in CI / production builds. The validator returns both lists; the integration layer decides which is fatal based on `process.env.NODE_ENV` or an explicit flag.

{% /spec %}
