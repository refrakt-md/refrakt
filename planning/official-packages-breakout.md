# Official Rune Packages — Breakout Plan

> **Status:** Planning
> **Depends on:** `planning/community-runes-spec.md` (architecture), `planning/unbuilt-runes-spec.md` (new runes)

---

## Overview

This plan covers breaking existing core runes out of `packages/runes/`, `packages/theme-base/`, `packages/lumina/`, and `packages/behaviors/` into official `@refrakt/` packages, and filling infrastructure gaps in the community rune system to support this.

Currently all ~93 rune configs live in `packages/theme-base/src/config.ts`, all ~62 rune schemas live in `packages/runes/src/tags/`, and all CSS lives in `packages/lumina/styles/runes/`. After breakout, only the ~30 core runes remain in `packages/runes/`. Everything else moves into official packages. CSS stays in themes — rune packages define structure, themes define appearance. `theme-base` is dissolved entirely — its contents are absorbed into existing packages.

---

## Monorepo Structure

Official rune packages live in a new top-level `runes/` directory, separate from `packages/` (infrastructure). The workspace config in `package.json` adds `"runes/*"`.

```
refract.md/
  packages/                # infrastructure (@refrakt-md/*)
    types/                 # shared interfaces
    runes/                 # core rune schemas + core RuneConfig (@refrakt-md/runes)
    transform/             # identity transform engine + merge utilities + layout configs
    lumina/                # Lumina theme: design tokens, CSS for all runes
    svelte/                # Renderer, ThemeShell, element overrides, behaviors action
    behaviors/             # core rune behaviors
    ...
    # theme-base/ — REMOVED (dissolved into runes, transform, lumina, svelte)
  runes/                   # official rune packages (@refrakt/*)
    marketing/             # @refrakt/marketing
    docs/                  # @refrakt/docs
    learning/              # @refrakt/learning
    storytelling/          # @refrakt/storytelling
    places/                # @refrakt/places
    business/              # @refrakt/business
    design/                # @refrakt/design
    media/                 # @refrakt/media
  site/
  planning/
```

No naming conflict: `packages/runes/` is `@refrakt-md/runes` (core schemas), `runes/marketing/` is `@refrakt/marketing` (official package). Different npm scopes.

---

## Rune Inventory

### What moves where

| Package | Already built | Unbuilt (see unbuilt-runes-spec.md) |
|---------|--------------|-------------------------------------|
| `@refrakt/marketing` | hero, cta, bento, feature, steps, pricing, testimonial, comparison | — |
| `@refrakt/docs` | api, symbol, changelog | — |
| `@refrakt/learning` | howto, recipe | concept, exercise, quiz, glossary, prerequisite, objective |
| `@refrakt/storytelling` | character, realm, faction, lore, plot, bond, storyboard | — |
| `@refrakt/places` | event, map, itinerary | — |
| `@refrakt/business` | cast, organization, timeline | partner, job |
| `@refrakt/design` | swatch, palette, typography, spacing, preview | — |
| `@refrakt/media` | music-playlist, music-recording (redesign needed) | track, playlist, album, artist, video, audio |

**Totals:** 33 already built runes to move, 17 new runes to build, ~30 runes stay in core.

### What stays in core

Per the community-runes-spec, these are universal primitives that ship built-in:

**Prose & Formatting:** hint, details, figure, sidenote, annotate, pullquote, textblock, mediatext, reveal, conversation, embed, gallery*, stat*, math*

**Navigation & Structure:** grid, tabs, accordion, toc, breadcrumb, nav, layout/region, icon

**Data & Code:** datatable, chart, diagram, budget, codegroup, compare, diff, sandbox, form

*gallery, stat, and math are core runes that haven't been built yet — see `planning/unbuilt-runes-spec.md`.

---

## Per-Package Structure

Each official package follows the `RunePackage` structure from `packages/types/src/package.ts`:

