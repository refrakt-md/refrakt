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

## Who it is for

**Tagline: "Markdown in, typed props out."** The line under it: "Your Markdown already has
structure. Marquise reads it."

Every alternative makes a team choose between content that reads as prose and content that is
structured. Marquise gives both: authors write plain Markdown, developers receive typed data.

**Primary audience: framework teams whose content is written by someone else.** A React, Vue,
Svelte or Astro site with its own design system, whose pages are built from content blocks (hero,
pricing, FAQ, recipe, product), written by marketers, writers or an AI. The authors never touch
JSX; the developers' own components receive validated, typed values.

**Secondary audiences:**

- **Teams generating content with AI.** A model writes Markdown far more reliably than JSX or
  nested JSON. Marquise gives it a grammar and examples, then validates what it wrote with error
  ids it can act on: write, validate, fix.
- **Docs and design-system teams:** component docs and API sections, with examples tested against
  their definitions.
- **Teams keeping content in git** rather than a headless CMS, who still want structure and
  schema.org output.

**Not for:** a whole site with themes and no frontend work (refrakt); relational data such as
inventories (a database or CMS); unstructured blogs (plain Markdown).

| Alternative | What it gives | What Marquise adds |
|---|---|---|
| MDX | components inside Markdown | authors never write JSX; content stays prose; the body is validated; content cannot run code, which matters when non-developers or an AI write it |
| Markdoc alone | tags with validated attributes | typed bodies (content models), definitions in `.md`, generated types, tested examples, editor tooling |
| Content collections (Astro, Velite, Contentlayer) | typed frontmatter | typed body content; complementary, since Marquise works on one document and they handle the site |
| Headless CMS | structure, an editing UI | plain files in git, readable diffs, no service to run |

**Marquise or refrakt.** Choose Marquise when you already have a site (framework, routing,
design system, components) and want typed content in it with nothing else imposed. Choose refrakt
when you want the site: themes, a design language, a rune library, navigation, cross-page
features. They are **a ladder, not a fork**: the same definitions and content work in both, so a
team can start with Marquise and add refrakt's runes, templates or themes later without rewriting
content, and a refrakt site can use Marquise components for app-specific parts (ADR-049).

The audience mostly uses MDX, not Markdoc, so the story is "move from MDX and keep your
components". The first page shows it rather than describing it: Markdown on one side, typed
props on the other.

## Marquise is the stable product; refrakt is the lab

*Recorded 2026-11-12.* Refrakt has grown in many directions at once (themes, a design language,
a large rune library, plan tooling, site features, editor), which is why a 1.0 has been hard to
reach. Marquise is not only a smaller package: it is where stability lives.

- **Refrakt stays the lab.** New ideas are tried there first, on real content, and may stay `0.x`
  for as long as that is useful.
- **Marquise ships 1.0 from what is already built and settled**, not from what is planned. It
  does not wait for refrakt's specs to settle; it freezes a small core that already has.
- **Ideas graduate one way.** A feature moves into Marquise only when its spec is implemented in
  refrakt, has been used on real content, and can arrive as an additive change. Marquise has no
  experimental flags: what is in it is stable.
- **Semver from 1.0.** A breaking change waits for a major release and comes with a codemod.
  Marquise versions independently; refrakt pins a range and adapts to Marquise, never the reverse.
- **Every hook is public API.** 1.0 ships only the hooks refrakt needs at that point. The rest
  arrive with the features that need them.
- **Saying no is the point.** A request that needs a site, a theme or a design vocabulary belongs
  in refrakt, or in the user's own site layer.

### What 1.0 contains

| In 1.0 | Status today |
|---|---|
| Indentation-tolerant parsing | SPEC-170, shipped |
| Content models: `sequence`, `delimited`, `sections` (not `custom`) | the resolver, in use by every rune |
| Definitions: frontmatter `attributes`, `content`, `description` | SPEC-145, accepted; five definitions live |
| Attribute and content validation, with error ids | in use (`refrakt validate`) |
| Preprocess and `include` | SPEC-141, shipped |
| The rune node, the generic renderers, components | ADR-049, proposed: **the one new piece**, and the product itself |
| The plain presentation | new, small |
| `validate`, `reference`, `format`, `types`, the language server | exist, to be split from refrakt |
| `@marquise/schema` | SPEC-130, shipped |
| `@marquise/data` | SPEC-103, shipped |

**A definition's body is reserved in 1.0:** it must be empty. That keeps SPEC-197's body blocks
(examples, then templates) additive when they arrive.

### After 1.0, each as a minor release once it graduates

| Feature | Waits for |
|---|---|
| `computes`, `prepare`, the value vocabulary, `matches()` | SPEC-194, SPEC-195 implemented in refrakt |
| `{% example %}`, `file#id`, examples in tooling | SPEC-197 |
| `source()` | SPEC-198 |
| deferred definitions | refrakt's pipeline using the model's version |
| `@marquise/snippet` | moving onto the preprocess hook |
| `@marquise/compose` | SPEC-168, SPEC-177 accepted and implemented |

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

**How `@marquise/schema` works when a component draws the markup.** *Recorded 2026-11-12.*
Refrakt's structured data has never depended on who draws the markup: the schema table stamps
`typeof` and `property` on the rune's own output during the transform, and `collectJsonLd`
(`seo.ts:80`) derives the JSON-LD from that tree, before the engine and the renderer run
(`lib/schema-table.ts` explains why). In Marquise:

- **JSON-LD is built from the rune node.** The node already carries the named values
  (attributes, computed values, slots), and the table maps names to schema.org properties. That
  is today's "rebuild from the bag" strategy as the only one; there is no stamping, and no
  resolving a name across `data-name` and `data-field`.
