{% spec id="SPEC-199" status="draft" tags="marquise, content-model, architecture, packaging, renderer, tooling, strategy" %}

# Marquise: the content model as its own project

## Summary

Refrakt's most general idea is not its themes or its rune library. It is that an author writes
ordinary Markdown inside a tag, and a declared content model reads typed values out of it: a
heading becomes `headline`, a list becomes `items`. Nothing else on the market does this for the
*body* of a document. Markdoc validates a tag's attributes but treats its children as untyped
content; MDX gives components but makes authors write props as JSX; content-collection tools
type the frontmatter, not the body.

**Marquise** is that idea on its own, built on Markdoc:

- a definition file declares a tag's attributes, content model and computed values;
- authors get validation, editor support and a grammar an AI can write against;
- developers get typed props and draw the tag with their own React, Vue, Svelte or Astro
  component;
- examples live in the definition and are tested against it.

Refrakt becomes Marquise's largest user: Marquise, plus templates, the engine and themes, the
rune library, and the site pipeline.

This spec is the breakdown: what goes, what stays, what has to be split first, the decisions to
make, and an order that keeps every step useful to refrakt even if the break-out never happens.
The name comes from the marquise gem cut, which also starts like Markdoc.

## Prerequisites

| Needs | From | State on 2026-11-12 |
|---|---|---|
| Every rune is input and template | {% ref "ADR-048" /%}, {% ref "SPEC-194" /%} | accepted |
| One value vocabulary | {% ref "SPEC-195" /%} | accepted |
| Components replace templates; the rune node | {% ref "ADR-049" /%} | proposed |
| Definition bodies, examples, `file#id` | {% ref "SPEC-197" /%} | draft |
| `source()` and `output()` | {% ref "SPEC-198" /%} | draft |

## The boundary

**A piece goes to Marquise if it needs only definitions and content. It stays with refrakt if it
needs themes, the engine, the design vocabulary or a site.**

Dependencies run one way: refrakt depends on Marquise, never the reverse. Refrakt plugs in through
general hooks that any other host could use too:

| Hook | Refrakt uses it for |
|---|---|
| **Shared attributes**: attributes every definition accepts, with a rule for which | the universal attributes (`width`, `tint`, `reveal`…), gated by declared structure |
| **A wrapper around a rune and around a slot** in the renderers | the engine root, background layers, the `dimensions` prop, part attributes (ADR-049 decision 8) |
| **Presentations**: something other than a component that draws a definition | templates, the identity transform and themes |
| **`prepare` stages** registered by packages | native runes' computations (SPEC-194 D3) |
| **File roots** contributed by packages | `core:`, `marketing:` for `include` and `snippet` (SPEC-197 D4) |
| **Extra definition keys** a host declares and validates | `role`, `placedBy`, `schema`, `metaFields`, `registers`, `blocks`, `defaults` |

**The test of the boundary:** refrakt builds on Marquise using only these hooks. If refrakt
needs a special case inside Marquise, the seam is in the wrong place.

## What goes to Marquise

### `marquise` (core)

| Part | Today | Notes |
|---|---|---|
| Parsing | `packages/runes/src/parse.ts` (indentation-tolerant, SPEC-170) | small; Markdoc stays a peer dependency |
| The definition format and loader | `composed-rune.ts`, `rune-dir.ts`, `project-runes.ts`, the input half of `lib/composition.ts` | frontmatter: `attributes`, `content`, `computes`, `prepare`, `description`; body: examples (SPEC-197). Templates are a host extension |
| The content-model resolver | `lib/resolver.ts` (1,104 lines), `types/src/content-model.ts` | already depends only on Markdoc and types |
| Attribute validation | `attributes.ts` | findings with ids, as `refrakt validate` returns them |
| The value vocabulary | `functions.ts`, SPEC-195's registry | `$attrs`, `$computed`, `$slots`; `first`, `split`, `item`, `text`, `source()` (SPEC-198). Not `output()`, which belongs to presentations |
| `prepare` registry | SPEC-194 D1–D3 | packages register stages by key; a definition names one |
| Preprocess and `include` | `lib/preprocess.ts`, `tags/include.ts` (SPEC-141) | plus `file#id` addressing and pasted content's origin (SPEC-197 D3, D5) |
| The rune node and serialisation | ADR-049 decision 8; `transform/src/serialize.ts`, `helpers.ts` (`isTag`), `html.ts` (`renderToHtml`) | plain data, safe to send from server to client |
| A plain presentation | new | how a definition renders with no component bound (open question 3) |

