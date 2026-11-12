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

Refrakt becomes Marquise's largest user: Marquise, plus its design vocabulary, the engine and
themes, the rune library, and the site pipeline.

**Marquise works on one document at a time.** It types the content inside a document and knows
nothing of sites: routes, URLs, navigation, or how pages refer to each other. That is the job of a
site layer, whether the framework's own (Astro content collections, Next, Nuxt Content) or
refrakt, which adds the whole site. Marquise cooperates with a site layer through hooks (host
values, deferred definitions) and never contains one.

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
| **Presentations**: something other than a component that draws a definition | the identity transform and themes; templates, until `@marquise/compose` exists |
| **Template tags and placeable definitions** a host adds to the template language, once `@marquise/compose` exists | refrakt's primitives (`section`, `attribution`, `frame`, `codeblock`), `group` with its layouts, `metablock`, and SPEC-177's theme and site template lookup |
| **Deferred definitions**: a definition left as a placeholder holding its source, expanded later when the host supplies values | runes whose data reads the entity registry, expanded after the cross-page pipeline (SPEC-194 D12.4); today's capture and re-parse in `deferred-body.ts` |
| **`prepare` stages** registered by packages | native runes' computations (SPEC-194 D3) |
| **File roots** contributed by packages | `core:`, `marketing:` for `include` and `snippet` (SPEC-197 D4) |
| **Extra definition keys** a host declares and validates | `role`, `placedBy`, `metaFields`, `registers`, `blocks`, `defaults` (`schema` belongs to `@marquise/schema`) |
| **Preprocess tags** registered by packages | `data`, `snippet`: tags that resolve to content before the transform, as `include` does |
| **Host values**: named values a host supplies to every expression | `$page` and `$site` (SPEC-194 D12), which refrakt fills from its loader; Marquise defines no site model |
| **Error presentation**: how a failure that must stay visible on the page is drawn | refrakt's `{% hint type="caution" %}` callout (`data-emit.ts:104` today). By default a failure is only a recorded finding |

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
| The filter grammar | `field-match.ts` (147 lines) | the `field:value` language behind `where=`; SPEC-195 D5 makes it the one predicate language through `matches()`, so it sits with the value vocabulary. `@marquise/data` and refrakt's `collection` both use it |
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

### Add-ons

