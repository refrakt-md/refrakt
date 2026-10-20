{% decision id="ADR-045" status="proposed" date="2026-10-20" source="SPEC-145" tags="theme, composition, template, identity, architecture" %}

# A theme may arrange a composed rune, but not redefine it

## Context

A composed rune ({% ref "SPEC-145" /%}) is one definition in two halves:

- **its input**: attributes, content model, slots, fields, presets, translation keys, and the
  schema.org row;
- **its template**: how the slots and fields are placed into primitives.

{% ref "ADR-043" /%} drew the line between theme and definition so that a theme supplies no
structure. Its rationale ends: "What a theme can never do again is restructure a rune, which
under composition is correct." That was right about meaning, and too broad about arrangement.

A theme can have a real opinion about how a rune is arranged without disagreeing about what it
means. An elegant blog theme may want a recipe as a single column with the method beside the
ingredients and the metadata in a quiet line under the title. Lumina may want the classic card.
The content is the same Markdown, the fields are the same, and the published data is the same.
Only the arrangement differs.

CSS on the vocabulary covers much of this (order, grid areas, hiding chrome). It cannot move a
field into a heading, turn a deflist into a bar, or put the ingredients in a drawer. Under
ADR-043, a theme that wants any of those has no route except asking every plugin owner for a
new template.

A site has the same need, more often: "keep this rune's input, but lay it out my way".

## Options Considered

1. **Keep ADR-043's line.** Themes style with CSS only.
   - **Rejected:** it leaves arrangement, which is presentation, owned by whoever wrote the
     input. Every distinctive theme then needs plugin changes.

2. **Let themes configure composed runes as they configure native ones** (`runes:` overrides of
   modifiers, `metaFields`, blocks).
   - **Rejected:** this is what ADR-042 and ADR-043 removed. It lets a theme change meaning:
     labels, sentiment, which values exist.

3. **Let a theme or site replace a composed rune's template, never its input.** The template
   written by the theme or site places the definition's own slots and fields.

## Decision

**Option 3.**

1. **Arrangement is presentation; input is identity.**
   - A theme or a site may supply a template for a composed rune.
   - Neither may change any part of its input: attributes and their values, content model,
     slots, fields, `metaFields`, presets, translation keys, or schema row.

2. **The template speaks the vocabulary.** It is written in the template language every
   definition uses, and places only the rune's own slots and fields, core primitives, and runes
   the site has. It cannot run code.

3. **Nothing authored is dropped silently.** A replacement template places every slot, or
   names the ones it leaves out with a reason. A slot that feeds the schema row cannot be left
   out.

4. **What is published does not depend on the template.** A rune's structured data under a
   replacement template equals its structured data under the definition's own, checked
   mechanically. A theme can change how a recipe looks, never what a search engine is told
   about it.

5. **Choosing among the owner's templates is allowed too.** When a definition ships several
   templates selected by an attribute, a theme or site may change that attribute's default to
   another value the definition declares. An author's explicit value always wins.

6. **Lookup is site, then theme, then definition**, resolved per template value and per key,
   so a partial override inherits the rest.

7. **Native runes are unaffected.** They have no template to replace. ADR-043 decision 6 still
   covers them.

**This amends ADR-043.** In its decision 1, "a rune's structure" and the "order, layout" in
"which fields a rune shows, their order, layout, labels, and sentiment mapping" move from the
definition's column to "the definition's by default; a theme or site may arrange them".
"Which fields, labels, and sentiment mapping" stay the definition's. The sentence in its
rationale about restructuring is narrowed to redefining.

## Rationale

- **The line is where meaning stops.** ADR-043 was protecting meaning: what a value is, how it
  is labelled, what it signals, what is published. Every one of those stays on the definition's
  side. Arrangement never carried meaning, so it can move.
- **Content stays portable.** The input is unchanged, so a site's recipes render under any
  theme, and a theme's recipe template renders any site's recipes.
- **It is safe by construction.** The template language has no code, the input half is
  rejected in a replacement file, slot coverage is checked when the site loads, and structured
  data is compared, not trusted.
- **It is cheap.** The format, the language, the checks and the expansion already exist for
  definitions. A replacement is a definition with the input half removed.

## Consequences

- **SPEC-177** specifies the mechanism: the file format, where files are found, partial
  overrides, `select`, the checks, and theme CI.
- **Structure contracts become per theme** for composed runes. The definition's own template
  produces the reference contract. A theme's contract is generated with its templates and
  shipped in its `contracts` export, as Lumina's is today.
- **The block editor** follows the template in use: it reads edit hints from the output, so a
  replacement template must keep them or declare its own.
- **Theme coverage** (ADR-043 decision 5) stays the baseline. A theme with no templates still
  renders every composed rune; templates are what a theme adds where it has an opinion.
- **One more reason to compose.** Native runes cannot be arranged by a theme. That is an
  argument for moving runes such as `recipe` onto compositions (SPEC-160 D5), not for adding
  a lever to native runes.

{% /decision %}
