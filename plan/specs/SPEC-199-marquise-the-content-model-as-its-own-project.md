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

**Beyond rendering: Markdown as a data store** (*explored 2026-11-15*,
`notes/marquise-foundation.md` section 18). A resolved shape node is plain data before any renderer
sees it, so rendering is one consumer of three: render, extract (typed records as JSON, an API, a
search index, a feed) and write (changing records by address, keeping the Markdown intact). Extract
plus write makes Markdown a data store: readable files, reviewable diffs, git history, no service, and
a schema guaranteeing the data's shape. Refrakt's plan files already work this way. Use cases include
structured records people write as prose (recipes, events, changelogs, decision records), content as
an API from git, search indexes with real fields, AI agents maintaining structured project knowledge,
and data-quality gates in CI. The line: extraction per document and the write path in core;
cross-document queries in the corpus layer; no database features, git being the storage.
**Tagline candidate covering both: "Markdown in, typed data out."**

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

*Revised 2026-11-19* (`notes/marquise-foundation.md`, X1): **1.0 is the read path, records included,**
with the content-model revision built in refrakt first, so 1.0 ships the revised format.

| In 1.0 | Status today |
|---|---|
| Indentation-tolerant parsing; one syntax, Markdoc | SPEC-170, shipped |
| Shape files: frontmatter `attributes`, `content`, `description`, `summary`, `plain` | SPEC-145, accepted; five definitions live |
| Document shapes, minimal (notes Y4): a shape applied to a whole document; frontmatter as its attributes, undeclared keys passed to the host, `shape`, `id` and `lang` reserved | to be built and used during 0.x, through plan's rebuild |
| The revised content model (notes, section 17): combinators, `as: block \| inline \| text` and value types, item models, `tag:` matches for explicit child shapes; matching and analysis per {% ref "SPEC-201" /%} | to be built in refrakt first, compiling down to the existing resolver; {% ref "SPEC-200" /%}, draft |
| Attribute and content validation, with finding ids and addresses | in use (`refrakt validate`); addresses new (notes, section 19) |
| Records (extraction), JSON Schema, the Standard Schema validator, generated types | types exist; records and the validator new and small |
| The preprocess hook, with provenance and declared dependencies | SPEC-141, shipped (the hook); `include` itself is a satellite (below) |
| The shape node, the generic renderers, components | ADR-049, proposed: **the one new piece**, and the product itself |
| The plain presentation | new, small |
| `validate`, `types`, `extract`, `format`, `reference`, the language server | exist except `extract`, to be split from refrakt |
| `@marquise-md/schema` and `@marquise-md/include`, first-party satellites | SPEC-130, SPEC-141, shipped |

**A definition's body is reserved in 1.0:** it must be empty. That keeps SPEC-197's body blocks
(examples, write templates) additive when they arrive.

### After 1.0, each as a minor release once it graduates

| Feature | Waits for |
|---|---|
| The write path: addresses for edits, edit operations, writing forms, write templates | the parser spike (notes X5); Rivière's plan rebuild as its first real user |
| Compact forms owned by child shapes (a bare shape name matching every form), with write templates | being built in refrakt, which keeps `emitTag` in its own extension namespace meanwhile (notes Y2) |
| `computes`, `prepare`, the value vocabulary, `matches()` | SPEC-194, SPEC-195 implemented in refrakt |
| `{% example %}`, `file#id`, examples in tooling | SPEC-197 |
| `source()` | SPEC-198 |
| Deferred shapes (definitions); dimensions on documents, `fills`, folder defaults | refrakt's pipeline and Rivière using them |
| Kits, dimensions, presets, bindings, middleware | a design language built on them, refrakt's first |
| Migrations | SPEC-189 |
| MCP | the table of operations (notes A4) |
| A second syntax (Comark) | the primary-syntax decision (notes Z1i) |
| `@marquise-md/compose` | SPEC-168, SPEC-177 accepted and implemented |

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
| **Presentations**: something other than a component that draws a definition | the identity transform and themes; templates, until `@marquise-md/compose` exists |
| **Template tags and placeable definitions** a host adds to the template language, once `@marquise-md/compose` exists | refrakt's primitives (`section`, `attribution`, `frame`, `codeblock`), `group` with its layouts, `metablock`, and SPEC-177's theme and site template lookup |
| **Deferred definitions**: a definition left as a placeholder holding its source, expanded later when the host supplies values | runes whose data reads the entity registry, expanded after the cross-page pipeline (SPEC-194 D12.4); today's capture and re-parse in `deferred-body.ts` |
| **`prepare` stages** registered by packages | native runes' computations (SPEC-194 D3) |
| **File roots** contributed by packages | `core:`, `marketing:` for `include` and `snippet` (SPEC-197 D4) |
| **Extension namespaces** in definitions: each extension owns one key, its name, at the levels it declares (shape, attribute, field, item model), with a schema Marquise validates | `refrakt:` holding `role`, `placedBy`, `metaFields`, `registers`, `blocks`, `defaults` (moved by codemod); `schema:` belongs to `@marquise-md/schema`, `riviere:` to Rivière |
| **Preprocess tags** registered by packages | `data`, `snippet`: tags that resolve to content before the transform, as the `include` satellite does |
| **Host values**: named values a host supplies to every expression | `$page` and `$site` (SPEC-194 D12), which refrakt fills from its loader; Marquise defines no site model |
| **Error presentation**: how a failure that must stay visible on the page is drawn | refrakt's `{% hint type="caution" %}` callout (`data-emit.ts:104` today). By default a failure is only a recorded finding |

