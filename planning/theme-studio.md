# Theme Studio — AI-Powered Theme Generator

> **Package:** `apps/theme-studio`
> **Status:** Design proposal
> **Dependencies:** `@refrakt-md/transform`, `@refrakt-md/theme-base`, `@refrakt-md/lumina`, `@refrakt-md/runes`, `@refrakt-md/svelte`, `@refrakt-md/ai`

---

## Overview

A standalone SvelteKit app that lets users create, customize, and export refrakt.md themes through a visual interface backed by AI generation. Users describe a theme in natural language ("dark cyberpunk with neon accents", "warm editorial magazine feel"), see a live preview of runes rendered with the generated tokens, tweak individual values through direct manipulation, and export a complete theme package.

The key insight: ~53 design tokens control the entire visual language. Changing tokens automatically updates all 48+ rune CSS files because rune CSS references tokens exclusively. This means AI-generated tokens produce an immediately usable theme without touching any rune CSS.

---

## Design Principles

1. **Tokens are the product.** The primary output is `tokens/base.css` + `tokens/dark.css`. A token-only theme layered on Lumina's rune CSS is a complete, functional theme.
2. **Show, don't describe.** Every change previews instantly against real rune output — the identity transform pipeline renders actual BEM-classed HTML, not mockups.
3. **AI proposes, user disposes.** AI generates a complete starting point. The user refines individual tokens through direct manipulation (color pickers, sliders, dropdowns). AI can regenerate specific token groups on request.
4. **Progressive depth.** Start with tokens (Tier 1). Optionally customize individual rune CSS (Tier 2). Full custom themes (Tier 3) are a future extension.

---

## Generation Tiers

### Tier 1 — Token Theme (MVP)

Generate `tokens/base.css` and `tokens/dark.css`. Import all of Lumina's rune CSS unchanged. This is the "change the visual language" approach — new colors, fonts, radii, shadows. Zero rune CSS to write.

**Output:**
- `tokens/base.css` — ~53 CSS custom properties on `:root`
- `tokens/dark.css` — dark mode overrides via `[data-theme="dark"]` + `@media (prefers-color-scheme: dark)`
- `manifest.json` — theme metadata

### Tier 2 — Token + Rune CSS Overrides (Future)

Generate tokens plus override CSS for specific runes the user wants to customize. Layers after Lumina's full CSS import.

**Output:** Everything in Tier 1, plus:
- `styles/runes/{block}.css` — per-rune CSS overrides
- Updated `index.css` barrel import

### Tier 3 — Full Custom Theme (Future)

Generate tokens and all 48 rune CSS files from scratch. Requires deep structural knowledge derivable from `baseConfig` + contracts.

---

## Architecture

### App Structure

```
apps/theme-studio/
  src/
    app.html
    app.d.ts
    lib/
      ai/
        prompt.ts           — System prompt for theme generation
        generate.ts         — Token generation + refinement logic
        parse.ts            — Extract CSS from AI responses
      theme/
        tokens.ts           — Token definitions, defaults, categories
        compiler.ts         — Assemble tokens into CSS strings
        dark-mode.ts        — Light↔dark token relationship mapping
      preview/
        pipeline.ts         — Markdoc parse → transform → render pipeline
        fixtures.ts         — Sample rune content for preview
        showcase.svelte     — Rune showcase grid
      state/
        theme.svelte.ts     — Reactive theme state (Svelte 5 runes)
        history.svelte.ts   — Undo/redo stack
      components/
        TokenEditor.svelte  — Color/value editor for a single token
        TokenGroup.svelte   — Grouped token editors (colors, typography, etc.)
        PromptBar.svelte    — AI prompt input
        PreviewPanel.svelte — Live rune preview
        ExportPanel.svelte  — Download/copy theme output
        ThemeHeader.svelte  — Theme name, description, mode toggle
    routes/
      +layout.svelte        — App shell, theme injection
      +page.svelte          — Main studio interface
      api/
        generate/
          +server.ts        — AI generation endpoint
  package.json
  svelte.config.js
  vite.config.ts
  tsconfig.json
```

### Data Flow

```
User prompt ("dark cyberpunk with neon accents")
  → API route → AI provider (Anthropic/Gemini/Ollama)
  → Structured token values (JSON)
  → Token state store (reactive)
  → CSS string assembly
  → Injected as <style> into preview iframe
  → Identity transform renders runes with BEM classes
  → Rune CSS (from Lumina) + generated tokens = styled preview
```

