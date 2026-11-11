{% spec id="SPEC-197" status="draft" tags="composition, template, examples, content-model, include, snippet, docs, architecture" %}

# A definition's body is blocks: templates, fragments and examples

## Summary

{% ref "ADR-048" /%} makes every rune a definition: frontmatter for the input and a body for the
template. Two things now want room in that body besides the template:

- **Examples.** Today they live in three places that do not know about each other: the fixture
  corpus (`packages/runes/fixtures/*.md`, `plugins/*/fixtures/*.md`), the structured-data
  scenarios (`contracts/seo-baseline/fixtures/`) and about 320 hand-written `{% preview %}` blocks
  on the rune pages (`site/content/runes/`).
- **Nothing at all**, for a rune drawn by a framework component ({% ref "ADR-049" /%}), whose
  definition may have no template.

This spec makes the body a set of top-level blocks, of which the template is one:

- the template is always wrapped in `{% template %}` (D1);
- a definition may carry `{% example %}` blocks, each with an `id`, which replace the fixture
  corpus as the source every tool reads (D2, D6);
- any block with an `id` in a Markdoc file is addressable as `file#id`, which `include` pastes and
  `snippet` quotes (D3), from file roots that packages contribute (D4);
- pasted content remembers which file it came from (D5).

No rune is added. `include` and `snippet` gain an address form; `{% example %}` is syntax inside a
definition's body, read by the definition loader, never a page rune.

## Prerequisites

| Needs | From | State on 2026-11-11 |
|---|---|---|
| Definitions with templates and fragments | {% ref "SPEC-168" /%} D8, D9 | draft |
| Per-rune preprocess hooks (`include`, `snippet`) | {% ref "SPEC-141" /%} | implemented |
| Name-based anchors and extents for `snippet` | {% ref "SPEC-131" /%} | implemented |
| Fixture corpus and `RUNE_FIXTURE_META` | {% ref "SPEC-102" /%} | implemented |
| Migrations as compositions | {% ref "SPEC-189" /%} | draft |

## What exists, measured

*Measured 2026-11-11.*

**Example sources and their consumers:**

| Source | Shape | Read by |
|---|---|---|
| `packages/runes/fixtures/*.md` (41) and `plugins/*/fixtures/*.md` | one example per rune; frontmatter `rune`, `role`, `notes`; generated into `RUNE_EXAMPLES` and `RUNE_FIXTURE_META` by `packages/runes/scripts/generate-examples.mjs` | the editor's rune data (`packages/editor/src/server.ts:1036`); AI write mode few-shot examples, filtered by role (`packages/ai/src/modes/write.ts:30`); `refrakt reference` (`packages/runes/src/reference.ts:360`); CLI `inspect`, `gallery`, `plugin-validate`, `edit` (`packages/cli/src/lib/fixtures.ts`) |
| `contracts/seo-baseline/fixtures/*.md` | scenarios named `rune.scenario.md`; frontmatter `title`, `role`, `notes` | the structured-data baseline |
| `site/content/runes/**/*.md` | about 320 `{% preview source=true %}` blocks, each with a heading and a sentence for the reader | the public rune pages |

`role` takes three values across the fixtures today: `canonical` (44), `edge-case` (16) and
`minimal` (8). AI write mode uses `canonical` and `rich` (`EXEMPLAR_ROLES`).

**Descriptions already have one source.** A rune's `description` and each attribute's description
feed the language server (hover, completion), the editor, `refrakt reference`, and the site
through generated data files (`site/content/_data/rune-intro.json`, `rune-attributes.json`), which
every rune page reads through `{% include file="rune-intro.md" %}` and the `data` rune.

**Bodies today.** All five live definitions use a bare body as their template:
`plugins/marketing/runes/{hero,cta,testimonial}.md`, `site/staged-runes/steps.md` and the fixture
`packages/runes/test/fixtures/composed/teaser.md`. {% ref "SPEC-168" /%} D9 already wraps
templates in `{% template layout="…" %}` when a rune has variants, and its rule 1 keeps the bare
form for a single template.

## Decisions

### D1: the body is top-level blocks, and the template is always wrapped

A definition's body holds only top-level blocks: `{% template %}`, `{% fragment %}` and
`{% example %}`. Content outside every block is an error (`definition-loose-content`).

- **A `{% template %}` with no selecting attribute** is the rune's only template. Variants add
  the selecting attribute, as SPEC-168 D9 has them.
- **A definition may have no template.** It is then drawn by a component (ADR-049 decision 7),
  and the absence is visible rather than an empty body.
- **This amends SPEC-168 D9 rule 1.** Its "in a single-template file, everything outside
  fragments is the template" goes away.
- **Why always wrap, rather than allow a bare body for one template:**
  - with examples in the body, "the template is everything outside fragments and examples" is a
    list of exceptions that grows with each new kind of block, and a stray paragraph would
    silently become template output;
  - adding a variant no longer means wrapping and re-indenting the existing body;
  - one shape for every definition, and a theme's replacement file (SPEC-177) looks like the
    definition it replaces.
