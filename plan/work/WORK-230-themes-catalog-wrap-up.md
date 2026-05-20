{% work id="WORK-230" status="ready" priority="medium" complexity="trivial" tags="docs, themes, catalog, nav" source="SPEC-057" milestone="v0.14.2" %}

# Themes catalog wrap-up

Pull the six Phase 1 presets together into a coherent catalog experience: register the docs site's `tints` config entries, update the themes-catalog landing page to list and explain the lineup, and decide the nav-group structure when the syntax-presets count crosses from 2 to 8.

Lands last in the milestone, after all six preset work items are done — this is the integration touch that turns six individual preset shipments into a coordinated lineup release.

## Acceptance Criteria

- [ ] `refrakt.config.json` `sites.main.tints` gains six new entries — `dracula`, `solarized`, `catppuccin`, `tokyo-night`, `one-dark`, `gruvbox` — each extending the corresponding preset module path (mirrors the existing `nord` / `tideline` / `niwaki` entries)
- [ ] `site/content/themes/_layout.md` "Syntax presets" group lists all eight: `niwaki`, `nord`, `dracula`, `solarized`, `catppuccin`, `tokyo-night`, `one-dark`, `gruvbox`. Decide whether to split into "refrakt's own" (niwaki) and "Imported" (the other seven) — see open question in SPEC-057
- [ ] `site/content/themes/themes-catalog.md` updated to mention all six new presets in the "Syntax presets" section, with one-line descriptions matching the style of the existing niwaki + nord entries
- [ ] At 8 syntax presets, consider whether the flat list still reads well or whether a table format (palette × tone × mode-support) is clearer — settle and apply
- [ ] Docs site builds clean: 6 new pages under `/themes/`, all six `[data-tint=<name>]` CSS rules present in the generated stylesheet, all six pages have `data-tint="<name>"` stamps verified
- [ ] Side nav on every theme page shows the full updated group structure
- [ ] Full test suite passes; site builds without warnings

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

{% /work %}