### Package Dependencies

```json
{
  "name": "theme-studio",
  "private": true,
  "type": "module",
  "dependencies": {
    "@markdoc/markdoc": "0.4.0",
    "@refrakt-md/ai": "0.4.0",
    "@refrakt-md/lumina": "0.4.0",
    "@refrakt-md/runes": "0.4.0",
    "@refrakt-md/svelte": "0.4.0",
    "@refrakt-md/theme-base": "0.4.0",
    "@refrakt-md/transform": "0.4.0",
    "@refrakt-md/types": "0.4.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^6.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "svelte": "^5.49.2",
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  }
}
```

---

## Token System

### Token Categories

The AI generates values for all ~53 tokens organized into these groups:

| Category | Tokens | Editor Type |
|----------|--------|-------------|
| **Typography** | `font-sans`, `font-mono` | Font picker (dropdown) |
| **Primary Scale** | `color-primary-50` through `color-primary-950` | Color scale generator (pick base, derive scale) |
| **Core Palette** | `color-text`, `color-muted`, `color-border`, `color-bg`, `color-primary`, `color-primary-hover` | Color pickers |
| **Surfaces** | `color-surface`, `color-surface-hover`, `color-surface-active`, `color-surface-raised` | Color pickers |
| **Semantic** | `color-{info,warning,danger,success}` + `-bg` + `-border` (12 total) | Color pickers (grouped by intent) |
| **Radii** | `radius-sm`, `radius-md`, `radius-lg`, `radius-full` | Pixel sliders |
| **Shadows** | `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg` | Shadow editor (visual) |
| **Code** | `color-code-bg`, `color-code-text`, `color-inline-code-bg` | Color pickers |
| **Syntax** | 7 Shiki tokens (`--shiki-token-keyword`, etc.) | Color pickers |

### Token Definition Format

```typescript
interface TokenDefinition {
  name: string;            // CSS property name without prefix: "color-primary"
  cssVar: string;          // Full CSS var: "--rf-color-primary"
  category: TokenCategory;
  type: 'color' | 'font' | 'size' | 'shadow';
  default: string;         // Lumina's default value
  description: string;     // Human-readable purpose
}
```

A static registry of all tokens with their metadata, defaults, and categories. This drives both the AI prompt (telling it what to generate) and the editor UI (what controls to render).

### Light/Dark Token Relationships

Dark mode tokens follow predictable patterns relative to light mode:

- **Text/muted**: Invert lightness (dark text → light text)
- **Backgrounds**: Dark equivalents of light surfaces
- **Primary scale**: Shift toward lighter values for readability on dark backgrounds
- **Borders**: `rgba(255, 255, 255, 0.1)` pattern instead of named colors
- **Semantic colors**: Same hue, adjusted lightness + use `rgba()` for backgrounds
- **Shadows**: Higher opacity for visibility on dark surfaces

The AI generates both light and dark tokens together, but the UI can auto-derive reasonable dark mode defaults from light mode choices when the user manually edits individual tokens.

---

## AI Generation

### System Prompt Strategy

Theme generation requires a different system prompt than content authoring. The prompt teaches the AI about:

1. **Token vocabulary** — the complete list of CSS custom properties, their naming convention (`--rf-{category}-{name}`), and what each one controls
2. **Design constraints** — tokens must form a coherent system (primary scale must be monotonic, semantic colors need sufficient contrast, surfaces need hierarchy)
3. **Output format** — structured JSON mapping token names to CSS values
4. **Dark mode rules** — relationship between light and dark token sets

```typescript
// Simplified prompt structure
const THEME_SYSTEM_PROMPT = `
You are a theme designer for refrakt.md.

Given a description, generate CSS design tokens that form a coherent visual theme.

## Token List
${tokenDefinitions.map(t => `- ${t.cssVar}: ${t.description} (type: ${t.type})`).join('\n')}

## Rules
- Primary scale: 10 shades from lightest (50) to darkest (950), monotonically increasing in darkness
- Semantic colors: info=blue family, warning=amber/orange, danger=red, success=green/teal (each needs main + bg + border)
- Surfaces: bg → surface → surface-hover → surface-active must form a visible hierarchy
- Contrast: text on bg must meet WCAG AA (4.5:1 minimum)
- Radii: sm < md < lg, full=9999px
- Shadows: progressive depth from xs to lg