### Renderers: `@marquise/react`, `@marquise/vue`, `@marquise/svelte`, `@marquise/astro`

The generic halves of `packages/{react,vue,svelte,astro}`: drawing the tree, element overrides,
the component registry, rune-node dispatch, typed props, recursive slots, and the wrapper hook.
Not `ThemeShell`, layouts, route rules or behaviours.

### Tooling

| Package | From | Contents |
|---|---|---|
| `@marquise/cli` | `packages/cli/src/commands` | `validate`, `reference` (the grammar), `format` (SPEC-170 indentation), `types` (prop interfaces from definitions), `examples` (list and test) |
| `@marquise/language-server` + VS Code extension | `packages/language-server`, `packages/vscode` | completion, hover, diagnostics, go-to-definition, formatting; not `inspector.ts` |
| `@marquise/test` | new, from the example checks in SPEC-197 D2 | validate every example against its definition, compare `expect`, render through a bound component |
| `@marquise/ai` | `packages/ai` (prompt building, write mode) | prompts from the grammar and examples, filtered by `role` |
| `@marquise/mcp` | `packages/mcp`, slimmed | validate, reference, format, types, examples |

### Optional add-ons, after the first release

| Package | From | Why later |
|---|---|---|
| `@marquise/snippet` | `tags/snippet.ts`, `lib/anchor.ts`, `mask.ts`, `languages.ts`, `invocation.ts`, `review-marker.ts` (SPEC-131, SPEC-134) | general docs tooling, about 2,000 lines; useful, not essential |
| `@marquise/schema` | `lib/schema-table.ts`, `seo.ts`, `schema-row.ts` | schema.org rows are input-side and theme-independent, but a large surface to support |
| `@marquise/editor` | `packages/editor` | forms come from the content model and `editHints`, but its preview uses refrakt's content, highlighting and rendering |

## What stays with refrakt

- **Presentation:** the template language and its checks (`lib/composition.ts`'s template half,
  `composition-placement.ts`, `slot-markers.ts`, SPEC-168, SPEC-177), primitives, `output()`.
- **The engine and themes:** `packages/transform` except the helpers listed above; universal
  attributes and their facets; `config.ts`; vocabulary; Lumina; tokens; contracts.
- **The rune library:** core runes in `packages/runes/src/tags` and all plugins.
- **The site:** `packages/content` (loading, routing, layouts, the cross-page pipeline, the
  entity registry), the data, collection, aggregate, xref and expand pipelines, `registers`.
- **Adapters:** `sveltekit`, `next`, `nuxt`, `astro` (the site integration), `eleventy`, `html`.
- **Refrakt-specific tooling:** `inspect`, `contracts`, `gallery`, the theme commands, `i18n`,
  `stale`, `plan`, `create-refrakt`.

## What has to be split first

| Module | Goes to Marquise | Stays with refrakt |
|---|---|---|
| `lib/index.ts` (the schema builder, 1,270 lines) | building a schema from attributes and a content model | universal attributes, schema tables, header roles, slot markers, composition wiring |
| `lib/composition.ts` (2,673 lines) | reading a definition's input: attributes, content, `computes`, defaults | template expansion and placement |
| `reference.ts` | a definition's grammar | universal attributes, vocabulary, schema rows (as a host extension to the output) |
| `plugins.ts` | definition packages: definitions, `prepare` stages, file roots | theme config, pipeline hooks, layouts, CLI plugins |
| `packages/types` | `content-model.ts`, `serialized.ts`, the definition-package part of `package.ts` | theme, tokens, pipeline, config |
| The four renderers | generic renderer | theme shell and refrakt's wrapper |
| `examples.ts`, `fixtures.ts`, `cli/src/lib/fixtures.ts` | examples read from definitions | fixtures for native runes until they move |

