{% spec id="SPEC-177" status="draft" tags="theme, composition, template, site, schema, i18n, tooling" %}

# Theme and site templates for composed runes

## Summary

{% ref "ADR-045" /%} lets a theme or a site replace a composed rune's template while keeping its
input. This spec is the mechanism:

- a replacement is a definition file with the input half left out;
- it can replace one template value and inherit the rest;
- it can choose among the owner's templates with `select`;
- files are found per rune, site before theme before definition;
- the checks that keep it from dropping content or changing published data.

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
---
omit:
  nutrition: Shown in the theme's recipe sidebar instead
---
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
```

- **The body** is written in the same template language as a definition: `slot`, `field`,
  `t`, `if`, `each`, `template`, `fragment`. Every check a definition's template gets runs on
  it.
- **The frontmatter** takes two keys, `omit` and `select` (D3). Any input key (`attributes`,
  `contentModel`, `schema`, `registers`, `provides`, `presets`, `tag`, `aliases`) reports
  `template-override-input` and the file is not loaded.
- **`omit`** maps a slot name to a reason. The reason is required, because it is what a
  reviewer reads.
- **Files only, never TS.** A replacement is declarative, inspectable, and cannot run code.

### D2 — a replacement may cover one template value or all of them

- **No `{% template %}` tags:** the body replaces every template the rune has.
- **`{% template layout="cover" %}` blocks:** each replaces the definition's template for that
  value; the others are inherited.
- **A value the definition does not declare** reports `template-override-unknown-value`. A
  theme cannot add a layout, because the attribute's values are input.
- **Fragments** declared in a replacement are its own. A replacement cannot reach the
  definition's fragments, which stay private (D9 leaves public fragments open).

### D3 — `select` changes which of the owner's templates is the default

```md
---
select:
  layout: editorial
---
```

- It names only the attribute that selects among the definition's templates. Any other
  attribute reports `template-select-input`.
- Its value must be one the definition declares (`template-select-unknown-value`).
- An author's explicit attribute always wins.
- A file may hold `select` alone, `select` with a body, or a body alone. "Default to editorial,
  and here is my editorial" is one file.
- `select` is a map so that multi-axis templates (SPEC-168 D9, shaped but not enabled) can use
  it later. Today it holds one key.

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
  theme, then definition. For `select`: site, then theme, then the definition's declared
  default. A site file that replaces only `layout="cover"` keeps the theme's `select` and the
  theme's other templates.
- **The dev server watches** both directories, and a change re-expands the affected rune.

### D5 — the checks when the site loads

Each replacement is checked against the definition it replaces, after layering:

| Check | Report |
|---|---|
| a slot or field name the definition does not have | `template-override-unknown-slot`, `template-override-unknown-field` |
| a slot neither placed nor in `omit` | `template-override-unplaced`, naming the slot |
| an `omit` entry for a slot the template places, or one that does not exist | `template-override-omit-invalid` |
| a placed rune the site does not have | `template-override-unknown-rune` |
| an omitted slot that is a schema source (D6) | `template-omit-schema-source` |

- **All are errors.** A failing
  replacement is not loaded, and the rune falls back to the next level, so a broken theme
  template never renders a broken page.
- **No version pin.** The checks name exactly what changed when a plugin moves: "recipe has a
  new slot `tips` that the theme template `elegant/recipe.md` does not place". A pin would only
  add a second, less precise answer.

### D6 — published data cannot change

The schema applier stamps sources on the template's output (see above), so a replacement could
change structured data. Two guards keep it from doing so:

1. **Static, at load.** Every schema source of the rune must be placed by the replacement:
   a slot or field the row names may be moved, never omitted (`template-omit-schema-source`).
   This catches the common failure without rendering anything.
2. **Parity, in CI.** A new `refrakt theme check` command renders the rune's fixtures through the
   definition's template and the replacement and compares the JSON-LD. Any difference is an
   error naming the property. The fixtures are the definition's documented examples, plus the
   SEO baseline's fixture for that rune where one exists.

The parity check is not run in every site build, because it renders each instance twice. Sites
run it with `refrakt validate --deep`, which already pays for a full pipeline.

### D7 — words in a replacement belong to whoever wrote it

- A theme template's own text uses `theme.<theme>.<rune>.*` keys, and the theme ships their
  translations in its package. A site template uses `site.<rune>.*`.
- A replacement may use the definition's keys, which stay translated by the definition's owner
  ({% ref "SPEC-145" /%} D29).
- `i18n-extract` reads theme and site templates.

### D8 — tooling shows which template is in use

- `refrakt inspect recipe --theme elegant` renders through the theme's layered templates, and
  shows the resolved source of each template value and of `select`.
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

## Acceptance Criteria

- [ ] A replacement file's body is expanded with the definition's template language and checks; input keys in its frontmatter report `template-override-input` and the file is not loaded
- [ ] A replacement may cover all template values (no `template` tags) or some; uncovered values inherit; an undeclared value reports `template-override-unknown-value`
- [ ] `select` changes the default of the selecting attribute to a declared value; another attribute reports `template-select-input`; an explicit author value always wins
- [ ] Site `templates/` and the theme manifest's `templates` directory are found per rune, and layering resolves per value and per key: site, then theme, then definition
- [ ] Unknown slots, fields and runes, unplaced slots without `omit`, invalid `omit` entries, and omitted schema sources are reported; a failing replacement falls back to the next level
- [ ] `refrakt theme check` and `refrakt validate --deep` compare JSON-LD under the replacement with the definition's template, and report any difference by property
- [ ] Theme and site template text uses `theme.<theme>.*` and `site.*` keys, and `i18n-extract` reads both
- [ ] `inspect --theme`, `reference` and `contracts --theme` show the templates and defaults in use
- [ ] The dev server reloads a rune when its replacement file changes
- [ ] A fixture theme replaces `recipe`'s template and selects a declared layout, with the checks above passing and its JSON-LD equal to the definition's

## References

- {% ref "ADR-045" /%}: the decision this implements.
- {% ref "ADR-043" /%}: what a theme supplies, amended by ADR-045.
- {% ref "SPEC-145" /%}: compositions; D29 translations.
- {% ref "SPEC-153" /%}: rune directories, which load definitions from files.
- {% ref "SPEC-168" /%}: D8 fragments, D9 templates as tags.
- {% ref "SPEC-130" /%}: the schema table and its applier.
- {% ref "SPEC-160" /%} D5: `recipe` as a composition, the first likely target.

{% /spec %}