## Output Format
Return a JSON object with two keys: "light" and "dark".
Each contains a flat map of token names (without --rf- prefix) to CSS values.
`;
```

### Generation Endpoint

```typescript
// POST /api/generate
// Request: { prompt: string, provider?: string, model?: string, current?: TokenValues }
// Response: SSE stream of JSON chunks

// The endpoint:
// 1. Builds system prompt with token vocabulary
// 2. Includes current token state (if refining, not generating from scratch)
// 3. Streams response from AI provider
// 4. Client-side parser extracts JSON from response
```

### Refinement Flow

After initial generation, the user can ask the AI to refine specific aspects:

- "Make the primary color warmer"
- "Increase contrast between text and background"
- "Make the shadows more subtle"
- "Use a monospace font for everything"

The refinement prompt includes the current token state so the AI can make targeted adjustments rather than regenerating everything.

### Response Parsing

The AI returns a JSON object. The parser:

1. Extracts JSON from the response (handles markdown code fences, preamble text)
2. Validates token names against the known registry
3. Validates value types (colors are valid CSS colors, sizes are valid CSS lengths)
4. Falls back to Lumina defaults for any missing tokens
5. Returns a typed `TokenValues` object

```typescript
interface TokenValues {
  light: Record<string, string>;  // token name → CSS value
  dark: Record<string, string>;
}
```

---

## Preview System

### Rune Showcase

The preview panel displays a curated set of runes rendered through the full identity transform pipeline. This is not a mockup — it uses the actual `@refrakt-md/transform` engine with `@refrakt-md/lumina`'s rune CSS, overlaid with the generated tokens.

### Fixture Content

Static Markdoc snippets covering the most visually distinct runes:

| Fixture | Runes Exercised | What It Tests |
|---------|-----------------|---------------|
| Hero section | Hero (center + left aligned) | Primary colors, typography, buttons, shadows |
| Hint variants | Hint (note, warning, caution, check) | All 4 semantic colors, borders, icons |
| Pricing table | Pricing + Tier + FeaturedTier | Surfaces, borders, radii, featured accent |
| Tab group | TabGroup + Tab | Surface hierarchy, active states, borders |
| Code block | Fenced code | Code background, syntax highlighting tokens |
| Steps list | Steps + Step | Sequential layout, counters, primary accent |
| Feature grid | Grid + Feature | Card layout, surface colors, shadows |
| Timeline | Timeline + TimelineEntry | Line/dot accents, alternating layout |
| Recipe card | Recipe | Metadata display, badge styling |
| Data table | DataTable | Table styling, alternating rows, headers |
| Accordion | Accordion + AccordionItem | Expand/collapse, borders, surface states |
| General prose | Headings, paragraphs, links, lists, blockquotes, inline code | Typography, text color, link color, muted color |

Each fixture is a string of Markdoc content that gets parsed, transformed, serialized, and identity-transformed on the client. The Svelte Renderer displays the result inside an iframe that loads Lumina's rune CSS + the generated token stylesheet.

### Preview Rendering Pipeline

```typescript
import Markdoc from '@markdoc/markdoc';
import { tags } from '@refrakt-md/runes';
import { serializeTree } from '@refrakt-md/svelte';
import { identityTransform } from '@refrakt-md/lumina/transform';

function renderFixture(markdoc: string): SerializedTag {
  const ast = Markdoc.parse(markdoc);
  const transformed = Markdoc.transform(ast, { tags });
  const serialized = serializeTree(transformed);
  return identityTransform(serialized);
}
```

The rendered tree is passed to `Renderer.svelte` from `@refrakt-md/svelte` inside the preview panel.

### Preview Iframe Strategy

The preview renders inside an iframe to achieve complete CSS isolation:

1. The iframe loads Lumina's full `index.css` (rune CSS + default tokens)
2. A `<style>` tag is injected **after** Lumina's CSS, overriding `:root` tokens with generated values
3. Token changes update only the injected `<style>` — no re-render of the rune HTML needed
4. Light/dark mode toggle swaps `data-theme` attribute on the iframe's `<html>` element