**Extension namespaces.** *Decided 2026-11-18* (`notes/marquise-foundation.md`, section 11,
"Extensions in shape files"). An extension owns exactly one key in a definition, its name, at every
level where it registers one, and puts everything it needs inside. Two packages claiming one name is a
loading error. An unknown key in core or inside a known namespace is an error finding; a key that is
neither core nor a registered namespace is an info finding ("not installed") and passed through
untouched, so a shape library carrying hints for an extension still loads without it, while typos are
still caught. Marquise validates each namespace against the schema its extension registers, composes
those schemas into the shape-file schema the language server uses, never interprets the data
(extensions read `shape.extensions.<name>`), and publishes it as vendor keywords (`x-<name>`). A key
graduates into core by migration when more than one consumer needs it; the **summary projection**
(`summary: [title, status]`) is core from the start. Authors never write namespaces: shared attributes
on tags keep plain names, and a collision between two extensions' shared attributes is a configuration
error.

**The test of the boundary:** refrakt builds on Marquise using only these hooks. If refrakt
needs a special case inside Marquise, the seam is in the wrong place.

**Marquise is a layer frameworks stack on; it never owns the chain.** *Decided 2026-11-17*
(`notes/marquise-foundation.md`, section 3, "An Astro content loader for Rivière"). Refrakt owns the
whole chain (its own loader, router, layouts and adapters), so every framework has to be adapted to
it. Marquise, and Rivière above it, supply only what a host framework lacks (typed, validated,
writable content, and relations between documents) and leave the rest to the host: routing, pages,
layouts, images, islands, the build. The test for a new feature, beside the scope rule for core
(section 20 of the notes): **does it take over something the host framework already does?** If so, it
belongs in the host, an integration, or refrakt.

## What goes to Marquise

### `marquise` (core)

