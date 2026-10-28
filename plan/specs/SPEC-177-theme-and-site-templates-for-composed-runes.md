{% spec id="SPEC-177" status="draft" tags="theme, composition, template, site, schema, i18n, tooling" %}

# Theme and site templates for composed runes

## Summary

{% ref "ADR-045" /%} lets a theme or a site replace a composed rune's template while keeping its
input. This spec is the mechanism:

- a replacement is a definition file with the input half left out;
- it can replace one template value and inherit the rest;
- it can change the defaults of the template selector and the presentation axes with `defaults`;
- files are found per rune, site before theme before definition;
- the checks that keep it from dropping content or changing published data.

## Prerequisites

This spec builds on four things that do not exist yet. It should not be scheduled until they do:

| Needs | From | State on 2026-10-22 |
|---|---|---|
| `{% template layout="…" %}` blocks and fragments | {% ref "SPEC-168" /%} D8, D9 | draft; not implemented |
| the `{% t %}` tag and translation keys | {% ref "SPEC-145" /%} D13, D29 | not implemented |
| `recipe` as a composition, the first target (acceptance fixture) | {% ref "SPEC-160" /%} D5, {% ref "SPEC-169" /%} D1 | the delimited model is planned for v0.42.0 and `section`'s split for v0.43.0; `recipe` itself is not planned |
| indented templates, which every example here uses | {% ref "SPEC-170" /%} | planned for v0.42.0 |

## What exists, measured

- **A definition is one Markdoc file.** Frontmatter declares the input (`attributes`,
  `contentModel`, `schema`, `registers`, `provides`, `presets`), and the body is the template.
  `defineComposedRune(name, source)` builds the rune from it
  (`packages/runes/src/composed-rune.ts`). First-party definitions are TS strings until
  {% ref "SPEC-153" /%}'s rune directories load `.md` files.
- **Templates are selected by one attribute**, as `{% template layout="…" %}` blocks
  ({% ref "SPEC-168" /%} D9), and may share fragments (D8).
- **A theme package** ships `manifest.json` (name, prefix, dark mode, layouts), CSS, a
  `transform` config, layouts, presets and `contracts` (`packages/lumina/package.json`). It
  ships no Markdoc.
- **Structured data is stamped on the template's output.** The schema applier
  (`packages/runes/src/lib/schema-table.ts`) runs on the rune's rendered output and resolves
  each source by name, in three ways: stamp a named node in place, rebuild from the field bag,
  or synthesise a nested entity. A source resolves wherever its named node lands, so moving a
  slot is harmless; leaving it out is not.
- **The SEO baseline** (`contracts/seo-baseline/`) records the JSON-LD of fixtures for every
  emitting rune, and is reviewed as a diff.

## Decisions

### D1 — a replacement is a definition file without its input

```md
{% section media-position="top" %}
	{% slot name="media" /%}

	# {% $attrs.title %}
	{% field name="servings" /%} · {% field name="time" /%}

	{% slot name="description" /%}
{% /section %}

{% grid columns=2 %}
	{% section %}
		## {% t key="theme.elegant.recipe.ingredients" %}Ingredients{% /t %}
		{% slot name="ingredients" /%}
	{% /section %}
	{% section %}
		## {% t key="theme.elegant.recipe.method" %}Method{% /t %}
		{% slot name="steps" /%}
	{% /section %}
{% /grid %}

{% details summary=t("theme.elegant.recipe.notes", "Cook's notes") %}
	{% slot name="notes" /%}
{% /details %}
```

- **The body** is written in the same template language as a definition: `slot`, `field`,
  `t`, `if`, `each`, `template`, `fragment`. Every check a definition's template gets runs on
  it.
- **Every slot is placed.** A replacement places every slot the definition has (D5). The
  theme above does not want cook's notes in its main flow, so it places them in a
  `{% details %}` rather than leaving them out.
- **The frontmatter** takes one key, `defaults` (D3). Any input key (`attributes`,
  `contentModel`, `schema`, `registers`, `provides`, `presets`, `tag`, `aliases`) reports
  `template-override-input` and the file is not loaded.
- **Files only, never TS.** A replacement is declarative, inspectable, and cannot run code.

### D2 — a replacement may cover one template value or all of them

- **No `{% template %}` tags:** the body replaces every template the rune has.
- **`{% template layout="cover" %}` blocks:** each replaces the definition's template for that
  value; the others are inherited.
- **A value the definition does not declare** reports `template-override-unknown-value`. A
  theme cannot add a layout, because the attribute's values are input.
- **Fragments** declared in a replacement are its own. A replacement cannot reach the
  definition's fragments, which stay private (D9 leaves public fragments open).

### D3 — `defaults` changes the template selector and the presentation axes, nothing else

```md
---
defaults:
  layout: editorial
  elevation: flat
---
```

`defaults` may name two kinds of attribute:

| Kind | Examples | Why it is the theme's to choose |
|---|---|---|
| the template selector | `layout` on recipe | it picks among the owner's own arrangements |
| a universal axis | `elevation`, `density`, `width`, `frame`, `tint` | presentation; the axes are registered (`UNIVERSAL_AXIS_FACETS`, {% ref "SPEC-124" /%}) |

- **Anything else reports `template-default-input`.** A rune-specific attribute (`servings`,
  `difficulty`, `type`, `status`) is a fact about the content ({% ref "ADR-045" /%} decision 5).
- **Values are checked.** A value the attribute does not accept reports
  `template-default-unknown-value`.
- **Why a default and not CSS.** A theme can already draw `elevation="raised"` flat, since a
  theme renders an intent its own way ({% ref "SPEC-159" /%}). CSS cannot tell a default
  `raised` from an author who wrote `elevation="raised"`, so a flat theme would also flatten
  the author who asked for lift. Changing the default changes only the unset case.
- **Precedence**, highest first:
  1. the author's explicit value;
  2. a value written in the composition's template (`{% card elevation="raised" %}`), which is
     the composition owner's explicit choice;
  3. the site's default, then the theme's;
  4. the definition's default.

  So a theme's default for `card` does not change a recipe template that writes
  `elevation="raised"` on its card. To change that, the theme sets recipe's own default or
  replaces its template.
- **Where an axis default lands.** On a composed rune, an axis default applies where the
  author's attribute would ({% ref "SPEC-145" /%} D14, D33).
- **The definition's layer exists already.** {% ref "SPEC-145" /%} D34 gives a definition its own
  `defaults` key for universal axes, with this order, so `hero` can ship before this spec. This
  spec adds the site and theme layers above it and the template selector as a defaultable key.
- **Primitives that are still native** (`card`, `section`) keep the existing per-rune axis
  defaults in theme config (`defaultElevation`, {% ref "SPEC-107" /%}), the legacy path
  {% ref "ADR-043" /%} decision 6 keeps. When `card` becomes a composition
  ({% ref "SPEC-160" /%} D3), `templates/card.md` with `defaults: { elevation: flat }` replaces
  it.
- A file may hold `defaults` alone, `defaults` with a body, or a body alone. "Default to
  editorial, and here is my editorial" is one file.
- The selector entry stays a map key, so multi-axis templates (SPEC-168 D9, shaped but not
  enabled) can use it later.

### D4 — where files are found, and how they layer

| Level | Location |
|---|---|
| site | `templates/` beside `refrakt.config.json`, or `templates.dir` in it, per site |
| theme | the directory named by `"templates"` in the theme's `manifest.json`, exported by its package |
| definition | the rune's own template |

- **Files are named after the rune**: `templates/recipe.md`. Rune names are unique per site
  after `mergePlugins`' collision handling, so no plugin prefix is needed. A file named after
  an alias reports `template-override-alias` and names the canonical rune.
- **A file for a rune the site does not have** reports `template-override-no-target` as a
  warning, since themes ship templates for plugins a site may not install.
- **Layering is per value and per key, not per file.** For each template value: site, then
  theme, then definition. For each `defaults` key: site, then theme, then the definition's
  declared default. A site file that replaces only `layout="cover"` keeps the theme's
  `defaults` and the theme's other templates.
- **The dev server watches** both directories, and a change re-expands the affected rune.

### D5 — the checks when the site loads

Each replacement is checked against the definition it replaces, after layering:

| Check | Report |
|---|---|
| a slot or field name the definition does not have | `template-override-unknown-slot`, `template-override-unknown-field` |
| a slot the template does not place | `template-override-unplaced`, naming the slot |
| a placed rune the site does not have | `template-override-unknown-rune` |
| no ladder group, where the definition declares a `sequence` ({% ref "SPEC-156" /%} D12) | `template-override-no-ladder`, naming the rune and its sequence |

- **There is no `omit`.** Not showing authored content changes what the rune contains, which
  {% ref "ADR-045" /%} keeps on the definition's side. `template-override-unplaced` says so in
  its message, and suggests placing the slot in a disclosure (`{% details %}`, a popover or a
  drawer) or small at the end.

- **All are errors.** A failing
  replacement is not loaded, and the rune falls back to the next level, so a broken theme
  template never renders a broken page.
- **No version pin.** The checks name exactly what changed when a plugin moves: "recipe has a
  new slot `tips` that the theme template `elegant/recipe.md` does not place". A pin would only
  add a second, less precise answer.

### D6 — published data cannot change

The schema applier stamps sources on the template's output (see above), so a replacement could
change structured data. Two guards keep it from doing so:

1. **Static, at load.** Every slot is placed (D5), so every slot the schema row names is
   placed. A field the row names must be placed too, if the definition's own template places
   it (`template-override-unplaced`). This catches the common failure without rendering
   anything.
2. **Parity, in CI.** A new `refrakt theme check` command renders the rune's fixtures through the
   definition's template and the replacement and compares the JSON-LD. Any difference is an
   error naming the property. The fixtures are the definition's documented examples, plus the
   SEO baseline's fixture for that rune where one exists.