```
runes/marketing/
  package.json              # @refrakt/marketing, depends on @refrakt-md/types
  src/
    index.ts                # exports RunePackage registration object
    tags/
      hero.ts               # rune schema (moved from packages/runes/src/tags/)
      cta.ts
      ...
    config.ts               # RuneConfig entries (moved from packages/theme-base/src/config.ts)
  fixtures/
    hero.md                 # inspector fixtures
    cta.md
    ...
  test/
    ...
  # NO CSS — styling lives in theme packages (Lumina, community themes, etc.)
```

### CSS ownership: two-tier model

Rune packages define **structure** (schemas, RuneConfig, behaviors, fixtures). Themes define **appearance** (CSS). This separation is critical for multi-theme support.

**Tier 1 — Official packages (`@refrakt/*`): zero CSS**

Official rune packages ship no CSS. Themes provide all styling:

- A rune package's RuneConfig produces the BEM contract (`.rf-hero`, `.rf-hero__headline`, etc.)
- Lumina writes CSS targeting those selectors using Lumina's design tokens
- A community theme writes completely different CSS targeting the same selectors
- No CSS conflicts, no coupling between rune packages and the token system

**Tier 2 — Third-party packages: optional default CSS**

Third-party community packages (e.g., `@refrakt-community/dnd-5e`) may ship default CSS as a fallback. No existing theme knows about their runes, so without default CSS the runes would render unstyled.

The CSS resolution order is: **theme CSS first → package CSS second**. If a theme provides CSS for a community rune, the theme's CSS wins. If not, the package's default CSS is used.

```
runes/marketing/                    # @refrakt/marketing — official, zero CSS
  src/
    ...
  # NO styles/ directory

node_modules/@refrakt-community/dnd-5e/  # third-party — default CSS as fallback
  src/
    ...
  styles/
    runes/
      dm5e-class.css               # default CSS, used only if theme doesn't provide its own
      dm5e-spell.css
```

**Where CSS lives after breakout:**
- `packages/lumina/styles/runes/` — CSS for core runes + official package runes (hero.css, cta.css, etc.)
- Community themes — write their own CSS for whichever runes they support
- Official rune packages — zero CSS
- Third-party packages — optional default CSS (fallback when no theme provides styling)

The `refrakt inspect --audit` command checks CSS coverage per theme, telling theme developers which rune selectors they haven't styled yet.

### `theme-base` dissolution

`@refrakt-md/theme-base` is dissolved entirely. Its contents are absorbed into existing packages:

| Content | Current location | New location | Rationale |
|---------|-----------------|-------------|-----------|
| Core rune RuneConfigs (~30) | `theme-base/src/config.ts` | `packages/runes/src/config/` | RuneConfig defines HTML structure, not theme appearance — it belongs with the rune schema |
| `mergeThemeConfig()` | `theme-base/src/merge.ts` | `packages/transform/src/merge.ts` | Pure infrastructure utility for the transform engine |
| `applyRuneExtensions()` | `theme-base/src/merge.ts` | `packages/transform/src/merge.ts` | Same — used by the plugin to merge community configs |
| Layout configs (default, docs, blog) | `theme-base/src/layouts.ts` | `packages/transform/src/layouts.ts` | Universal infrastructure consumed by `layoutTransform()` — NOT Lumina-specific (see note below) |
| Empty component registry | `theme-base/svelte/registry.ts` | `packages/svelte/` | Active extension point for custom component overrides (see note below) |
| Table + Pre element overrides | `theme-base/svelte/elements/` | `packages/svelte/src/elements/` | Universal HTML enhancements — Table adds scroll wrapper, Pre adds copy button |
| Behaviors Svelte action | `theme-base/svelte/behaviors.ts` | `packages/svelte/src/behaviors.ts` | Svelte lifecycle wrapper around `initRuneBehaviors` |