This approach means:
- Rune CSS never needs regeneration (Tier 1)
- Token changes are instant (CSS cascade, no JS)
- The preview is pixel-accurate to how the theme will look in production

---

## User Interface

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Theme Studio          [Theme Name]     [Light ◐ Dark]       │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│  Token       │  Preview Panel                                │
│  Editor      │                                               │
│              │  ┌─────────────────────────────────────────┐  │
│  ┌────────┐  │  │  Hero Section                           │  │
│  │ Colors │  │  │  ═══════════                            │  │
│  │ ●●●●●  │  │  │  Hints (note, warning, caution, check) │  │
│  │        │  │  │  Pricing Table                          │  │
│  │ Typo   │  │  │  Tabs                                   │  │
│  │ Aa Bb  │  │  │  Code Block                             │  │
│  │        │  │  │  Steps                                  │  │
│  │ Radii  │  │  │  Feature Grid                           │  │
│  │ ▢ ▢ ▢  │  │  │  ...                                   │  │
│  │        │  │  │                                         │  │
│  │ Shadow │  │  └─────────────────────────────────────────┘  │
│  │ ░░░░░  │  │                                               │
│  └────────┘  │                                               │
│              │                                               │
├──────────────┴───────────────────────────────────────────────┤
│  [✦ Describe your theme...]                       [Generate] │
└──────────────────────────────────────────────────────────────┘
```

### Panels

**Prompt Bar** (bottom): Text input for AI generation/refinement. "Dark cyberpunk with neon accents" or "Make the shadows more dramatic". Supports initial generation and iterative refinement.

**Token Editor** (left sidebar): Grouped editors for all token categories. Each group is collapsible. Individual tokens show:
- Token name and description
- Current value (visual preview — color swatch, font sample, radius preview)
- Editor control (color picker, font dropdown, pixel slider, shadow editor)
- Reset button (back to AI-generated or Lumina default)

**Preview Panel** (main area): Scrollable showcase of rune fixtures rendered with current tokens. Light/dark mode toggle in the header. Responsive — shows how runes look at different widths.

### Interactions

| Action | Result |
|--------|--------|
| Type prompt + Generate | AI generates all tokens, preview updates, editor populates |
| Edit single token | Preview updates instantly (CSS variable change) |
| Toggle light/dark | Preview switches mode, editor shows corresponding token set |
| Type refinement prompt | AI adjusts specific tokens, preserving manual edits where possible |
| Undo/Redo | Token state reverts/reapplies (full snapshot) |
| Export | Download theme package as zip or copy CSS to clipboard |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Ctrl+Enter` / `Cmd+Enter` | Submit prompt |
| `Ctrl+E` / `Cmd+E` | Toggle export panel |
| `Ctrl+D` / `Cmd+D` | Toggle light/dark preview |

---

## State Management

### Theme State Store

```typescript
// lib/state/theme.svelte.ts
interface ThemeState {
  name: string;
  description: string;
  tokens: {
    light: Record<string, string>;  // token name → value
    dark: Record<string, string>;
  };
  overrides: {
    light: Set<string>;  // tokens manually edited by user
    dark: Set<string>;
  };
  mode: 'light' | 'dark';
}
```

The `overrides` sets track which tokens the user has manually edited. When the AI regenerates, it preserves overridden tokens unless explicitly told to reset them. This enables iterative refinement: generate a base, hand-tune a few values, ask AI to adjust the rest.

### History Store

```typescript
// lib/state/history.svelte.ts
interface HistoryEntry {
  tokens: ThemeState['tokens'];
  overrides: ThemeState['overrides'];
  label: string;  // "AI generation", "Edit --rf-color-primary", etc.
}
```

Captures full token snapshots on each meaningful change (AI generation, manual edit, batch operation). Provides undo/redo with human-readable labels.

---

## Export

### Theme Package Output

The export produces a downloadable zip or copyable file set:

```
my-theme/
  package.json            — Package metadata
  manifest.json           — Theme config (name, prefix, darkMode)
  src/
    config.ts             — mergeThemeConfig(baseConfig, { icons: {...} })
    transform.ts          — createTransform(config) re-export
  tokens/
    base.css              — Generated light mode tokens
    dark.css              — Generated dark mode tokens
  svelte/
    index.ts              — Re-export from @refrakt-md/theme-base
  index.css               — Imports Lumina base + token overrides
```