| Part | Today | Notes |
|---|---|---|
| Parsing | `packages/runes/src/parse.ts` (indentation-tolerant, SPEC-170) | small; Markdoc stays a peer dependency |
| The definition format and loader | `composed-rune.ts`, `rune-dir.ts`, `project-runes.ts`, the input half of `lib/composition.ts` | frontmatter: `attributes`, `content`, `computes`, `prepare`, `description`; body: examples (SPEC-197). Templates are a host extension |
| The content-model resolver | `lib/resolver.ts` (1,104 lines), `types/src/content-model.ts` | already depends only on Markdoc and types |
| Attribute validation | `attributes.ts` | findings with ids, as `refrakt validate` returns them |
| The value vocabulary | `functions.ts`, SPEC-195's registry | `$attrs`, `$computed`, `$slots`; `first`, `split`, `item`, `text`, `source()` (SPEC-198). Not `output()`, which belongs to presentations |
| The filter grammar | `field-match.ts` (147 lines) | the `field:value` language behind `where=`; SPEC-195 D5 makes it the one predicate language through `matches()`, so it sits with the value vocabulary. refrakt's `data` and `collection` both use it |
| `prepare` registry | SPEC-194 D1–D3 | packages register stages by key; a definition names one |
| The preprocess hook | `lib/preprocess.ts` (SPEC-141) | with provenance (pasted content's origin, SPEC-197 D5) and the files each directive read; `file#id` addressing stays in core as the address form. `tags/include.ts` moves to a satellite (*decided 2026-11-17*) |
| The rune node and serialisation | ADR-049 decision 8; `transform/src/serialize.ts`, `helpers.ts` (`isTag`), `html.ts` (`renderToHtml`) | plain data, safe to send from server to client |
| A plain presentation | new | how a definition renders with no component bound (open question 3) |

### Renderers: `@marquise-md/react`, `@marquise-md/vue`, `@marquise-md/svelte`, `@marquise-md/astro`

The generic halves of `packages/{react,vue,svelte,astro}`: drawing the tree, element overrides,
the component registry, rune-node dispatch, typed props, recursive slots, and the wrapper hook.
Not `ThemeShell`, layouts, route rules or behaviours.

### Tooling

| Package | From | Contents |
|---|---|---|
| `@marquise-md/cli` | `packages/cli/src/commands` | `validate`, `reference` (the grammar), `format` (SPEC-170 indentation), `types` (prop interfaces from definitions), `examples` (list and test) |
| `@marquise-md/language-server` + VS Code extension | `packages/language-server`, `packages/vscode` | completion, hover, diagnostics, go-to-definition, formatting; not `inspector.ts` |
| `@marquise-md/test` | new, from the example checks in SPEC-197 D2 | validate every example against its definition, compare `expect`, render through a bound component |
| `@marquise-md/ai` | `packages/ai` (prompt building, write mode) | prompts from the grammar and examples, filtered by `role` |
| `@marquise-md/mcp` | `packages/mcp`, slimmed | validate, reference, format, types, examples |

### Satellites

*Revised 2026-11-17* (`notes/marquise-foundation.md`, section 20). Marquise core owns the **seams**
(preprocess, computed values through `prepare`, render middleware), not the tools that plug into them.
Everything outside core is a **satellite**: its own repository, its own versions, depending only on
Marquise's published packages, never on workspace links or internal modules. The separation enforces
the public contract: a satellite that needs a private import shows a missing seam.

**The scope rule for core:** a piece belongs in core only if the content model, validation, records or
the write path cannot be correct without it, or every user needs it. Everything else sits behind a
public seam.

**First-party satellites are only those that prove a seam:**

| Package | From | When | Why |
|---|---|---|---|
| `@marquise-md/schema` | `lib/schema-table.ts`, `seo.ts`, `schema-row.ts` | **with the first release** | schema.org rows work on input only and are independent of themes, so they fit the boundary cleanly, and published structured data is one of the strongest reasons to choose typed content over plain Markdown. Separate because not every user publishes structured data |
| `@marquise-md/include` | `tags/include.ts` (182 lines, SPEC-141) | with the first release | the reference directive: proves the preprocess hook, with provenance and declared dependencies, on day one. Optional, since not every project assembles content from files |
| `@marquise-md/compose` | the template half of `lib/composition.ts`, `composition-placement.ts`, `slot-markers.ts` (SPEC-145, SPEC-168) | after the first release | the template language without refrakt's vocabulary: `{% slot %}`, `each`, `{% if %}`, variants, `{% fragment %}`, values, and **placing other definitions**. A template places only definitions, which are drawn by their components, their own templates or the plain presentation, so SPEC-194 D11's rule holds with the user's definitions as the primitives. A component can still replace a composed definition's template (ADR-049), and the renderer sees nested rune nodes. Later because it is the least settled part (SPEC-168, SPEC-177 are drafts), the largest (about 3,000 lines), and tangled with schema rows that cross rune boundaries (SPEC-145 D19), which go to `@marquise-md/schema` first |

**Not Marquise's:** `data` (`tags/data.ts`, `data-pipeline.ts`, `data-adapters.ts`, `data-projection.ts`,
`data-emit.ts`, SPEC-103, SPEC-127), `snippet` (`tags/snippet.ts`, `anchor.ts`, `mask.ts`,
`languages.ts`, `invocation.ts`, `review-marker.ts`, SPEC-131, SPEC-134) and the `diff` rune's algorithm
(`lib/line-diff.ts`) stay in refrakt, which uses Marquise's public hooks for them from outside: the
best test those hooks get. Earlier drafts planned `@marquise-md/data` and `@marquise-md/snippet`.

**Why the preprocess hook is core and `include` is not.** A content model reads a tag's parsed
children, so anything that should count as a tag's content must be in place before the model reads
it. Markdoc's own `partial` resolves at transform time, after that, so an included file could never
fill a rune's fields. That makes the *hook* part of the content model; and with it, **provenance**
(findings point at the included file, the write path redirects or refuses edits to included content)
and **declared dependencies** (a directive names the files it read, for caching, hot reload and
determinism). `include` is one user of the hook, 182 lines, and not needed by every project.
*Earlier (2026-11-12) this paragraph kept `include` in core;* the hook was what the argument proved.
In Marquise, refrakt's `_partials/` becomes one root a host configures, not a built-in convention.

**How `@marquise-md/schema` works when a component draws the markup.** *Recorded 2026-11-12.*
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
- **Sources across a composition wait for `@marquise-md/compose`.** A template can place one rune's
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
  `@marquise-md/compose`; until then it stays here.