## Decisions to make

1. **What a tag is called.** "Rune" is established in refrakt, but Svelte 5 also calls `$state`
   and `$derived` "runes", and Marquise ships a Svelte renderer. Candidates: "definition",
   "block", "shape", or keep "rune" and own the collision.
2. **Templates in Marquise or not.** Recommended: not in the first release. Templates need a
   design vocabulary (SPEC-194 D11: elements come only from primitives), which is refrakt's.
   Marquise ships components and a plain presentation; refrakt adds templates as a presentation.
3. **The plain presentation.** What a definition renders as with no component: an error, or the
   definition's `tag:` element with each slot in order and attributes as `data-*`. Recommended:
   the second, so content is never silently lost and a definition is useful before its component
   exists.
4. **Repository.** Incubate inside this monorepo as `@refrakt-md/model` and the generic renderer
   packages, then move to its own repository once the seams hold. The move is the cheap part if
   the seams are right.
5. **Versioning.** Refrakt's packages are versioned together (Changesets fixed mode). Marquise
   needs its own versions, with refrakt pinning a range.
6. **Licence.** Refrakt is MIT; Marquise stays MIT.
7. **Names to secure early.** On 2026-11-12, `marquise`, `marquise-md` and `marquisejs` were free
   on npm. The `@marquise` npm scope, the GitHub organisation and the `marquise.md` domain still
   need checking by hand.

## Order

Every step before 6 is useful to refrakt on its own, so stopping early wastes nothing.

1. **Seams inside the monorepo.** Pull the parser, resolver, definition input and value
   vocabulary into `@refrakt-md/model`; `runes` depends on it. A refactor with no new promises.
2. **The rune node and generic renderers** (ADR-049): split each renderer into its generic and
   refrakt halves; add the wrapper and shared-attribute hooks.
3. **Examples and addressing** (SPEC-197), and `source()` (SPEC-198).
4. **Tooling split:** grammar, `types`, example tests and the language server work from
   `@refrakt-md/model` alone.
5. **A proof outside refrakt:** a small example project on plain Markdoc and React, with no
   refrakt config, theme or engine. If it is not compelling, stop here.
6. **Break-out:** own repository, `marquise` packages, a docs site (built with refrakt), and
   refrakt switches its dependency.
7. **Add-ons:** snippet, schema, editor.

## Risks

- **Focus.** A second project needs its own docs, issues and releases.
- **Freezing the core.** Once others depend on Marquise, the definition format and resolver stop
  being free to change, while SPEC-194, SPEC-195 and SPEC-197 are still moving them. Step 6 should
  wait until they settle.
- **Explaining the idea.** Reinterpreting Markdown is obvious once used and unfamiliar before.
  The first page has to show it: Markdown in, typed props out.
- **Two sources of truth during incubation.** Refrakt must not grow a private path around a hook
  while the seam is being cut.

## Acceptance criteria

- [ ] `@refrakt-md/model` exists in the monorepo with the parser, resolver, definition input and value vocabulary, and depends on nothing in refrakt but `types`
- [ ] `@refrakt-md/runes` builds on `@refrakt-md/model` through the hooks listed under "The boundary", with no special case for refrakt inside the model
- [ ] Each framework renderer has a generic half with no refrakt dependency beyond the model, and a refrakt half that adds the theme shell and the wrapper
- [ ] `validate`, `reference`, `format`, `types` and the language server run on a project that has definitions but no refrakt config, theme or plugins
- [ ] An example project renders definitions with React components using only the model and the generic React renderer
- [ ] The decisions above are recorded, each with its outcome, before any package is published under the Marquise name

## References

- {% ref "ADR-048" /%}, {% ref "ADR-049" /%}
- {% ref "SPEC-194" /%}, {% ref "SPEC-195" /%}, {% ref "SPEC-197" /%}, {% ref "SPEC-198" /%}
- {% ref "SPEC-141" /%}: preprocess
- {% ref "SPEC-170" /%}: indentation-tolerant parsing and formatting
- {% ref "SPEC-131" /%}, {% ref "SPEC-134" /%}: snippet anchors and review markers

{% /spec %}