**Layout configs are universal, not Lumina-specific.** The `rf-` prefix is the global theme prefix, not a Lumina class convention. The three layout configs define structural BEM contracts (`.rf-docs-sidebar`, `.rf-blog-article__header`, etc.) that `layoutTransform()` in `packages/transform/src/layout.ts` consumes at runtime to produce a tag tree. Any theme can import these same configs and write different CSS. Lumina provides one set of CSS (`packages/lumina/styles/layouts/*.css`); a community theme writes entirely different CSS targeting the same selectors. The configs belong alongside the `layoutTransform` engine in `@refrakt-md/transform`.

**Svelte bits are actively used, not legacy.** Investigation confirmed:
- `registry` — empty by design, but serves as the extension point wired through `setRegistry()` in `ThemeShell` → `getComponent()` in `Renderer`. Users populate it when they need custom Svelte component overrides.
- `elements` (Table.svelte, Pre.svelte) — Table wraps `<table>` in a scroll container with design token borders; Pre adds a copy button with clipboard API and state management. Both require Svelte lifecycle (`$state`, event handlers).
- `behaviors` — Svelte action that handles `initRuneBehaviors()` mount/update/destroy lifecycle. Essential for connecting the framework-neutral behaviors library to Svelte.

All three are consumed by `create-refrakt` (scaffolding) and `lumina` (re-export via `packages/lumina/svelte/`). Moving them to `@refrakt-md/svelte` is the correct destination — they are Svelte-framework integration code, not theme code.

After dissolution, `@refrakt-md/runes` gains a new export — `coreConfig` — which provides the base `ThemeConfig` containing all core rune RuneConfig entries. This is what the pipeline starts with before merging in official/community package configs.

```typescript
// packages/runes/src/config/index.ts
import type { ThemeConfig } from '@refrakt-md/transform';
import { hintConfig } from './hint.js';
import { tabsConfig } from './tabs.js';
// ... all core rune configs

export const coreConfig: ThemeConfig = {
  prefix: 'rf',
  tokenPrefix: 'rf',
  icons: {},
  runes: {
    Hint: hintConfig,
    TabGroup: tabsConfig,
    // ...
  },
};
```

**Dependency impact:** `@refrakt-md/runes` gains a dependency on `@refrakt-md/transform` (for the `RuneConfig` and `ThemeConfig` types). Currently it only depends on `@refrakt-md/types`. This is not circular — `transform` depends on `types`, `runes` would depend on `types` + `transform`.

### Migration steps per package

