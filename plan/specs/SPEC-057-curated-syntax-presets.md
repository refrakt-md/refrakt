{% spec id="SPEC-057" status="shipped" tags="theme, presets, syntax-highlighting, lumina, curated-palettes" released-in="v0.14.2" %}

# Curated syntax preset lineup — Phase 1

Ship six widely-recognised, well-licensed syntax palettes as first-party refrakt presets — **Dracula, Solarized, Catppuccin, Tokyo Night, One Dark, Gruvbox** — following the pattern established by {% ref "WORK-220" /%} (Nord) under {% ref "SPEC-056" /%}. Each palette becomes a `ThemeTokensConfig` module under `packages/lumina/src/presets/`, gets a documentation page under `/themes/`, and is registered in the refrakt docs site's `theme.tints` for live showcase rendering. No architectural changes — this spec is the *application* of SPEC-056 to a curated lineup.

This is Phase 1 of a longer roadmap. Phase 2 candidates (GitHub Light/Dark, Ayu, Rosé Pine, Monokai, Kanagawa, additional Catppuccin and Tokyo Night flavours) are listed in "Out of scope" so the door is open without committing to them now.

## Problem

SPEC-056 widened the syntax token contract and proved the mechanism on Nord. The lineup at v0.14.1 is:

- **Lumina neutral default** — the built-in chrome + neutral syntax everyone gets out of the box.
- **Tideline** — Lumina's cream + maritime navy chrome preset.
- **Niwaki** — refrakt's own scoped Japanese-garden syntax-only preset.
- **Nord** — the first imported third-party palette, integrated (chrome + canvas + foreground).

That's enough to *demonstrate* the architecture but not enough to satisfy users who want their site to feel like their preferred editor. Most refrakt users picking a theme want to choose from palettes they already know and love, not learn refrakt-internal vocabulary. The architecture is ready; the catalog isn't.

This spec is application work, not architecture work. Each preset is roughly 50–80 lines of `ThemeTokensConfig` plus a doc page; the implementation pattern is the one validated on Nord. Risk is low; volume is the main cost.

## Design Principles

**One preset per palette identity, not per flavour.** Palettes with explicit light + dark variants from the same author (Solarized, Catppuccin, Gruvbox) ship as a single preset using `modes.dark` for the dark overlay. Users select the rendering mode via `theme.colorScheme` or page-level cascade, not by picking a different preset. This keeps the catalog small and matches the "one Nord, one Niwaki" precedent.

**Canonical pair only for multi-flavour palettes.** Catppuccin has four flavours (Latte / Frappé / Macchiato / Mocha); Tokyo Night has three (Storm / Moon / Day). Phase 1 ships the canonical light+dark pairing per palette (Catppuccin Latte+Mocha, Tokyo Night Day+Storm) and defers the mid-darks to a future milestone if there's demand. The mechanism doesn't preclude additional flavour presets — it just doesn't require them right now.

**Integrated, not scoped.** Every palette in this lineup ships with a canonical canvas tuned together with its foreground. They claim chrome accents + code surface + syntax, like Nord, not foreground-only, like niwaki. Niwaki remains the only scoped-archetype preset in the catalog.

**Attribution is part of the deliverable.** Every imported preset module carries an attribution header naming the original author(s), the source URL, and the licence (all six are MIT or equivalent). Every doc page carries the same attribution at the bottom.

**No architectural changes.** This spec is forbidden from modifying `SyntaxTokens`, `TintDefinition`, the scope-eligibility filter, the extended Shiki theme, or the generator. If a palette can't be expressed cleanly under the existing contract, the palette is deferred — not the contract revised.

## The curated lineup

Six palettes chosen for distinctive visual identity, clean licensing, breadth of role-split exercise, and diversity of colour temperature. Each entry below names the rationale, the light/dark shape, and a sketch of the role mapping that the work item will refine.

### Dracula