| Package | From | When | Why separate |
|---|---|---|---|
| `@marquise/schema` | `lib/schema-table.ts`, `seo.ts`, `schema-row.ts` | **with the first release** | schema.org rows work on input only and are independent of themes, so they fit the boundary cleanly, and published structured data is one of the strongest reasons to choose typed content over plain Markdown. Separate because not every user publishes structured data |
| `@marquise/compose` | the template half of `lib/composition.ts`, `composition-placement.ts`, `slot-markers.ts` (SPEC-145, SPEC-168) | after the first release | the template language without refrakt's vocabulary: `{% slot %}`, `each`, `{% if %}`, variants, `{% fragment %}`, values, and **placing other definitions**. A template places only definitions, which are drawn by their components, their own templates or the plain presentation, so SPEC-194 D11's rule holds with the user's definitions as the primitives. A component can still replace a composed definition's template (ADR-049), and the renderer sees nested rune nodes. Later because it is the least settled part (SPEC-168, SPEC-177 are drafts), the largest (about 3,000 lines), and tangled with schema rows that cross rune boundaries (SPEC-145 D19), which go to `@marquise/schema` first |
| `@marquise/data` | `tags/data.ts`, `data-pipeline.ts`, `data-adapters.ts`, `data-projection.ts`, `data-emit.ts` (about 1,400 lines; SPEC-103, SPEC-127) | with the first release or right after | reads CSV, TSV, JSON and NDJSON from project files only (the `ProjectFiles` seam, SPEC-113), projects and types the rows, and resolves before the transform to a table or to its body once per row with `$row` bound. No registry, no pipeline. It extends the core idea rather than the tooling: a per-row body is ordinary Markdown, so definitions reinterpret generated content exactly as they do written content. Separate because not every site has tabular data |
| `@marquise/snippet` | `tags/snippet.ts`, `lib/anchor.ts`, `mask.ts`, `languages.ts`, `invocation.ts`, `review-marker.ts` (SPEC-131, SPEC-134) | after the first release | quotes regions of any source file by name: documentation about code, not reading typed values out of Markdown. No definition, field or example depends on it (`source()` shows an example's source). About 2,000 lines with per-language keyword tables to maintain. Shipped as an ordinary package using the preprocess hook, which proves that hook for other packages |

**Why `include` is core and `snippet` is not.** A content model reads a tag's parsed children,
so anything that should count as a tag's content must be in place before the model reads it.
Markdoc's own `partial` resolves at transform time, after that, so an included file could never
fill a rune's fields. `include` pastes parsed content first (SPEC-141), which makes it part of the
content model, and SPEC-197's examples and `file#id` addressing run through it. `snippet`
resolves to a fence whose content is never read as Markdoc again, so nothing in the model needs
it. In Marquise, refrakt's `_partials/` becomes one root a host configures, not a built-in
convention.

**Out of scope: the block editor** (`packages/editor`). It stays with refrakt.

## What stays with refrakt

- **The design vocabulary:** primitives (`section`, `attribution`, `frame`, `codeblock`), `group`
  and its layouts, `metablock`, `output()`, SPEC-177's theme and site template lookup and the
  per-theme structure contracts. The template language itself moves later, as
  `@marquise/compose`; until then it stays here.
- **The engine and themes:** `packages/transform` except the helpers listed above; universal
  attributes and their facets; `config.ts`; vocabulary; Lumina; tokens; contracts.
- **The rune library:** core runes in `packages/runes/src/tags` and all plugins.
- **The site:** `packages/content` (loading, routing, layouts, the cross-page pipeline, the
  entity registry), the collection, aggregate, relationships, xref and expand pipelines,
  `registers`, and `data-resolve.ts`. Despite its name, that is the sandbox's data binding: it
  runs after the pipeline and queries the entity registry. SPEC-194 D12's three data scopes split
  the same way: data files go with `@marquise/data`, `$page` and `$site` are host values refrakt
  fills, and the registry stays refrakt's.
- **Adapters:** `sveltekit`, `next`, `nuxt`, `astro` (the site integration), `eleventy`, `html`.
- **Refrakt-specific tooling:** `inspect`, `contracts`, `gallery`, the theme commands, `i18n`,
  `stale`, `plan`, `create-refrakt`, and the block editor.

## What has to be split first

| Module | Goes to Marquise | Stays with refrakt |
|---|---|---|
| `lib/index.ts` (the schema builder, 1,270 lines) | building a schema from attributes and a content model | universal attributes, schema tables, header roles, slot markers, composition wiring |
| `lib/composition.ts` (2,673 lines) | now: reading a definition's input (attributes, content, `computes`, defaults). Later, as `@marquise/compose`: template expansion and placement | the design vocabulary's tags and placement rules, reached only through the template-tag hook. Until the move, templates must not call refrakt's vocabulary directly, or extracting them becomes a rewrite |
| `deferred-body.ts` | capturing a tag's source as a placeholder and expanding it later | when to defer (the registry), and the values supplied |
| `reference.ts` | a definition's grammar | universal attributes, vocabulary, schema rows (as a host extension to the output) |
| `plugins.ts` | definition packages: definitions, `prepare` stages, file roots | theme config, pipeline hooks, layouts, CLI plugins |
| `packages/types` | `content-model.ts`, `serialized.ts`, the definition-package part of `package.ts` | theme, tokens, pipeline, config |
| The four renderers | generic renderer | theme shell and refrakt's wrapper |
| `examples.ts`, `fixtures.ts`, `cli/src/lib/fixtures.ts` | examples read from definitions | fixtures for native runes until they move |

## Decisions to make

1. **What a tag is called.** "Rune" is established in refrakt, but Svelte 5 also calls `$state`
   and `$derived` "runes", and Marquise ships a Svelte renderer. Candidates: "definition",
   "block", "shape", or keep "rune" and own the collision.
2. **Templates.** *Revised 2026-11-12.* Not in the first release; later as `@marquise/compose`.
   The template language is generic; what is refrakt's is the vocabulary it places
   (SPEC-194 D11: elements come only from primitives). In Marquise a template places only
   definitions, so a user's own definitions are its primitives, and refrakt adds its vocabulary
   through the template-tag hook. The first release ships components and the plain presentation.
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
6. **Break-out:** own repository, `marquise` packages with `@marquise/schema` and
   `@marquise/data`, a docs site (built with refrakt), and refrakt switches its dependency.
7. **Add-ons:** `@marquise/snippet`, on the preprocess hook; then `@marquise/compose`, once
   SPEC-168 and SPEC-177 are accepted and refrakt's vocabulary reaches templates only through the
   template-tag hook.

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
- {% ref "SPEC-145" /%}, {% ref "SPEC-168" /%}, {% ref "SPEC-177" /%}: composition, templates and fragments, template lookup
- {% ref "SPEC-170" /%}: indentation-tolerant parsing and formatting
- {% ref "SPEC-131" /%}, {% ref "SPEC-134" /%}: snippet anchors and review markers
- {% ref "SPEC-103" /%}, {% ref "SPEC-127" /%}, {% ref "SPEC-113" /%}: the data rune, per-row templates, project files

{% /spec %}