- **The engine and themes:** `packages/transform` except the helpers listed above; universal
  attributes and their facets; `config.ts`; vocabulary; Lumina; tokens; contracts.
- **The rune library:** core runes in `packages/runes/src/tags` and all plugins.
- **The site:** `packages/content` (loading, routing, layouts, the cross-page pipeline, the
  entity registry), the collection, aggregate, relationships, xref and expand pipelines,
  `registers`, and `data-resolve.ts`. Despite its name, that is the sandbox's data binding: it
  runs after the pipeline and queries the entity registry. SPEC-194 D12's three data scopes split
  the same way: data files go with refrakt's `data`, `$page` and `$site` are host values refrakt
  fills, and the registry stays refrakt's.
- **Adapters:** `sveltekit`, `next`, `nuxt`, `astro` (the site integration), `eleventy`, `html`.
- **Refrakt-specific tooling:** `inspect`, `contracts`, `gallery`, the theme commands, `i18n`,
  `stale`, `plan`, `create-refrakt`, and the block editor.

## What has to be split first

| Module | Goes to Marquise | Stays with refrakt |
|---|---|---|
| `lib/index.ts` (the schema builder, 1,270 lines) | building a schema from attributes and a content model | universal attributes, schema tables, header roles, slot markers, composition wiring |
| `lib/composition.ts` (2,673 lines) | now: reading a definition's input (attributes, content, `computes`, defaults). Later, as `@marquise-md/compose`: template expansion and placement | the design vocabulary's tags and placement rules, reached only through the template-tag hook. Until the move, templates must not call refrakt's vocabulary directly, or extracting them becomes a rewrite |
| `deferred-body.ts` | capturing a tag's source as a placeholder and expanding it later | when to defer (the registry), and the values supplied |
| `reference.ts` | a definition's grammar | universal attributes, vocabulary, schema rows (as a host extension to the output) |
| `plugins.ts` | definition packages: definitions, `prepare` stages, file roots | theme config, pipeline hooks, layouts, CLI plugins |
| `packages/types` | `content-model.ts`, `serialized.ts`, the definition-package part of `package.ts` | theme, tokens, pipeline, config |
| The four renderers | generic renderer | theme shell and refrakt's wrapper |
| `examples.ts`, `fixtures.ts`, `cli/src/lib/fixtures.ts` | examples read from definitions | fixtures for native runes until they move |

## Decisions to make

1. **What a tag is called.** *Decided 2026-11-12: authors write **tags**; developers define
   **shapes**.*

   > Define a `recipe` shape in `shapes/recipe.md`. Authors write `{% recipe %}` in plain
   > Markdown. Your `Recipe` component receives typed props.

   - **Why not "rune".** Svelte 5 calls `$state` and `$derived` "runes", and Marquise ships a
     Svelte renderer; the word also tells a newcomer nothing. Refrakt keeps "rune" as part of its
     character.
   - **Two things, two words.** What an author writes in a page is a **tag**, Markdoc's own word,
     so authors learn nothing new. What a developer defines (attributes, content model, computed
     values) is a **shape**: it says what the definition is, the shape content takes, and
     developers already speak of "the shape of the data". It is distinct and searchable.
   - **It fits refrakt's own use.** {% ref "SPEC-168" /%} D6 already calls reusable content
     structure a "shared shape" (`file="shapes/profile.md#body"`).
   - **The ladder in one sentence:** every refrakt rune is a Marquise shape plus refrakt's extras
     (templates, a theme presentation, the design vocabulary).
   - **Considered:** "block" (the audience's own word, but inline tags are not blocks, Markdown
     already splits block from inline, and SPEC-197 uses "blocks" for a definition's body);
     "definition" (accurate for the file, clumsy for everything else); "component" (the very
     thing a shape maps to); gem-themed words (unclear; kept for the name and tools instead).
   - **Knock-ons:** the directory convention is `shapes/`; error ids and docs use "shape" and
     "tag"; frontmatter keys (`attributes`, `content`, `computes`) are already neutral and do not
     change. The rest of this spec says "definition" and "rune node" for refrakt's side; Marquise's
     own docs and APIs use "shape" (and a "shape node" where this spec says rune node).
2. **Templates.** *Revised 2026-11-12.* Not in the first release; later as `@marquise-md/compose`.
   The template language is generic; what is refrakt's is the vocabulary it places
   (SPEC-194 D11: elements come only from primitives). In Marquise a template places only
   definitions, so a user's own definitions are its primitives, and refrakt adds its vocabulary
   through the template-tag hook. The first release ships components and the plain presentation.
3. **The plain presentation.** *Decided 2026-11-12:* a shape with no component bound renders
   plainly, so content is never silently lost and a shape is useful before its component exists.
   Once it ships the markup is a public format, so it is kept as small as possible:

   ```html
   <section data-shape="hero" data-align="start" data-media-position="bottom" aria-labelledby="mq-1-headline">
     <div data-slot="media"><img src="/img/dashboard.png" alt="The dashboard"></div>
     <div data-slot="eyebrow"><p>New in 2.0</p></div>
     <div data-slot="headline"><h1 id="mq-1-headline">Ship docs your team will actually read</h1></div>
     <div data-slot="blurb"><p>From Markdown to a polished site in minutes.</p></div>
     <div data-slot="actions">
       <ul>
         <li><a href="/docs">Get started</a></li>
         <li><a href="https://github.com/acme/docs">View on GitHub</a></li>
       </ul>
     </div>
   </section>
   ```

   *Updated 2026-11-19* (notes, X12.4): the plain presentation keeps the source's semantics (a heading
   field as a heading at the author's level, paragraphs and lists inside their wrappers, the root labelled
   by its heading, `role="group"` when the root is a `div`, generated ids prefixed and numbered per page).

   - **The root** is the shape's `tag:` (default `div`), with `data-shape` and one `data-*`
     attribute per attribute: kebab-case, defaults included.
   - **One `data-slot` wrapper per non-empty field, in content order.** A `block` field holds its
     nodes as written, an `inline` or `text` field its content ({% ref "SPEC-200" /%} D1). An item
     list renders from each item's `content` (SPEC-200 D10), so the list appears as the author
     wrote it.
   - **Nested shapes in a slot** render recursively: through their component if one is bound,
     plainly otherwise.
   - **No classes.** Classes are a theme's ({% ref "SPEC-196" /%}); the attributes are what a
     developer styles against.
   - **`data-slot`** keeps the meaning refrakt gives it: a composed rune's slot names are its
     published names (SPEC-145 D10c). `data-shape` follows decision 1.
   - **An unbound shape is reported:** `marquise validate` warns `shape-unbound`, so a forgotten
     component is noticed; a strict project makes it an error.