1. Create `runes/<name>/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Move rune schemas from `packages/runes/src/tags/<rune>.ts`
3. Move `RuneConfig` entries from `packages/theme-base/src/config.ts` into `src/config.ts`
4. Move behaviors from `packages/behaviors/src/behaviors/` if applicable (note: most behaviors stay in core — only `preview` clearly moves to `@refrakt/design`)
5. Export `RunePackage` object from `src/index.ts`
6. Create inspector fixtures as `.md` files in `fixtures/` (currently hardcoded as strings in `packages/cli/src/lib/fixtures.ts` — must migrate to file-based fixtures first, see gap #5)
7. Remove migrated schemas and configs from core packages
8. CSS stays in `packages/lumina/` — no CSS moves
9. Add to `create-refrakt` default installs

Note: No Svelte components need to move — `packages/theme-base/svelte/components/` is empty. All current runes use identity transform + behaviors. If Layer 2 Svelte components are needed in the future (Chart, Map, etc.), the `RunePackage` interface should gain a `components` field and the assembly function should merge component registries.

---

## Infrastructure Gaps

### Already implemented

| Feature | Location |
|---------|----------|
| `RunePackage` type | `packages/types/src/package.ts` |
| `loadRunePackage` / `mergePackages` | `packages/runes/src/packages.ts` |
| SvelteKit plugin integration | `packages/sveltekit/src/plugin.ts` (buildStart hook) |
| CLI integration | `packages/cli/src/bin.ts` (inspect command) |
| Theme config extension | `packages/theme-base/src/merge.ts` (`applyRuneExtensions`) → moves to `packages/transform/` (note: currently never called in the pipeline — must be wired into `assembleThemeConfig()` to apply `RunePackage.extends` entries) |
| Collision detection + `prefer` | `packages/runes/src/packages.ts` (`mergePackages`) |
| Tests | `packages/runes/test/packages.test.ts` (13 scenarios) |

### Gaps to fill

#### 1. Aliases (`runes.aliases` in config)

The spec defines config-level aliases for collision resolution:

```json
{
  "runes": {
    "aliases": {
      "pf-item": "pathfinder-2e:item"
    }
  }
}
```

**What to implement:**
- Add `aliases?: Record<string, string>` to `RefraktConfig.runes` in `packages/types/src/theme.ts`
- Add validation in `packages/sveltekit/src/config.ts`
- Resolve aliases in `mergePackages` — create new tag entries pointing to the aliased package's rune
- The aliased name becomes a first-class tag name in Markdoc, inspector, and theme selectors

#### 2. Local runes (per-project declarations)

The spec defines local runes as highest priority in resolution order. A project author writes rune schemas directly in their project.

**What to implement:**
- Add `runes.local?: Record<string, string>` to `RefraktConfig` — maps rune name to relative path of the rune module
- Load local rune modules in the SvelteKit plugin alongside community packages
- Local runes override everything (community and core) with a build warning

#### 3. Internal qualified identifiers

Every rune gets an internal qualified name: `core:hint`, `dnd-5e:item`, `local:pricing-calculator`.

**What to implement:**
- Track qualified names during `mergePackages` (tag the resolved rune with its source package)
- Use qualified names in inspector output, error messages, and schema references
- Never exposed in Markdoc content — internal only

#### 4. Behavior registration from packages

The `RunePackage` type currently has no `behaviors` field.

**What to implement:**
- Add `behaviors?: Record<string, (el: Element) => (() => void) | void>` to `RunePackage` in `packages/types/src/package.ts`
- In `loadRunePackage`, collect behaviors from packages
- In `mergePackages`, merge behavior registries
- In the SvelteKit plugin, register community behaviors alongside core behaviors

#### 5. Fixture loading from packages

The inspector doesn't load fixtures from installed packages.

**What to implement:**
- Discover `fixtures/` directory in loaded packages (via package.json or convention)
- Include package fixtures in `refrakt inspect --list` and `refrakt inspect --all`
- Fixture format is identical to core fixtures (Markdoc `.md` files)

#### 6. AI prompt extensions

Packages can contribute rune descriptions for AI prompt building.

**What to implement:**
- Add optional `prompt?: string` field to `RunePackageEntry` (markdown description for the AI)
- In `@refrakt-md/ai`, merge community prompt descriptions into mode prompts when generating content

#### 7. `refrakt package validate` command

CLI command for package authors to validate their package before publishing.

**What to implement:**
- New CLI command checking: required files, valid exports, attribute schemas, fixture coverage
- Run inspector tests against all fixtures
- Validate `RunePackage` export structure
- Note: CSS coverage is a theme concern, not a package concern — the audit flag on `refrakt inspect` handles that

#### 8. New project defaults

The `create-refrakt` scaffold should pre-install official packages based on project type.

**What to implement:**
- Template mapping: "landing page" → `@refrakt/marketing`, "docs site" → `@refrakt/docs`, etc.
- Pre-populate `packages` array in `refrakt.config.json`
- Add to `package.json` dependencies

#### 9. Config assembly (`assembleThemeConfig`)

After breakout, the identity transform pipeline needs ALL rune configs (core + official packages + community packages + theme overrides), but `coreConfig` only contains ~30 core runes. Currently the pipeline is:

```
baseConfig (74+ runes) → mergeThemeConfig(base, {icons}) → luminaConfig → createTransform() → identityTransform
```

After breakout it must become:

```
coreConfig (30) + package configs → assembleThemeConfig(configs[], themeOverrides) → fullConfig → createTransform() → identityTransform
```

**What to implement:**

A framework-agnostic assembly function in `@refrakt-md/transform`:

```typescript
// packages/transform/src/assembly.ts
import type { ThemeConfig } from './types.js';
import type { RunePackage } from '@refrakt-md/types';