Purple/pink/cyan on near-black. Created by Zeno Rocha; one of the most installed editor themes on the planet. MIT licensed (https://github.com/dracula/dracula-theme).

- **Shape**: dark-canonical, integrated. No official light variant — would ship as dark-only (the preset's `modes.dark` carries the canonical values; light mode falls back to a darkened version or matches Dracula's "Alucard" sibling if author permits; otherwise we ship as a dark-only preset and note it).
- **Why include**: peak name recognition. Splits `keyword` (Pink), `function` (Green), `type` (Cyan), `string` (Yellow), `constant` (Purple) — exercises SPEC-056's extended roles at full fidelity.

### Solarized

Light and dark, the same 16 hues from Ethan Schoonover's 2011 palette. MIT licensed (https://github.com/altercation/solarized).

- **Shape**: integrated, both modes from the same hue family (the only palette in the lineup designed *deliberately* around mode-symmetric canvases). Light = `base3` canvas + `base00` text; dark = `base03` canvas + `base0` text. Same accents (yellow/orange/red/magenta/violet/blue/cyan/green) in both modes.
- **Why include**: historical importance (most-cloned palette ever), and the test case for our "unified light+dark preset" shape. Validates that our `modes.dark` mechanism handles palettes whose authors *want* the modes coordinated, not independent.

### Catppuccin

Modern soft-pastel family, four flavours. Phase 1 ships **Latte** (light) + **Mocha** (dark) as the canonical pair. MIT licensed (https://github.com/catppuccin/catppuccin), unusually well-spec'd palette docs.

- **Shape**: integrated, light + dark from the same named-swatch family. Each flavour uses the same role assignments with different absolute values, so the role mapping written for Mocha translates structurally to Latte.
- **Why include**: currently very popular; well-documented spec means our mapping can be precise; demonstrates the "canonical pair only" multi-flavour decision. Frappé and Macchiato can be Phase 2 additions if there's demand.

### Tokyo Night

Dark blue + magenta + cyan. Created by Enkia. MIT licensed (https://github.com/enkia/tokyo-night-vscode-theme). Phase 1 ships **Storm** (dark) + **Day** (light) as the canonical pair.

- **Shape**: integrated. Storm uses `#1a1b26` canvas; Day uses `#e1e2e7`. Distinctive role splits — `type` (cyan) ≠ `function` (blue) ≠ `parameter` (orange) ≠ `keyword` (magenta) ≠ `number` (orange-distinct-from-constant).
- **Why include**: exercises the SPEC-056 widened contract more thoroughly than any other lineup member. If Tokyo Night maps cleanly, the contract works for the maximally split-out palettes too.

### One Dark

Atom's signature dark theme. Created by GitHub's Atom team. MIT licensed (https://github.com/atom/atom/tree/master/packages/one-dark-syntax). Phase 1 ships dark only — official "One Light" sibling deferred to Phase 2.

- **Shape**: dark-only initially. Blue-grey canvas (`#282c34`), red/green/yellow/cyan/blue/purple accents.
- **Why include**: fills the "modern blue-grey dark" niche distinct from Tokyo Night's saturation. Historical importance — Atom was the first widely-adopted editor with custom theme APIs.

### Gruvbox

Warm retro palette. Created by Pavel Pertsev. MIT licensed (https://github.com/morhetz/gruvbox). Phase 1 ships **dark medium** + **light medium** as the canonical pair.

- **Shape**: integrated, light + dark variants from coordinated hues. Earthy: orange keywords, deep green functions, mustard strings, warm-red diagnostic colour.
- **Why include**: the only warm palette in the lineup. Five blue/cool members + one warm gives the catalog visual variety. Gruvbox is also the most "unix terminal heritage" of the lineup — important counterweight to the JS-editor-modern bias of Tokyo Night / Catppuccin.

## Authoring Surface

No new authoring surface. Every preset uses the same opt-in mechanism Nord uses:

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/dracula"]
    }
  }
}
```

And the same scoped-tint registration for showcase pages:

```jsonc
{
  "tints": {
    "dracula": { "extends": "@refrakt-md/lumina/presets/dracula" }
  }
}
```

The refrakt docs site's `tints` config will gain entries for all six during this milestone so each preset's doc page can use `tint="<name>"` on palettes and the live preview codegroup.

## Doc page structure

Every preset doc page follows the structure validated on Nord:

1. **Title + intro** — palette identity, author, integrated-vs-scoped position, attribution sentence
2. **Opt in** — config snippet
3. **The palette** — two `{% palette %}` blocks (light + dark, both `tint="<preset>"`) with named swatches
4. **Live preview** — the shared TypeScript+JSX snippet wrapped in `{% codegroup tint="<preset>" %}`
5. **Composing with X** — a composition example with at least one other preset
6. **Attribution** — full credit + licence

The TypeScript+JSX snippet stays identical across all preset pages so readers can directly compare palettes by toggling between pages without re-reading the example.

## Out of scope

- **Architectural changes** — see "Design Principles" above. This spec is application work only.
- **GitHub Light / Dark** — universal recognition but optimised for "match what you see at github.com" rather than aesthetic choice. Phase 2 candidate.
- **Monokai (original)** — historical importance, but the modern incarnation (Monokai Pro) is paid and the brand is fragmented. Easier as Phase 2 once we've established the import pattern more broadly.
- **Ayu, Rosé Pine, Kanagawa** — strong palettes, but Phase 1 has to stop somewhere. Easy Phase 2 additions.
- **Additional Catppuccin / Tokyo Night flavours** — Frappé, Macchiato, Tokyo Night Moon. The mechanism doesn't preclude them; Phase 2 if there's demand.
- **Per-preset Plugin packages** — palettes stay inside `@refrakt-md/lumina/presets/` for v1.x. Splitting into per-palette plugin packages is a packaging decision, not a content decision, and is out of scope here.
- **Light-only or dark-only mode locks per preset** — the user chooses via `theme.colorScheme`; presets ship both modes when the source palette has both. No `dracula-light` / `dracula-dark` split presets.

## Validation

The spec is validated by all six preset doc pages rendering on the refrakt documentation site (whose active preset is niwaki) with their respective palettes correctly scoped to the palette swatches and code preview. Specifically:

1. Each preset's palette swatches sit on the preset's canonical canvas (not niwaki's).
2. Each preset's live code preview renders with the preset's syntax tokens *and* the preset's code-surface canvas.
3. The surrounding page chrome (header, nav, prose) stays in niwaki on every preset doc page — no leakage.
4. Each preset composes cleanly with tideline (`["tideline", "<preset>"]`) — tideline typography survives, preset chrome + syntax wins.
5. Each preset module ships with attribution in the file header.
6. The themes catalog landing page (`/themes/themes-catalog`) lists all six in the "Syntax presets" group (renamed to "Imported syntax presets" if useful — see open question below).
7. No new tests fail; existing tests stay green. CSS coverage tests still pass for Lumina.
8. The light-mode + dark-mode toggle on each preset doc page flips both the page chrome and the tinted regions correctly.

## Acceptance Criteria

- Six preset modules added under `packages/lumina/src/presets/`: `dracula.ts`, `solarized.ts`, `catppuccin.ts`, `tokyo-night.ts`, `one-dark.ts`, `gruvbox.ts`.
- Each module exports a `ThemeTokensConfig` with chrome accents, `color.code.*`, and `syntax.*` for both light (when applicable) and dark modes via `modes.dark`. Single-mode palettes (Dracula, One Dark in Phase 1) ship dark-only and that's explicit in the file header.
- Each module's file header includes attribution: author, source URL, licence.
- `packages/lumina/package.json` exports each new preset path (`./presets/dracula`, etc.).
- A test file per preset under `packages/lumina/test/` mirroring `nord-preset.test.ts` — verifies structural shape, role-split assertions, code-surface canvas, CSS generation, and composition with tideline / niwaki / Lumina.
- Six doc pages under `site/content/themes/`: `dracula.md`, `solarized.md`, `catppuccin.md`, `tokyo-night.md`, `one-dark.md`, `gruvbox.md`. All follow the Nord-page structure.
- `refrakt.config.json` `sites.main.tints` gains six new entries, each extending the corresponding preset module path.
- `site/content/themes/_layout.md` "Syntax presets" group lists all six (alongside niwaki and nord).
- `site/content/themes/themes-catalog.md` updated to mention the new presets and group them appropriately.
- Full test suite passes. Site builds clean.

## Open questions (defer to PR-time)

- **Group naming** — should `/themes/_layout.md` split "Syntax presets" into "refrakt's own" (niwaki) and "Imported" (nord + Phase 1 lineup)? Or leave one group with eight entries? My lean: one group at this size; revisit at 12+.
- **Theme catalog landing copy** — the catalog page currently lists presets one-by-one. At eight syntax presets, a table or grid might read better than a flat list.
- **Composition example variation** — should every preset's "Composing with X" section pair with tideline (the same partner) or pick a different partner per preset (niwaki, neutral default, another import)? My lean: every preset gets one tideline example for consistency; one bonus composition pairing if it's interesting.

These don't affect the spec — they're authoring polish that the implementing PR can settle.

{% /spec %}