- **No RDFa in component markup.** RDFa means what the page's structure says: a `property`
  belongs to the nearest enclosing `typeof`. A component decides that structure, so Marquise
  cannot vouch for it, and a slot placed outside the root or two entities' parts interleaved
  would publish something false. A component-drawn rune publishes JSON-LD only, the format search
  engines recommend. Refrakt keeps RDFa for runes drawn by its own templates, where it controls
  the markup.
- **Entity boundaries are rune boundaries.** Each rune node may be one entity; a rune in another
  rune's slot is a nested entity, linked by the property the parent's table names for that slot
  (a recipe's steps as `recipeInstructions`, an FAQ's questions as `mainEntity`). Refrakt already
  stops at a nested `data-rune` (`findAllByName`, SPEC-146 D1); on the rune node the nesting is
  the data structure itself, so no component or theme can change it.
- **Sources across a composition wait for `@marquise/compose`.** A template can place one rune's
  content inside another's (a `character`'s portrait inside a `card`), which puts a property's
  source on the far side of a boundary (SPEC-145 D19, the reason for `data-owner` and
  `data-slot`). Without templates, 1.0 does not have that case.
- **The host places the JSON-LD.** Marquise returns JSON-LD objects for each document; the host
  writes the `<script type="application/ld+json">` into the head. Renderer packages may offer a
  helper. Cross-page `@id` links and not republishing embedded content (BUG-045) need the whole
  site, so they stay with the site layer.
- **The baseline checks the switch.** The new path will differ from today's tree walk in places.
  `contracts/seo-baseline/` records today's output, defects included, so every difference is
  shown and then accepted or fixed (SPEC-130).

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

*Revised 2026-11-12:* 1.0 is cut from what exists ("What 1.0 contains"), so nothing here waits
for refrakt's open specs. Every step before 5 is useful to refrakt on its own, so stopping early
wastes nothing.

1. **Seams inside the monorepo.** Pull the parser, resolver, definition input and validation into
   `@refrakt-md/model`; `runes` depends on it. A refactor with no new promises.
2. **The rune node and generic renderers** (ADR-049): split each renderer into its generic and
   refrakt halves; add the wrapper and shared-attribute hooks.
3. **Tooling split:** `validate`, `reference`, `format`, `types` and the language server work
   from `@refrakt-md/model` alone. Schema and data move onto the model as add-ons.
4. **A proof outside refrakt:** a small example project on plain Markdoc and React, with no
   refrakt config, theme or engine. If it is not compelling, stop here.
5. **Marquise 1.0:** own repository, the core, the renderers, the tooling, `@marquise/schema` and
   `@marquise/data`, a docs site (built with refrakt), and refrakt switches its dependency.
6. **Minor releases as features graduate** from refrakt, in the order of the table under "After
   1.0".

## Risks

- **Focus.** A second project needs its own docs, issues and releases.
- **Freezing the core.** Once others depend on Marquise, the definition format and resolver stop
  being free to change. Cutting 1.0 from what is already settled, reserving the definition body,
  and adding everything else as minor releases is what makes the freeze affordable.
- **Marquise becoming a second refrakt.** The pull to add "just one more" feature is what made
  refrakt hard to finish. The graduation rule and the "not for" list are the defence; the number
  of hooks is the early warning.
- **The lab drifting from the product.** Refrakt must build on the released Marquise, not on a
  private fork of it, or graduation turns into a port.
- **Explaining the idea.** Reinterpreting Markdown is obvious once used and unfamiliar before.
  The first page has to show it: Markdown in, typed props out.
- **Two sources of truth during incubation.** Refrakt must not grow a private path around a hook
  while the seam is being cut.

## Acceptance criteria

- [ ] `@refrakt-md/model` exists in the monorepo with the parser, resolver, definition input and validation, and depends on nothing in refrakt but `types`
- [ ] Marquise 1.0 contains exactly the table under "What 1.0 contains", and a definition with a non-empty body is rejected
- [ ] Every later feature arrives as a minor release, after its spec is implemented in refrakt
- [ ] `@refrakt-md/runes` builds on `@refrakt-md/model` through the hooks listed under "The boundary", with no special case for refrakt inside the model
- [ ] Each framework renderer has a generic half with no refrakt dependency beyond the model, and a refrakt half that adds the theme shell and the wrapper
- [ ] `validate`, `reference`, `format`, `types` and the language server run on a project that has definitions but no refrakt config, theme or plugins
- [ ] An example project renders definitions with React components using only the model and the generic React renderer
- [ ] A component-drawn rune publishes JSON-LD built from its rune node and no RDFa, and the structured-data baseline shows every difference from today, each accepted or fixed
- [ ] The decisions above are recorded, each with its outcome, before any package is published under the Marquise name

## References

- {% ref "ADR-048" /%}, {% ref "ADR-049" /%}
- {% ref "SPEC-194" /%}, {% ref "SPEC-195" /%}, {% ref "SPEC-197" /%}, {% ref "SPEC-198" /%}
- {% ref "SPEC-141" /%}: preprocess
- {% ref "SPEC-145" /%}, {% ref "SPEC-168" /%}, {% ref "SPEC-177" /%}: composition, templates and fragments, template lookup
- {% ref "SPEC-170" /%}: indentation-tolerant parsing and formatting
- {% ref "SPEC-131" /%}, {% ref "SPEC-134" /%}: snippet anchors and review markers
- {% ref "SPEC-103" /%}, {% ref "SPEC-127" /%}, {% ref "SPEC-113" /%}: the data rune, per-row templates, project files
- {% ref "SPEC-130" /%}, {% ref "SPEC-146" /%}: schema tables and the structured-data baseline, rune ownership

{% /spec %}
