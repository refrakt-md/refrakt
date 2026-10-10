{% decision id="ADR-042" status="proposed" date="2026-10-10" source="SPEC-145" tags="runes, composition, metadata, theme, config, identity, architecture" %}

# Metadata belongs to a rune's definition; themes override native runes only

## Context

Before composition, a rune like `recipe` had one definition, in code, and its output was neutral
so the theme could hold the creative power: a theme could rely on `recipe` meaning one thing,
and override its config by name. {% ref "ADR-028" /%} and {% ref "SPEC-158" /%} drew the line
inside that config: identity fields (`sections`, `modifiers`, `schema`, `sequence`,
`metaFields.*.metaType`, …) are the rune's, and everything else, `blocks` and the rest of
`metaFields` included, is the theme's to override (`packages/transform/src/identity-fields.ts`,
enforced in `merge.ts`).

Composition moves the creative power over structure and meaning to whoever writes the
definition, and since {% ref "SPEC-153" /%} that includes a site's own `runes/` directory. Two
sites can each have a `recipe` with different fields. That breaks an assumption the override
path rests on:

- **A theme override of a composed rune is a guess.** A theme that overrides
  `Recipe.blocks.metadata.fields` names fields it cannot see. Against a recipe that declares
  `totalTime` instead of `prepTime`, the named field resolves to nothing and its row silently
  disappears. Nothing reports the mismatch.
- **It is already contested for one plugin.** {% ref "SPEC-152" /%} D4: *"A composed plan rune
  whose distinguishing manifest a theme can rewrite is not the same rune."*
- **It is the opposite of what makes compositions themeable.** A composed rune's output is the
  shared vocabulary: primitive classes (`rf-section__*`), section roles (`data-section`), block
  layouts (`data-zone-layout`), value semantics (`data-meta-type`, `data-meta-sentiment`), media
  kinds (`data-media`), the universal axes. A theme that styles the vocabulary renders every
  definition of `recipe` correctly without knowing what a recipe is.

The question this decision answers is whether a theme should keep config authority over composed
runes, and whether native runes need metadata at all once the planned compositions land.

### Measured: which runes carry metadata

Every `RuneConfig` with `metaFields` or `blocks`, across core and the nine official plugins
(`baseConfig.runes` and each plugin's `theme.runes`, read at runtime): **20 runes.**

| Plugin | Runes | Disposition per its audit |
|---|---|---|
| plan | `spec`, `work`, `bug`, `decision`, `milestone` | compose ({% ref "SPEC-152" /%}) |
| storytelling | `character`, `realm`, `lore`, `faction`, `plot` | four composed beside the plugin; `plot` after the `segmented` model ({% ref "SPEC-147" /%}) |
| learning | `howto`, `recipe` | compose ({% ref "SPEC-154" /%}) |
| docs | `api`, `symbol` | compose ({% ref "SPEC-157" /%}) |
| places | `event` | composes after {% ref "SPEC-146" /%} ({% ref "SPEC-148" /%}) |
| media | `playlist` | composes after SPEC-146 ({% ref "SPEC-155" /%}) |
| marketing | `testimonial` | composes ({% ref "SPEC-161" /%}) |
| core | `hint`, `codegroup`, `budget` | native |

**17 of the 20 are composition candidates.** None of the runes the audits keep as permanent
plugin runes (`comparison`, `quiz`, `glossary`, `map`, the design runes) carries metadata. The
three native runes that do use it as chrome, not as a description of an entity:

- `hint`: `hintType`, rendered as the icon-and-label header ("Warning");
- `codegroup`: `title`, rendered in the tab bar;
- `budget`: `duration` and `currency`, in a bar above the header.

## Options Considered

1. **Keep theme overrides for composed runes, and warn on mismatch.** A theme override naming a
   field or block the loaded definition does not declare is reported. This keeps the theme's
   power and makes the guess visible, but it keeps two owners for one rune's metadata, and a
   warning is still a guess, made louder.
2. **Composed runes are definition-owned in full; themes override native runes only.** A theme
   styles composed runes through the vocabulary and may hook `data-rune` in CSS, but cannot
   override their config. Native runes keep today's split between identity and presentation.
3. **Make `metaFields` and `blocks` identity for every rune.** It is simpler to state, but it
   takes presentation knobs away from native runes that have nothing to do with composition, and
   the measurement shows those runes barely use metadata anyway.

## Decision

**Option 2.**

1. **A composed rune's config is its definition's.** Its generated `RuneConfig` (modifiers,
   `metaFields`, `blocks`, `provides`, `composedRuneConfig` in
   `packages/runes/src/lib/composition.ts`) is not theme-overridable. A theme override keyed to
   a composed rune's type name is reported like an identity violation, naming the theme, the
   rune and the path, and dropped.
2. **A theme styles composed runes through the vocabulary.** It may target `[data-rune="…"]` in
   CSS to special-case one, which is an explicit, visible choice and needs no config.
3. **Native runes keep today's rules.** ADR-028's identity fields stay reserved, and everything
   else stays overridable.
4. **Metadata is declared by a rune's definition.** For a composition that is its frontmatter.
   The site author, not the theme, changes what metadata a rune shows, for example by
   redefining `recipe` in the project's `runes/` directory.

## Rationale

- **One owner per rune's metadata.** "Where is this rune's metadata defined?" has one answer:
  in its definition. A theme author and a site author can no longer both be partly right.
- **It removes a silent failure instead of reporting it.** Option 1's warning would be needed
  on every theme/definition pair forever. Option 2 makes the mismatch impossible.
- **It costs native runes nothing.** The 17 composition candidates are the runes whose
  metadata a theme might override today, and they move to definition ownership as they convert.
  The three native runes left use metadata as chrome.
- **It generalises an existing decision.** SPEC-152 D4 asked for exactly this for the plan
  runes; this states it for every composed rune.

## Consequences

- **SPEC-145 D7 changes.** Its sentence *"blocks is not an identity field, so which fields,
  their order and which primitive renders them stay theme-overridable"* no longer holds for
  composed runes. D7's placement mechanism (`{% metablock %}`) is unchanged; only the theme's
  authority over a placed block goes. D7 gets a note pointing here.
- **It takes effect per rune, as each converts.** Until a rune becomes a composition it is
  native, and today's rules apply. No theme override is broken by this decision on the day it
  lands, because no shipped theme overrides a composed rune today.
- **A theme can no longer slim a plugin rune's metadata**, for example hiding `difficulty` on
  recipes. That becomes a site decision, made by redefining the rune. This is the intended
  owner: what a recipe shows is content, not skin.
- **The theme-authoring docs change emphasis.** They describe styling the vocabulary as the
  default and `data-rune` hooks as the exception. Overriding a composed rune's config is listed
  as not possible, with this decision as the reason.
- **Follow-up for the three native runes.** Whether `hint`, `codegroup` and `budget` should
  keep `metaFields` is open:
  - `hint`'s and `codegroup`'s labels are chrome, and could come from the engine's `structure`
    entries, which already inject headers and icons;
  - `hint` could also be a composition;
  - `budget` is domain content living in core, and looks like a composition candidate itself.

  If all three move, `metaFields` and `blocks` become a composition-only concept, and the
  question "should native runes carry metadata at all" is answered no. That is a separate
  decision, made on that evidence.
- **Implementation.** The guard is one check in `mergeRuneConfig`: a rune key whose config
  came from `composedRuneConfig` accepts no theme override. `assembleThemeConfig` already
  carries provenance for plugin runes. A test pins that an override of a composed rune's
  `blocks` is reported and dropped.

{% /decision %}