### `index.css` Strategy

The generated `index.css` imports Lumina's full CSS as a base, then the custom tokens override via cascade:

```css
/* Import Lumina's complete rune CSS + default tokens */
@import '@refrakt-md/lumina/index.css';

/* Override with custom tokens */
@import './tokens/base.css';
@import './tokens/dark.css';
```

Because Lumina's rune CSS references tokens via `var(--rf-*)`, the custom tokens take precedence and restyle everything.

### `config.ts`

```typescript
import { baseConfig, mergeThemeConfig } from '@refrakt-md/theme-base';

export const myThemeConfig = mergeThemeConfig(baseConfig, {
  // Icons inherited from base (Lumina provides SVGs)
});
```

For Tier 1 (token-only), the config is identical to Lumina's — no rune config overrides needed.

### Copy-to-Clipboard

For quick use without a full package, users can copy:
- Just `base.css` content
- Just `dark.css` content
- Both together
- The full `index.css` with imports

---

## Distribution & Installation

The current theme system resolves themes via Node module resolution — the `theme` field in `refrakt.config.json` is used as a bare specifier in `import()`, `import.meta.resolve()`, and generated virtual module imports (`plugin.ts:35,66,72`, `virtual-modules.ts:55,61-63`). This means a theme must be resolvable by Node, but it does **not** have to come from the npm registry.

### Strategy: Two installation paths

#### Path 1: CLI Install Command (MVP)

Theme Studio exports a tarball (`.tgz`). A CLI command installs it into the project:

```bash
npx refrakt theme install ./my-theme-1.0.0.tgz
```

Under the hood:
1. Detect the user's package manager (`npm`, `pnpm`, `yarn`, `bun`) via lockfile heuristic
2. Run the appropriate install command (e.g., `npm install file:./my-theme-1.0.0.tgz`)
3. Read the `name` field from the tarball's `package.json`
4. Update `refrakt.config.json` to set `"theme": "<package-name>"`

The theme lands in `node_modules/` and is fully resolvable by all existing import paths. No changes to the SvelteKit plugin required.

**User experience:**
```
1. Build theme in Theme Studio
2. Download my-theme-1.0.0.tgz
3. npx refrakt theme install ./my-theme-1.0.0.tgz
4. npm run dev — site is restyled
```

**Tarball contents** (produced by `npm pack` on the exported theme directory):

```
package/
  package.json            — name, version, exports map
  manifest.json           — theme metadata
  dist/
    config.js             — compiled mergeThemeConfig() call
    config.d.ts
    transform.js          — createTransform(config) re-export
    transform.d.ts
  tokens/
    base.css              — generated light mode tokens
    dark.css              — generated dark mode tokens
  svelte/
    index.ts              — SvelteTheme re-export
    tokens.css            — CSS bridge (imports index.css)
  styles/
    runes/                — empty for Tier 1, populated for Tier 2+
  index.css               — barrel import (Lumina base + token overrides)
  base.css                — tokens + global + layouts (no runes)
```

The `package.json` inside the tarball includes the same `exports` map pattern as Lumina, ensuring all subpath imports work:

```json
{
  "name": "my-theme",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./index.css",
    "./base.css": "./base.css",
    "./transform": { "default": "./dist/transform.js" },
    "./svelte": { "svelte": "./svelte/index.ts", "default": "./svelte/index.ts" },
    "./styles/runes/*.css": "./styles/runes/*.css",
    "./svelte/tokens.css": "./svelte/tokens.css"
  },
  "dependencies": {
    "@refrakt-md/theme-base": "^0.4.0",
    "@refrakt-md/transform": "^0.4.0",
    "@refrakt-md/lumina": "^0.4.0"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "peerDependenciesMeta": {
    "svelte": { "optional": true }
  }
}
```

Note: `@refrakt-md/lumina` is listed as a dependency because Tier 1 themes import Lumina's rune CSS via `@import '@refrakt-md/lumina/index.css'` in their `index.css`. The user's project already has Lumina (or it gets installed transitively).

**Updating a theme:** Re-run `npx refrakt theme install ./my-theme-1.1.0.tgz`. The CLI detects the existing theme, bumps the version, and reinstalls. No manual `package.json` edits needed.

#### Path 2: Local Directory Resolution (Follow-up)