export function assembleThemeConfig(
  core: ThemeConfig,
  packages: RunePackage[],
  themeOverrides?: Partial<ThemeConfig>
): ThemeConfig {
  // 1. Start with core config
  // 2. Merge each package's RuneConfig entries into .runes
  // 3. Apply theme overrides (icons, prefix, etc.) last
  // Returns the complete ThemeConfig ready for createTransform()
}
```

Framework-specific delivery:

- **SvelteKit:** The plugin calls `assembleThemeConfig()` at build time, exposes the result via `virtual:refrakt/transform`. Site code imports from the virtual module.
- **Future frameworks (Astro, Next, etc.):** Each framework adapter calls the same `assembleThemeConfig()` function, exposed through its own mechanism (Astro integration, Next plugin, etc.).
- **Standalone apps (chat, theme-studio):** Call `assembleThemeConfig()` directly at startup, passing only the packages they need.

The assembly function is pure, synchronous, and framework-agnostic — portability is guaranteed. Only the delivery mechanism differs per framework.

**Source provenance:** The assembled config must track which package each rune came from (core, official package, or community package) and where that package lives on disk. This is needed for CSS resolution — the plugin must know where to look for fallback CSS when the theme doesn't provide its own. The return type should include a `runeSourceMap: Record<string, { source: 'core' | 'package'; packageDir?: string }>` alongside the `ThemeConfig`.

#### 10. Resolution order change

Current: core runes always take priority over community packages.
Spec: local > packages > core (core is lowest priority).

**What to implement:**
- This reversal is necessary for the breakout to work. Once hero moves from core to `@refrakt/marketing`, it IS a package rune — it needs to be discoverable through the package system, not shadowed by a core rune that no longer exists.
- For the transition: dual-register broken-out runes in both core and the official package, with core versions emitting a deprecation warning. Then remove from core.
- `mergePackages` in `packages/runes/src/packages.ts` needs to be updated: instead of skipping community runes that shadow core names, allow package runes to replace core runes (with the core rune as fallback if the package rune fails to load).

---

## Phased Execution

### Phase 1: Dissolve `theme-base`

Before any rune migration, dissolve `@refrakt-md/theme-base` into existing packages. This is a prerequisite because the official rune packages need to export RuneConfigs that the pipeline can merge — and the merge utilities need to be in a stable location (`@refrakt-md/transform`) before packages start depending on them.

1. Move `mergeThemeConfig()` and `applyRuneExtensions()` to `packages/transform/src/merge.ts`
2. Move layout configs to `packages/transform/src/layouts.ts` (alongside the `layoutTransform` engine)
3. Move core RuneConfigs to `packages/runes/src/config/` with a `coreConfig` export
4. Move element overrides (Table.svelte, Pre.svelte), behaviors action, and empty registry to `packages/svelte/`
5. Update all imports across the monorepo
6. Remove `packages/theme-base/`
7. Run full test suite to verify

### Phase 2: Infrastructure gaps

Fill the 10 gaps listed above. This is prerequisite work — the package system must support the full spec before runes can move.

**Priority order within Phase 2:**
1. Config assembly (blocking — the pipeline must assemble full config from core + packages)
2. Resolution order change (blocking for breakout)
3. Behavior registration (needed for interactive rune packages)
4. Aliases (needed for collision resolution with multiple packages)
5. Qualified identifiers (needed for inspector and error messages)
6. Local runes
7. Fixture loading
8. AI prompt extensions
9. `refrakt package validate`
10. New project defaults

### Phase 3: Package scaffolding

Create the 8 official package structures in `runes/` with `package.json`, `tsconfig.json`, and empty `src/index.ts` files. Also:

1. Add `"runes/*"` to `workspaces` in root `package.json`
2. Add `@refrakt/*` to the fixed versioning group in `.changeset/config.json` (currently only covers `@refrakt-md/*` and `create-refrakt`)
3. Update the root `build` script to include `runes/*` packages in the correct position (after `types` + `transform`, before packages that consume them)
4. Verify the monorepo still builds end-to-end

### Phase 4: Rune migration

Move runes package by package, starting with the simplest (all runes already built, no interactive components):

1. `@refrakt/marketing` — 8 runes, all built, mostly identity-transform-only
2. `@refrakt/docs` — 3 runes, all built, identity-transform-only
3. `@refrakt/storytelling` — 7 runes, all built, identity-transform-only
4. `@refrakt/places` — 3 runes, all built, but Map has a Svelte component
5. `@refrakt/business` — 3 built + 2 to build
6. `@refrakt/design` — 5 runes, Preview and Sandbox have components
7. `@refrakt/learning` — 2 built + 6 to build
8. `@refrakt/media` — 2 built (redesign) + 4 to build

### Phase 5: Tooling

- `refrakt package validate` command
- Inspector fixture loading from packages
- AI prompt extension merging

### Phase 6: Site docs reorganization

The rune documentation currently lives flat in `site/content/docs/runes/` (60 `.md` files) with 9 semantic nav categories (Sections, Content, Layout, etc.) defined in `site/content/docs/_layout.md`. After breakout, reorganize to reflect packages:

1. Update the `{% nav %}` sections in `site/content/docs/_layout.md` to group runes by package:
   - **Core** — hint, details, figure, tabs, accordion, chart, diagram, etc. (~30 runes)
   - **@refrakt/marketing** — hero, cta, bento, feature, steps, pricing, testimonial, comparison
   - **@refrakt/docs** — api, symbol, changelog
   - **@refrakt/storytelling** — character, realm, faction, lore, plot, bond, storyboard
   - **@refrakt/places** — event, map, itinerary
   - **@refrakt/business** — cast, organization, timeline
   - **@refrakt/learning** — howto, recipe
   - **@refrakt/design** — swatch, palette, typography, spacing, preview
   - **@refrakt/media** — music-playlist, music-recording
2. Each package section heading should indicate it's a separate install (e.g., link to the package or note `npm install @refrakt/marketing`)
3. Add a rune catalog/overview page listing all packages, what they contain, and install instructions
4. Individual rune doc pages should note which package they belong to (core or `@refrakt/*`)

### Phase 7: Scaffold + defaults

- Update `create-refrakt` templates
- Documentation for package authors on the site

### Editor impact

The editor (`packages/editor/`) is a full consumer of the rune system and needs updates during the breakout:

**Import path changes:**
- `baseConfig` from `@refrakt-md/theme-base` → `coreConfig` from `@refrakt-md/runes` (Phase 1)
- `tags`, `nodes`, `serializeTree` from `@refrakt-md/runes` — still valid, but only includes ~30 core runes after breakout

**The editor needs all runes, not just core.** The editor is another consumer of the full assembled config, like the site. After breakout:
- **Server** (`packages/editor/src/server.ts`): The `handleGetRunes()` function iterates over `allRunes` from `@refrakt-md/runes` to build the rune palette. After breakout, it must also load official/community package runes via `loadRunePackage()` + `mergePackages()`.
- **Client** (`packages/editor/app/src/lib/preview/block-renderer.ts`): Imports `baseConfig` from `@refrakt-md/theme-base` to restore `postTransform` hooks that can't survive JSON serialization. After breakout, this becomes `coreConfig` — but it only covers ~30 core runes. Package rune `postTransform` hooks must also be restored. Solution: the editor server should send the full assembled config (including package RuneConfigs), and the client restores postTransforms from the assembled config rather than from a partial `coreConfig`.

**Hardcoded rune metadata to make dynamic:**
- `CHILD_RUNES` set (29 names, `server.ts:743`): Filters child runes from the palette UI. Should be derived from rune schemas (runes with a parent tag are children) rather than hardcoded, so package runes are automatically handled.
- `RUNE_CATEGORIES` map (7 categories, `server.ts:750`): Groups runes for the palette. After breakout, categories should reflect packages — core runes keep functional categories, package runes get their package name as category (e.g., "Marketing", "Storytelling"). This metadata could come from `RunePackage.displayName`.
- `RUNTIME_ONLY_TYPES` set (`block-renderer.ts:8`): Only 3 Nav runes — all core, no impact.

**Web component registration** (`App.svelte`): Registers `RfDiagram`, `RfSandbox`, `RfMap` from `@refrakt-md/behaviors`. All three behaviors stay in core, so no import changes needed.

**Pre-existing gap: editor doesn't load community packages.** Even before the breakout, the editor can't discover packages from `refrakt.config.json`. The `editCommand()` in `packages/cli/src/commands/edit.ts` loads `RefraktConfig` (which has `config.packages`) but only passes the resolved `themeConfig` to `startEditor()`. The `/api/runes` endpoint and preview pipeline only see core runes. This means community runes don't appear in the palette and fail to parse in preview.

The fix follows the same pattern the SvelteKit plugin (`buildStart` in `packages/sveltekit/src/plugin.ts`) and CLI inspect command already use:
1. Pass `RefraktConfig` (or `config.packages`) through to `startEditor()` via `EditorOptions`
2. Call `loadRunePackage()` + `mergePackages()` on editor startup
3. Feed merged tags into `Markdoc.transform()` in `packages/editor/src/preview.ts`
4. Feed merged rune metadata into the `/api/runes` response
5. Feed merged RuneConfigs into the `themeConfig` sent to the client for preview rendering

This is not caused by the breakout but becomes critical once official packages exist — after breakout, even official `@refrakt/*` packages would be invisible to the editor without this fix. Should be addressed in Phase 2 (infrastructure gaps) or as a prerequisite.

---

## Migration Strategy

### For existing projects

Projects using runes that move out of core need to:

1. Install the relevant official package: `npm install @refrakt/marketing`
2. Add to config: `"packages": ["@refrakt/marketing"]`

### Transition period

During the transition, broken-out runes remain available in core with a deprecation warning:

```
⚠ Rune 'hero' is moving to @refrakt/marketing in the next major version.
  Install: npm install @refrakt/marketing
  Config:  "packages": ["@refrakt/marketing"]
```

The deprecation period lasts one minor version. After that, the rune is removed from core and only available through the package.

### CSS handling

After breakout, CSS follows the two-tier model:

**Official packages:** `packages/lumina/` keeps all its existing CSS — core runes and official package runes alike. Official rune packages contain zero CSS. Lumina is the reference styling for all official runes.

**Third-party packages:** May ship default CSS in a `styles/runes/` directory. The CSS resolution order is theme-first, package-second:

1. Plugin checks the theme's `styles/runes/{block}.css` — if present, use it
2. If not, check the community package's `styles/runes/{block}.css` — if present, use it as fallback
3. If neither exists, the rune renders unstyled (the audit flag warns about this)

**CSS tree-shaking update:** The SvelteKit plugin's tree-shaking currently only checks the theme directory. It must be extended to:
- For each used rune, check the theme's CSS first
- If no theme CSS exists and the rune comes from a community package, check the package's default CSS
- Import from the winning source
- This requires `assembleThemeConfig()` to track which package each rune came from (source provenance)

**Theme authors:** Community themes choose which runes to style; `refrakt inspect --audit` shows coverage gaps. A theme can override community package defaults by placing a CSS file with the same block name in its `styles/runes/` directory.