4. **Repository.** *Revised 2026-11-19* (`notes/marquise-foundation.md`, sections 21 and 22, X1 and
   X2): **build the content-model revision in refrakt, then extract Marquise early, as 0.x, in its own
   repository (`marquise-md/marquise`), with refrakt as its first consumer.** Rivière starts in its own
   repository, and plan is rebuilt on it. 1.0 is declared for each after a period of stability with at
   least one consumer besides refrakt.
   - **Why not incubate until the seams hold** (the earlier decision): seams prove themselves only by
     crossing a real boundary, so incubation cannot verify what it is meant to verify. Inside the
     monorepo any package can import anything, which is how `@refrakt-md/runes` reached 111 exports;
     and building everything first turns the move into a large, late migration that keeps slipping.
   - **Building and freezing are different:** 0.x allows a lot to be built while breaking changes are
     still allowed; semver from 1.0 means "we stopped breaking things", known only after living with it.
   - **Development across repositories** uses local links (`npm link`, `file:` dependencies) for a fast
     loop; refrakt's `main` pins released 0.x versions.
   - **Not refrakt-shaped:** neither project reaches 1.0 with refrakt as its only user. Marquise needs the
     proof outside refrakt (step 4 below); Rivière needs a consumer unlike plan, such as the Astro proof
     project or a different domain.
5. **Versioning.** Refrakt's packages are versioned together (Changesets fixed mode). Marquise
   needs its own versions, with refrakt pinning a range.
6. **Licence.** Refrakt is MIT; Marquise stays MIT.
7. **Names to secure early.** On 2026-11-12, `marquise`, `marquise-md` and `marquisejs` were free
   on npm. The `@marquise` npm scope, the GitHub organisation and the `marquise.md` domain still
   need checking by hand.
8. **Attribute and field names.** *Decided 2026-11-12:* kebab-case in shapes, camelCase in
   props, by one fixed rule.
   - **Authors see attributes the way HTML spells them** (`media-position`), as refrakt
     does for nearly everything.
   - **Developers see JavaScript names** (`mediaPosition`). ADR-008's renderers already convert
     this way (`fromKebabCase`), and Vue makes the same conversion between templates and scripts.
   - **Field names follow the same rule** (`avatar-after` becomes `avatarAfter`).
   - **Generated types document both spellings**, for example
     `/** \`media-position\` in Markdown. Default "bottom". */`.
   - **Two names that collide after conversion** in one shape are a shape error,
     `name-collision`.
   - **A camelCase attribute name in a shape is reported**, so the rule stays one-directional.
     Refrakt itself is not consistent today (its `datatable` example writes `pageSize=10`).