For a zero-install experience, extend the SvelteKit plugin to resolve local directory paths as themes:

```jsonc
// refrakt.config.json
{
  "theme": "./themes/my-theme",
  "target": "svelte",
  "contentDir": "./content"
}
```

The user unzips the exported theme into `themes/my-theme/` and points the config at it. No `npm install` step.

**Plugin changes required:**

The plugin detects relative paths (starts with `./` or `../`) and adjusts resolution:

1. **`plugin.ts` config hook** — resolve the relative path to an absolute path. Add Vite `resolve.alias` entries so that bare specifier sub-path imports work:

```typescript
// When theme starts with './' or '../':
const absTheme = resolve(resolvedRoot, refraktConfig.theme);
config.resolve.alias = {
  [themeName]: absTheme,                          // 'my-theme' → '/abs/themes/my-theme'
  [`${themeName}/transform`]: `${absTheme}/dist/transform.js`,
  [`${themeName}/svelte`]: `${absTheme}/svelte/index.ts`,
  [`${themeName}/base.css`]: `${absTheme}/base.css`,
  [`${themeName}/svelte/tokens.css`]: `${absTheme}/svelte/tokens.css`,
};
```

2. **`plugin.ts` buildStart** — use `resolve()` instead of `import.meta.resolve()` to locate the theme root for CSS tree-shaking.

3. **`virtual-modules.ts`** — no changes needed if aliases are set up correctly; the generated import statements still use the theme name as a specifier, and Vite resolves them through aliases.

4. **SSR noExternal** — the local path must also be added, or marked as `external: false`, so Vite bundles it during SSR.

**Exported directory structure** is identical to the tarball contents (minus the `package/` wrapper). Theme Studio provides a "Download as ZIP" option that extracts directly into the project.

**User experience:**
```
1. Build theme in Theme Studio
2. Download my-theme.zip
3. Unzip into ./themes/my-theme/
4. Set "theme": "./themes/my-theme" in refrakt.config.json
5. npm run dev — site is restyled
```

### Why both paths?

| | CLI Install (tarball) | Local Directory |
|---|---|---|
| **Plugin changes** | None | Alias resolution + path detection |
| **npm install needed** | Yes (automated by CLI) | No |
| **Version management** | npm handles it | Manual (overwrite directory) |
| **Lockfile tracking** | Yes — pinned version | No |
| **CI reproducibility** | Excellent — lockfile pins exact version | Depends on committing the theme dir |
| **Peer deps** | Resolved automatically by npm | Must be installed separately |
| **Multiple themes** | Switch by changing config + installing | Switch by changing config path |

The tarball/CLI path is the safe default — it works within the existing npm ecosystem, gives version tracking, and requires zero plugin changes. The local directory path is a convenience feature that removes friction for rapid iteration ("download, unzip, done") at the cost of plugin complexity.

### CLI Command Specification

```
refrakt theme install <path>     Install a theme from a .tgz tarball
refrakt theme install <name>     Install a theme from the npm registry
refrakt theme list               List available themes (registry + local)
refrakt theme info               Show current theme details
```

`refrakt theme install` implementation:

```typescript
async function themeInstall(source: string): Promise<void> {
  // 1. Detect package manager
  const pm = detectPackageManager();  // npm | pnpm | yarn | bun

  // 2. Read theme name from tarball or registry
  const themeName = source.endsWith('.tgz')
    ? readNameFromTarball(source)
    : source;

  // 3. Install
  const installCmd = {
    npm:  `npm install ${source}`,
    pnpm: `pnpm add ${source}`,
    yarn: `yarn add ${source}`,
    bun:  `bun add ${source}`,
  }[pm];
  await exec(installCmd);

  // 4. Update refrakt.config.json
  const config = loadRefraktConfig('./refrakt.config.json');
  config.theme = themeName;
  writeFileSync('./refrakt.config.json', JSON.stringify(config, null, '\t') + '\n');

  console.log(`Theme "${themeName}" installed and set as active theme.`);
}
```

---

## Persistence

### Local Storage

Theme state persists to `localStorage` (or IndexedDB via the `idb` package, matching the chat app pattern):

- Current theme tokens (light + dark)
- Theme name and description
- User overrides (which tokens were manually edited)
- Generation history (last N prompts + results)

### URL State

