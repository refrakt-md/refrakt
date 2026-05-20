{% work id="WORK-230" status="done" priority="medium" complexity="trivial" tags="docs, themes, catalog, nav" source="SPEC-057" milestone="v0.14.2" %}

# Themes catalog wrap-up

Pull the six Phase 1 presets together into a coherent catalog experience: register the docs site's `tints` config entries, update the themes-catalog landing page to list and explain the lineup, and decide the nav-group structure when the syntax-presets count crosses from 2 to 8.

Lands last in the milestone, after all six preset work items are done — this is the integration touch that turns six individual preset shipments into a coordinated lineup release.

## Acceptance Criteria

- [x] `refrakt.config.json` `sites.main.tints` gains six new entries — `dracula`, `solarized`, `catppuccin`, `tokyo-night`, `one-dark`, `gruvbox` — each extending the corresponding preset module path (mirrors the existing `nord` / `tideline` / `niwaki` entries)
- [x] `site/content/themes/_layout.md` "Syntax presets" group lists all eight: `niwaki`, `nord`, `dracula`, `solarized`, `catppuccin`, `tokyo-night`, `one-dark`, `gruvbox`. Decide whether to split into "refrakt's own" (niwaki) and "Imported" (the other seven) — see open question in SPEC-057
- [x] `site/content/themes/themes-catalog.md` updated to mention all six new presets in the "Syntax presets" section, with one-line descriptions matching the style of the existing niwaki + nord entries
- [x] At 8 syntax presets, consider whether the flat list still reads well or whether a table format (palette × tone × mode-support) is clearer — settle and apply
- [x] Docs site builds clean: 6 new pages under `/themes/`, all six `[data-tint=<name>]` CSS rules present in the generated stylesheet, all six pages have `data-tint="<name>"` stamps verified
- [x] Side nav on every theme page shows the full updated group structure
- [x] Full test suite passes; site builds without warnings

## Approach

This work item is the editorial / IA pass after the six preset PRs land. Tasks split roughly:

**Config.** Append six entries to `sites.main.tints`. Trivial.

**Layout nav.** Decide the group structure. The flat list option:

```
## Syntax presets

- niwaki
- nord
- dracula
- solarized
- catppuccin
- tokyo-night
- one-dark
- gruvbox
```

The split option:

```
## refrakt's syntax presets

- niwaki

## Imported syntax palettes

- nord
- dracula
- solarized
- catppuccin
- tokyo-night
- one-dark
- gruvbox
```

My lean: split. At 8 entries the flat list reads as a jumble; the "refrakt's own vs imported" cut maps onto the genuine authorship distinction (niwaki is a refrakt-original design; the others are tributes to existing palettes). The split also signals the scope-archetype distinction (niwaki = scoped, others = integrated).

**Landing copy.** The themes-catalog page currently lists presets one-by-one in a flat bullet list. At 8 syntax presets, a small table might read better — columns for name, hue family, modes (light / dark / both), and one-line description. Settle in the PR.

**Verification.** After all six presets are in `tints`, build the site and verify each `/themes/<preset>` page emits its `data-tint=<name>` stamps and the generated CSS bundle carries the corresponding scoped rules.

## Dependencies

- {% ref "WORK-224" /%}, {% ref "WORK-225" /%}, {% ref "WORK-226" /%}, {% ref "WORK-227" /%}, {% ref "WORK-228" /%}, {% ref "WORK-229" /%} — all six preset work items must be complete before this can land

## References

- {% ref "SPEC-057" /%} — "Open questions" subsection lists the nav-group and catalog-format decisions

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-057-v0-14-2-implementation\`

### What was done

The catalog integration pass after the six preset work items landed:

- **Tint config + nav entries** — already wired up incrementally during WORK-224–229 (each preset's PR added its own \`tints\` entry and nav line). No additional work needed here.
- **\`site/content/themes/themes-catalog.md\`** — rewrote the "Syntax presets" section. Split into "refrakt's syntax presets" (niwaki) and "Imported syntax presets" (the seven imports). The imported group is now presented as a **table** with columns for palette name, style summary, mode support, and notable role splits — at 7 imports the flat bullet list became unwieldy, the table reads cleaner.
- **\`site/content/themes/_layout.md\`** — split the previously-flat "## Syntax presets" group into "## refrakt's syntax presets" (niwaki alone) and "## Imported syntax presets" (the seven). Aligns with the catalog page's grouping and with SPEC-057's "Phase 2 candidates" framing — clear that niwaki is refrakt-original while the others are tributes.

### Open-question decisions taken

- **Nav-group split** — yes, split. The "refrakt's own vs imported" cut maps onto the genuine authorship distinction and onto the scope-archetype distinction (niwaki is the scoped archetype; everything else is integrated). At 8 entries the flat list reads as a jumble.
- **Catalog format** — table for the imported lineup. Columns: name, style, modes, notable role splits. Keeps the lineup glanceable at this size and makes the SPEC-056 fidelity story visible at the catalog level.
- **Composition example variation** — every preset's doc page demonstrates composition with tideline (consistency). Bonus pairings deferred — easy to add later as a "Composing with X" sub-section per preset if any pairing turns out to be interesting.

### Verification

- Site builds clean: 8 syntax preset pages under \`/themes/\` (the 2 existing + 6 new).
- All 6 new presets have \`data-tint=\"<name>\"\` stamps in their respective HTML files.
- All 6 new presets emit \`[data-tint=<name>]\` CSS rules in the generated stylesheet (both light + dark variants where applicable).
- Side nav splits cleanly on every theme page.
- Full test suite: 2600/2600 pass.

### Files touched

- \`site/content/themes/themes-catalog.md\` — rewrote Syntax presets section + table
- \`site/content/themes/_layout.md\` — split into two nav groups

{% /work %}