## Package names

*Decided 2026-11-17* (`notes/marquise-foundation.md`, section 3). The npm scope `@marquise` exists
with no public packages, so it is not available. Core is the unscoped **`marquise`** (free), and every
other package is under **`@marquise-md`**, following `@refrakt-md` and the `marquise.md` domain:
`@marquise-md/react`, `@marquise-md/cli`, `@marquise-md/schema`, `@marquise-md/include`, and so on.
The corpus layer, Rivière, is its own project under `@riviere-md`.

## Public contracts

*Added 2026-11-13* from the brainstorm (`notes/marquise-foundation.md`, section 16, Z6). Semver
protects only what is listed here.

| Who depends on it | Contracts |
|---|---|
| Content authors | the content syntax and Marquise's conventions (explicit slots `#name` and `#default`, `file#id`, `example` blocks); a library's shape vocabulary (the library's); a design language's dimensions (the kit's) |
| Shape and kit authors | the shape file format, including extension namespaces and the info finding for one not installed; dimension and preset formats; the kit manifest; the migration format (after SPEC-189); the binding format; the template language, with `@marquise-md/compose` |
| Developers | the shape node (prop naming, slots, item records, the dimensions convention); generated type names and structure; host callbacks (`values`, `files`, `resolveAsset`, `resolveLink`, `translate`, `icon`, `onFinding`, `presentFinding`); middleware and the context API; the lookup node; the directive and `prepare` registries; each renderer's component contract |
| Machines | finding ids, severities and message parameters; the published schema documents; edit operations; CLI commands, flags, exit codes and JSON output; MCP tools and resources |
| Browsers, stylesheets, search engines | the plain presentation markup (decision 3); the structure of JSON-LD output |
| Everyone (behavioural) | determinism: the same content, shapes, kit versions and host values give the same output, which also defines cache keys; the trust boundary of untrusted mode |

**Not contracts:** internal module paths; message wording (the id and parameters are); annotations
added in development or editor modes; the order of findings; anything refrakt-specific.

**Rules:**

1. Semver across Marquise's packages; breaking a listed contract means a major release, with a codemod
   for content or an upgrade guide for code.
2. Formats read by outside tools carry a format version: the published schema documents, the kit
   manifest, JSON output. Shape files do not; Marquise's major version implies it.
3. Finding ids are never reused; a renamed id keeps an alias for a deprecation period.
4. Markup and output change additively: a new `data-*` attribute is fine; renaming or removing one is
   breaking.
5. Tightening untrusted mode can break content that passed before, so it is announced and treated as
   breaking; loosening is never silent.
6. No experimental flags: anything public is on this list; anything not ready is not exported.

**Enforcement**, after refrakt's committed-and-checked pattern (`contracts/structures.json` with
`refrakt contracts --check`, the structured-data baseline): a public TypeScript API report diffed on
every pull request; snapshots of the finding catalogue, the schema formats and the plain presentation
markup; a JSON-LD baseline; the hostile-content suite; round-trip edit tests.

**Contracts Marquise depends on.** If Marquise builds on Comark, it consumes Comark's document format,
plugin API (`post`, `state.tokens`) and renderer conventions (`:`-prefixed JSON props, `template`
slots, React's `slot{Name}` props), which it does not control and which are pre-1.0: pin version
ranges, run a contract test against Comark on every upgrade, and track it as a risk.

## Order

*Revised 2026-11-19* (decision 4, and X1 and X2 in the notes). Earlier (2026-11-12) the order kept
everything inside the monorepo until a 1.0 moved out; now Marquise leaves early as 0.x, and 1.0 waits for
stability with real consumers.

1. **The content-model revision, built in refrakt** (notes, section 17): combinators, `as`, value types,
   compact forms owned by child shapes, compiling down to the existing resolver and used by refrakt's
   runes, with the matching algorithm written down and a shape's analysis ({% ref "SPEC-201" /%}). Lab work: the shape file is Marquise's core public format, so it is built and used before it
   is frozen.
2. **The read path extracted to `marquise-md/marquise` as 0.x:** parsing, shape files, the revised content
   model, validation with finding ids and addresses, records with JSON Schema and the Standard Schema
   validator, generated types, the shape node, the plain presentation, the generic renderers (ADR-049).
   **Refrakt switches to depend on it** at once: its first consumer across a real boundary, and anything it
   cannot reach through the public API is a missing seam.
3. **Tooling on Marquise alone:** `validate`, `types`, `extract`, `format`, the language server.
4. **A proof outside refrakt:** a small example project on plain Markdoc and a framework, with no refrakt
   config, theme or engine. If it is not compelling, stop here.
5. **A parser and positions spike** (notes X5) before anything writes: one inline value changed through
   each candidate parser.
6. **Rivière in its own repository, as 0.x, with plan rebuilt on it** in refrakt. Plan writes as much as it
   reads, so this also designs the write path against a real user before it is frozen.
7. **Marquise 1.0, the read path** (notes X1: records included; the write path, body blocks, kits,
   dimensions, bindings, middleware, document and deferred shapes, migrations and a second syntax after),
   once its API has been stable for refrakt and the proof project for a period. The docs site is built with
   Astro (*decided 2026-11-13*).
8. **Minor releases as features graduate,** including the write path; **Rivière 1.0** once it has a
   consumer unlike plan.

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

## Worked example: a hero in React

*Recorded 2026-11-12.* A `hero` shape adapted from refrakt's own (`plugins/marketing/runes/hero.md`),
in Next.js with React. The content-model keys are the ones refrakt's resolver supports today,
plus SPEC-200's `as` and `from`; the shape node, generated types and the React API are this
spec's proposal. Decision 3 shows the same content rendered with no component bound.

*Updated 2026-11-19:* the shape file below uses the revised content model (notes, section 17; the
matching rules are SPEC-201's) and `plain: { tag }` in place of a top-level `tag:` (notes, section 6).

**`shapes/hero.md`.** Refrakt's design attributes (`valign`, `collapse`, `height`, `aspect`,
`content-place`) and its universal-attribute defaults are gone: in Marquise the component owns
the layout, and a developer adds only the attributes authors should control. The body is empty,
as 1.0 requires.

```md
---
description: Full-width introduction at the top of a landing page
plain: { tag: section }
attributes:
  align:          { type: string, matches: [start, center, end], default: center, description: "Alignment of the text and actions" }
  media-position: { type: string, matches: [top, bottom, start, end], default: bottom, description: "Where the media sits" }
content:
  split: { by: hr }
  zones:
    - name: media
      sequence:
        media: { match: image, optional: true }
    - name: content
      primary: true
      sequence:
        eyebrow:  { match: paragraph, optional: true, as: text }
        headline: { match: heading, as: inline }
        blurb:    { match: paragraph, optional: true, as: inline }
        actions:
          match: list
          optional: true
          items:
            label: { match: link, as: text }
            href:  { from: label, extract: href, as: url }
---
```

**`content/home.md`**, what an author writes. "New in 2.0" is the eyebrow because it is a
paragraph before the heading; the sentence after the heading is the blurb.

```md
{% hero align="start" %}
![The dashboard](/img/dashboard.png)

---

New in 2.0

# Ship docs your team will actually read

From Markdown to a polished site in minutes.

- [Get started](/docs)
- [View on GitHub](https://github.com/acme/docs)
{% /hero %}
```

**Generated types** (`npx marquise types`). The type parameter keeps them framework-neutral;
`@marquise-md/react` fills it with `ReactNode`. An attribute with a default is never optional; a
`text` field is a `string`.

```ts
/** Full-width introduction at the top of a landing page */
export interface HeroShape<R> {
  /** `align` in Markdown. Default "center". */
  align: 'start' | 'center' | 'end';
  /** `media-position` in Markdown. Default "bottom". */
  mediaPosition: 'top' | 'bottom' | 'start' | 'end';
  media?: R;
  eyebrow?: string;
  headline: R;
  blurb?: R;
  actions?: { label: string; href: string; content: R }[];
}

// from @marquise-md/react
export type HeroProps = HeroShape<React.ReactNode>;
```

**The shape node** that reaches the renderer: plain data, safe from server to client.

```json
{
  "$$mdtype": "Shape",
  "name": "hero",
  "attributes": { "align": "start", "mediaPosition": "bottom" },
  "computed": {},
  "slots": {
    "media":    [{ "$$mdtype": "Tag", "name": "img", "attributes": { "src": "/img/dashboard.png", "alt": "The dashboard" }, "children": [] }],
    "eyebrow":  "New in 2.0",
    "headline": ["Ship docs your team will actually read"],
    "blurb":    ["From Markdown to a polished site in minutes."],
    "actions":  [
      { "label": "Get started",    "href": "/docs",                        "content": ["…the list item as written…"] },
      { "label": "View on GitHub", "href": "https://github.com/acme/docs", "content": ["…"] }
    ]
  }
}
```

**`components/Hero.tsx`.** The component picks the heading element, makes the first action the
primary button and routes links through Next's `<Link>`; the author still wrote a plain list.

```tsx
import Link from 'next/link';
import type { HeroProps } from '@/.marquise/shapes';

export function Hero({ align, mediaPosition, media, eyebrow, headline, blurb, actions }: HeroProps) {
  return (
    <section className="hero" data-align={align} data-media={mediaPosition}>
      <div className="hero__content">
        {eyebrow && <p className="hero__eyebrow">{eyebrow}</p>}
        <h1 className="hero__headline">{headline}</h1>
        {blurb && <p className="hero__blurb">{blurb}</p>}
        {actions && (
          <div className="hero__actions">
            {actions.map((action, i) => (
              <Link key={action.href} href={action.href} className={i === 0 ? 'button button--primary' : 'button'}>
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>
      {media && <div className="hero__media">{media}</div>}
    </section>
  );
}
```

**`app/page.tsx`.** Written out so every step shows; a Next.js plugin could hide the reading and
transforming.

```tsx
import { readFile } from 'node:fs/promises';
import { loadShapes, transform } from 'marquise';
import { Content } from '@marquise-md/react';
import { Hero } from '@/components/Hero';

const shapes = await loadShapes('shapes');

export default async function Home() {
  const source = await readFile('content/home.md', 'utf8');
  const { tree, findings } = transform(source, { shapes });
  if (findings.some((f) => f.severity === 'error')) throw new Error(findings[0].message);

  return <Content tree={tree} components={{ hero: Hero }} />;
}
```

**When the author gets it wrong** (no heading, `align="left"`), `npx marquise validate` reports
with refrakt's existing error ids, in the editor too, and as data an AI can fix from:

```
content/home.md:1  error  attribute-type-invalid  hero: align must be one of start, center, end (got "left")
content/home.md:1  error  content-missing         hero: needs a headline (a heading); found a paragraph and a list
```

**What writing it out settled:** a field's element versus its content (SPEC-200 D1), two item
fields reading one link (SPEC-200 D9), keeping the list as written (SPEC-200 D10), attribute
names (decision 8) and the plain presentation's markup (decision 3).

## Acceptance criteria

- [ ] The content-model revision is built in refrakt and used by its runes, with the matching algorithm and a shape's analysis of {% ref "SPEC-201" /%}
- [ ] Marquise 0.x exists in its own repository (`marquise-md/marquise`) with the parser, resolver, definition input, validation and records, and refrakt depends on its published versions
- [ ] Marquise 1.0 contains exactly the table under "What 1.0 contains", and a definition with a non-empty body is rejected

**When 1.0 is declared** (*decided 2026-11-19*, notes Y3): when every contract it freezes has survived its
hardest real user. Each box below is ticked during 0.x.

- [ ] Content-model syntax: every refrakt rune Marquise covers is expressed in the revised format; SPEC-201's analysis has run over all of them, every finding fixed or acknowledged; refrakt runs with strict on; the proof project's shapes were written by someone reading only the docs
- [ ] Addresses: a write-path prototype (not shipped) edits one attribute and one field by address through the chosen positions route; `toPointer()` and Standard Schema paths agree on the same records
- [ ] Records and rich text: plan's records are exported and consumed by something that is not Marquise (Rivière's prototype, a DuckDB query or the Astro loader); record size is measured on refrakt's content; an opt-in tree member (notes Y11) is decided
- [ ] Plain markup: snapshot tests, and an automated accessibility check over refrakt's site rendered with the plain presentation only
- [ ] Shape node and renderer contract: the proof project renders through at least two renderers, React as server components and one other
- [ ] Finding catalogue: snapshot-tested, every id documented with an example that triggers it
- [ ] Published schema: at least one outside consumer uses it (Astro's `createSchema`, or a Standard Schema consumer)
- [ ] Trust boundary: the hostile-content suite passes through every 1.0 renderer, in both modes
- [ ] Document shapes: plan's entities are document shapes, with no wrapper tags, in Rivière's prototype; the Astro loader maps a collection to a document shape
- [ ] Generated types: used by refrakt and the proof project, with type-level tests
- [ ] CLI and JSON output: snapshot-tested, exit codes included
- [ ] Enforcement in place: the public API report checked on every change, and snapshot tests of the catalogue, schemas and markup
- [ ] Stability: two consecutive 0.x minor releases, at least eight weeks apart in total, with no breaking change while refrakt and the proof project depend on Marquise
- [ ] During 0.x, every breaking change is listed in the changelog with migration notes, and comes with a codemod when it changes content

Rivière's 1.0 follows the same pattern: plan's rebuild complete, one consumer unlike plan, the Astro loader
working, and its own stability period.
- [ ] Every later feature arrives as a minor release, after its spec is implemented in refrakt
- [ ] `@refrakt-md/runes` builds on Marquise through the hooks listed under "The boundary", with no special case for refrakt inside Marquise
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