- **Migration:** a codemod wraps the five bare bodies. A bare body is accepted with a deprecation
  warning for one release, through SPEC-189.

### D2: `{% example %}` holds one demo, as live Markdoc

```md
{% example #all-types title="All hint types" role="canonical" %}
	{% hint type="note" %}
	Exports include archived projects unless you clear **Include archived**.
	{% /hint %}

	{% hint type="warning" %}
	Renaming a workspace changes its URL.
	{% /hint %}
{% /example %}
```

| Attribute | Required | Meaning |
|---|---|---|
| `id` | yes | written `#all-types`, Markdoc's shorthand for `id="all-types"`; unique per file; how pages, the CLI and tests address it (D3) |
| `title` | no | a short heading for listings: the gallery, the editor's picker, `reference` |
| `role` | no, default `canonical` | `canonical`, `minimal`, `rich` or `edge-case`; decides which consumers use it (D6) |
| `notes` | no | guidance for authors and the AI, not for readers |
| `expect` | no | the validation findings the example is meant to produce, by error id; an example with findings and no `expect` fails its test |

- **The body is the demo and nothing else**: live Markdoc, as an author would write it on a page.
  The explanation a reader needs stays on the page that shows it ({% ref "SPEC-193" /%}: each page
  is written for its reader).
- **The loader never treats an example as part of the template**, and never transforms it while
  loading the definition. It is read as text, and parsed only where a page includes it (D3) or a
  test renders it.
- **Every example is checked.** In tests, each one is validated against the content model, with
  `expect` compared to its findings, and rendered through the definition's template and through
  any component a test binds.
- **It is definition syntax, not a page rune.** `{% example %}` means nothing on a page.

### D3: a block with an `id` is addressable as `file#id`

Any block tag with an `id` in a Markdoc file can be addressed as `file#id`. Ids are unique per
file; a duplicate reports `duplicate-block-id`.

- **Why `id`, not `name`** (*decided 2026-11-11*):
  - **`#` already means id.** In a URL, `page.html#x` is the element whose `id` is `x`. Pairing
    `#` with `name` would give it a second meaning.
  - **Markdoc has the shorthand.** Its tag syntax takes `#x` for `id="x"`, so an example is
    written `{% example #all-types %}`.
  - **It keeps refrakt's two words apart.** `name` is a part's role inside its owner, repeated in
    every instance: a slot, a group, `data-name`. `id` is a unique identity something elsewhere
    points at: plan entities (`id="SPEC-194"`, addressed by `{% ref %}`), `drawer id`, heading
    anchors. An example is addressed from another file, so it is an identity.
  - **Slots and groups cannot collide with it.** With `name`, addressing had to be limited to
    top-level blocks, because a template's slots and groups also have names. With `id`, no limit
    is needed.
- **`include` pastes the block's content:** `{% include file="core:hint.md#all-types" /%}`. It
  resolves files as today, through `_partials/` and namespaced roots, plus the roots in D4.
- **`snippet` quotes the block's source.** Markdoc joins the anchor table of
  {% ref "SPEC-131" /%}: a symbol is a block tag with that `id`, and its extent is `paired`, up to
  the matching closing tag. `{% snippet path="…/hint.md" symbol="all-types" /%}` shows the demo
  as code.
- **An address that resolves to nothing is an error**, as an unknown `include` file is today:
  `include-unknown-block`, naming the file and listing the ids it does have.
- **Pages are addressable too.** A block with an `id` on a page, such as a drawer or a plan
  entity, can be included or quoted the same way. On a page its `id` is usually also the
  rendered HTML `id`; inside a definition an example never renders, so nothing leaks. Addressing
  a section by its heading anchor would fit the same syntax, and is left for later.
- **This lands the syntax SPEC-168 reserved.** Its section on fragments defers "fragments from
  other files" with exactly `file="shapes/profile.md#body"`. This spec lets *pages* address
  blocks in other files. Whether a *template* may use another file's fragment stays deferred, for
  SPEC-168's reason: a definition should stay readable on its own.
- **It amends SPEC-168 D8: fragments are declared with an `id`.** SPEC-168's draft declares
  `{% fragment name="body" %}` and uses it as `{% partial file="#body" /%}`, the same mismatch
  between `#` and `name`. It becomes `{% fragment #body %}`, so `#` means `id` whether the
  address is in the same file or another.

### D4: packages contribute file roots

- A plugin may expose directories as namespaced roots, beside `_partials/`: by default its rune
  directory, under the plugin's short name (`marketing:hero.md`). Core's definitions are `core:`.
- A site's own `runes/` directory is project files and needs no root.
- The roots are listed by `refrakt plugins list` and resolved by the same code that resolves
  `include` today, so the language server and validation find them too.

### D5: pasted content remembers where it came from