Theme tokens can be encoded into a shareable URL parameter (compressed JSON). This enables:
- Sharing themes via link
- Bookmarking work in progress
- Embedding previews in documentation

---

## Implementation Plan

### Phase 1 — Core Pipeline (Foundation)

1. **Scaffold app** — SvelteKit project in `apps/theme-studio/` with package.json, configs
2. **Token registry** — Static definition of all ~53 tokens with metadata, categories, defaults
3. **Theme state store** — Svelte 5 runes-based reactive state for token values + overrides
4. **CSS compiler** — Assemble token values into valid `base.css` and `dark.css` strings
5. **Preview pipeline** — Markdoc parse → transform → serialize → identity transform → render in iframe with token injection

### Phase 2 — AI Generation

6. **Theme system prompt** — Token vocabulary, design constraints, output format
7. **Generation endpoint** — SSE streaming API route using `@refrakt-md/ai` provider infrastructure
8. **Response parser** — Extract and validate token JSON from AI response
9. **Refinement flow** — Include current state in prompt for targeted adjustments

### Phase 3 — Editor UI

10. **App shell** — Layout with sidebar, preview panel, prompt bar
11. **Token editors** — Color pickers, font dropdowns, size sliders, shadow editors grouped by category
12. **Preview panel** — Iframe-based rune showcase with light/dark toggle
13. **Prompt bar** — Text input with generate/refine mode

### Phase 4 — Export & Distribution

14. **Export package** — Assemble theme directory with package.json, exports map, tokens, CSS, config
15. **Tarball download** — `npm pack` equivalent in-browser (tar.gz generation)
16. **ZIP download** — For local directory installation path
17. **`refrakt theme install` CLI** — Detect package manager, install tarball, update config

### Phase 5 — Polish

18. **Undo/redo** — History stack with snapshot labels
19. **Persistence** — localStorage/IndexedDB for session state
20. **URL sharing** — Compressed token state in URL parameters
21. **Local directory plugin support** — Extend SvelteKit plugin to resolve `./` theme paths via Vite aliases

---

## Decisions

### Why iframe for preview?

CSS isolation. The studio's own UI uses its own styles. The preview must render with Lumina's rune CSS + generated tokens without interference. An iframe provides a clean document context — identical to how the theme will work in production.

### Why not generate rune CSS in Tier 1?

Lumina's rune CSS is already written, tested, and references tokens exclusively. Generating 48 CSS files adds enormous complexity and error surface for zero visual benefit — the tokens already control every visual property. Tier 1 gets 95% of the way there with ~53 token values.

### Why stream the AI response?

Token generation involves substantial AI reasoning (color theory, accessibility math, design coherence). Streaming shows progress and lets the UI update progressively — e.g., populating color swatches as they arrive rather than waiting for the full response.

### Why SvelteKit (not a static SPA)?

The AI provider calls require server-side API keys. SvelteKit's API routes handle this cleanly. The app could be deployed as a static SPA with client-side AI calls in the future, but the server route pattern matches the existing chat app and keeps keys off the client.

### Why not extend the existing chat app?

Theme generation is a fundamentally different interaction model. The chat app is a conversation with document curation. Theme Studio is a visual editor with AI assistance. Separate apps avoid UI compromises and keep each focused on its purpose.

---

## Future Extensions

### Tier 2: Rune CSS Overrides

- Select a rune from the showcase → open a per-rune CSS editor
- AI generates CSS based on the rune's contract (selectors from `generateStructureContract()`)
- `refrakt inspect <rune> --json` provides the exact HTML structure to style against
- Override CSS layers after Lumina's rune CSS in the cascade

### Tier 2: Icon Customization

- Upload custom SVG icons for hint variants (note, warning, caution, check)
- Preview icons in context within the hint fixture
- Export includes icon overrides in `config.ts`

### Preset Gallery

- Curated starter themes ("Corporate", "Playful", "Minimal", "Dark Terminal")
- One-click apply, then customize
- Community-submitted presets

### Figma/Design Tool Export

- Export tokens as Figma variables JSON
- Export as Style Dictionary format
- CSS-in-JS token object export

### Accessibility Audit

- Real-time WCAG contrast checks on text/background combinations
- Warnings when semantic colors lack sufficient contrast
- Auto-fix suggestions (adjust lightness to meet AA/AAA)