The parity check is not run in every site build, because it renders each instance twice. Sites
run it with `refrakt validate --deep`, which already pays for a full pipeline.

**Why data must be shown to be published, even though it could be published unseen.** JSON-LD
is harvested before the identity transform, and the applier can rebuild a value from the field
bag when its node was dropped. A template could therefore leave out, say, a recipe's nutrition
and still publish it. It must not:

- Search engines ask that structured data describe content visible on the page. Google's
  structured data guidelines say not to mark up content that is not visible to readers, and a
  page that does may lose its rich results. Data that is valid schema.org can still break that
  rule.
- A theme would be making that trade for every site that uses it, without the site seeing it.

**What a template does instead: de-emphasise, not remove.** Content inside a disclosure is still
on the page. A theme that does not want a source in the main flow places its slot:

- in a `{% details %}` ("Nutrition per serving");
- behind a popover or drawer trigger ({% ref "SPEC-174" /%});
- small, at the end, as a quiet line.

The slot is placed, so the published data and the checks are unchanged. This is D5's rule
seen from the side of structured data.

### D7 — words in a replacement belong to whoever wrote it

- A theme template's own text uses `theme.<theme>.<rune>.*` keys, and the theme ships their
  translations in its package. A site template uses `site.<rune>.*`.
- A replacement may use the definition's keys, which stay translated by the definition's owner
  ({% ref "SPEC-145" /%} D29).
- `i18n-extract` reads theme and site templates.

### D8 — tooling shows which template is in use

- `refrakt inspect recipe --theme elegant` renders through the theme's layered templates, and
  shows the resolved source of each template value and of each `defaults` key.
- `refrakt reference` lists the default as "`classic` (theme elegant: `editorial`)".
- `refrakt contracts --theme <name>` generates a theme's structure contract with its templates.
  The definition's own templates give the reference contract.
- The block editor reads edit hints from the output, so a replacement keeps the definition's
  hint names on the slots it places, or declares its own.

## Open questions

- **Public fragments.** Replacing only recipe's header fragment would be finer than replacing
  a template value. It makes fragment names public API, which a plugin then cannot rename
  freely. Deferred until whole-value replacement proves too coarse; the likely shape is a
  `public` marker on a fragment.
- **Templates from plugins.** A "recipe styles" plugin shipping templates for another plugin's
  rune is a third supplier. Nothing here prevents it later; it is out of scope until asked for.
- **Placing a slot elsewhere on the page.** A template places slots only inside the rune's own
  output. "Show the cook's notes in the sidebar" would need a slot sent to a layout region:
  `{% slot name="notes" region="sidebar" /%}`, hoisted the way drawers are today, and placed
  in the rune when the layout has no such region. Several runes on one page, their order in
  the region, and what a region means in each adapter are open. Not designed here.
- **Hiding by CSS.** D6 governs templates. A theme's stylesheet can still `display: none` a
  placed slot, and no template check sees it. That stays the theme author's responsibility, as
  it is today. The vocabulary coverage report ({% ref "ADR-043" /%} decision 5) could warn when
  a theme's CSS hides an element that carries a schema source; whether that can be detected
  reliably is not yet known.

## Acceptance Criteria

- [ ] A replacement file's body is expanded with the definition's template language and checks; input keys in its frontmatter report `template-override-input` and the file is not loaded
- [ ] A replacement may cover all template values (no `template` tags) or some; uncovered values inherit; an undeclared value reports `template-override-unknown-value`
- [ ] `defaults` changes the default of the template selector and of universal axes to accepted values; any other attribute reports `template-default-input`; an explicit author value, then a value written in the composition's template, wins over it
- [ ] Site `templates/` and the theme manifest's `templates` directory are found per rune, and layering resolves per value and per key: site, then theme, then definition
- [ ] Unknown slots, fields and runes, and unplaced slots are reported; a failing replacement falls back to the next level
- [ ] `template-override-unplaced` names the slot and suggests placing it in a disclosure or small at the end
- [ ] `refrakt theme check` and `refrakt validate --deep` compare JSON-LD under the replacement with the definition's template, and report any difference by property
- [ ] Theme and site template text uses `theme.<theme>.*` and `site.*` keys, and `i18n-extract` reads both
- [ ] `inspect --theme`, `reference` and `contracts --theme` show the templates and defaults in use
- [ ] The dev server reloads a rune when its replacement file changes
- [ ] A fixture theme replaces `recipe`'s template, selects a declared layout and sets a default elevation, with the checks above passing and its JSON-LD equal to the definition's

## References

- {% ref "ADR-045" /%}: the decision this implements.
- {% ref "ADR-043" /%}: what a theme supplies, amended by ADR-045.
- {% ref "SPEC-145" /%}: compositions; D29 translations.
- {% ref "SPEC-153" /%}: rune directories, which load definitions from files.
- {% ref "SPEC-168" /%}: D8 fragments, D9 templates as tags.
- {% ref "SPEC-130" /%}: the schema table and its applier.
- {% ref "SPEC-160" /%} D5: `recipe` as a composition, the first likely target.

{% /spec %}