When `include` pastes nodes, each keeps a `location` naming its file, as Markdoc's own
`location.file` allows. Today a pasted node's line numbers point into a file nobody can tell from
the page. This is what lets `source()` ({% ref "SPEC-198" /%}) and error messages report the
right file and lines for included content.

### D6: examples replace the fixture corpus, one rune at a time

- **`RUNE_EXAMPLES` and `RUNE_FIXTURE_META` are generated from definitions** for every rune that
  has one, and from `fixtures/*.md` for the native runes that remain. A rune's fixture file is
  deleted when its definition gains examples, and a test fails when both exist.
- **Consumers choose by role:**

  | Consumer | Uses |
  |---|---|
  | editor insertion and the rune picker | `minimal`, falling back to `canonical` |
  | AI write mode | `canonical` and `rich`, with `notes` |
  | `refrakt reference` and the gallery | `canonical` |
  | rune pages | any example the page includes by id, by choice; never `edge-case` by convention |
  | tests | all |

- **Rune pages keep their own prose, order and links.** They include examples by id, wrapped in
  whatever shows them (SPEC-198's demo composition on refrakt's own site). Pages are not
  generated from definitions.
- **The insertion `snippet` on `defineRune` stays separate.** Its tab stops (`${1:header}`) are not
  valid content, so it cannot be an example.
- **The structured-data scenarios stay in `contracts/seo-baseline/fixtures/` for now.** They
  record known defects on purpose, which does not belong in a rune's own examples. A compromise is
  open (below).

### D7: no `{% docs %}` block, for now

Short descriptions are frontmatter (`description`, and each attribute's), and every consumer
already reads them. The longer prose on rune pages is site content: it links to other pages and
uses site-only runes, so it is not portable inside a definition a plugin ships. A `docs` block is
added only when a consumer needs more than `description` and `notes`.

## Acceptance criteria

- [ ] A definition's body accepts only top-level `template`, `fragment` and `example` blocks, and loose content reports `definition-loose-content`
- [ ] A single template is written as `{% template %}` with no selecting attribute; a bare body loads with a deprecation warning for one release, and a codemod wraps the five existing ones
- [ ] A definition with no template loads, and is drawn only by a component (ADR-049)
- [ ] `{% example %}` requires an `id` and accepts `title`, `role`, `notes` and `expect`; `role` accepts only its four values
- [ ] Block ids are unique per file, and a duplicate reports `duplicate-block-id`
- [ ] Fragments are declared with an `id` (`{% fragment #body %}`), amending SPEC-168 D8
- [ ] Every example is validated against its rune's content model in tests, and findings not listed in `expect` fail
- [ ] `include` resolves `file#id` to the block with that id, and an unknown id reports `include-unknown-block` with the ids the file has
- [ ] `snippet` resolves a Markdoc `symbol` to the block with that id, with a `paired` extent
- [ ] Plugins expose their rune directory as a namespaced root, and core's definitions resolve under `core:`
- [ ] Nodes pasted by `include` carry `location.file`
- [ ] `RUNE_EXAMPLES` and `RUNE_FIXTURE_META` are generated from definitions where they exist, and a rune with both a fixture and examples fails a test
- [ ] Editor, AI write mode, `reference`, gallery and CLI read examples by role as D6 lists
- [ ] At least one rune page includes its examples by id instead of writing them inline

## Open questions

1. **The structured-data scenarios.** They record defects deliberately, so they do not belong
   among a rune's examples. One compromise: an `edge-case` example may be marked as a baseline
   scenario, and the baseline reads those, keeping defect notes in `notes`. Discuss before moving
   any.
2. **`example` as a name twice.** SPEC-198's site composition is also natural to call `example`.
   They never meet in one kind of file, but the language server and docs would show both; the site
   one may be better named `demo`.
3. **Is `role` closed?** Four values cover today's uses. A new consumer may want its own.
4. **`expect`'s grammar.** Error ids alone, or ids with a line or a count.
5. **Verify the `#id` shorthand end to end.** Markdoc documents `#x` as shorthand for `id="x"`,
   but nothing in the repository uses it yet. Check that `parse` from `@refrakt-md/runes` keeps
   it, that the language server and `refrakt format` preserve it, and whether a rune must declare
   `id` for Markdoc to accept it.

## References

- {% ref "ADR-048" /%}: a rune is input and template
- {% ref "ADR-049" /%}: a framework component replaces a rune's template
- {% ref "SPEC-168" /%}: templates and fragments (D8, D9), amended by D1 and D3
- {% ref "SPEC-131" /%}: name-based anchors for `snippet`
- {% ref "SPEC-141" /%}: per-rune preprocess
- {% ref "SPEC-102" /%}: the fixture corpus
- {% ref "SPEC-193" /%}: rune docs written for their reader
- {% ref "SPEC-198" /%}: `source()`, `output()` and `preview` as a composition

{% /spec %}
