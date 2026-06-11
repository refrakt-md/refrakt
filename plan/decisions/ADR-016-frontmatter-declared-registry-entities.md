{% decision id="ADR-016" status="accepted" date="2026-06-11" source="SPEC-070" tags="registry,pipeline,frontmatter,content,architecture" %}

# Frontmatter-declared registry entities

## Context

The pipeline already registers content in the entity registry — core registers
every page as a `page` entity and every heading as a `heading`
(`packages/runes/src/config.ts`), and the plan plugin registers its domain
entities. `collection` and `aggregate` (SPEC-070) query the registry through the
shared field-match grammar (`packages/runes/src/field-match.ts`), which already
handles arrays, globs, and regex.

But you can't yet aggregate over your *own content* by arbitrary metadata. Two
gaps:

1. **Only a fixed frontmatter subset is indexed.** The `page` entity's `data`
   carries `title`, `url`, `parentUrl`, `draft`, `description`, `date`, `order`,
   `icon` — nothing else. So `filter="tags:x"` or `group="category"` over pages
   match nothing, even though the grammar would handle them.
2. **A content page can't declare itself a typed entity.** Everything authored as
   a page is a `page`; there's no way to say "this page *is* a rune / a product /
   a recipe" so `collection type="rune"` can find it.

The motivating want: a complete, queryable **rune catalogue generated from the
docs** (and "N runes across M plugins" stats), plus tag-driven page collections —
all dogfooding the registry on refrakt's own site.

The obvious shortcut — a build-time hook that registers each rune from the
compiled code catalogue — was considered and **rejected** (see Options).

## Options Considered

1. **Code-catalogue registration hook.** A core/plugin hook iterates the compiled
   rune catalogue (`defineRune` entries + each plugin's `Plugin.runes`) and
   registers each as a `rune` entity. *Rejected.* It is **closed-world and
   bespoke**: it only knows the runes *this* build compiled in, the logic is
   special-cased to refrakt's package layout, it doesn't generalise to any other
   project, and a **third-party plugin author cannot join the catalogue** without
   extending refrakt's hook. That contradicts the open-world dependency-asymmetry
   principle the composability contract (SPEC-084) is built on.

2. **Frontmatter-declared entities (chosen).** A content page carries registry
   metadata in its frontmatter; the pipeline indexes it and (optionally) registers
   the page as a typed entity. The catalogue becomes "every page that declares
   itself," not "every rune the framework's code knows about."

## Decision

Adopt **frontmatter-declared registry entities**, in two composable layers plus a
config convenience:

1. **Index page frontmatter into the `page` entity.** Beyond the current fixed
   subset, merge the page's frontmatter into the `page` entity's `data` (excluding
   a reserved set of layout-control keys — `layout`, `tint-mode`, `tint-lock`,
   region/frontmatter plumbing — so they don't pollute queries). Any remaining
   field (`tags`, `category`, …) becomes filterable/groupable through the existing
   grammar with **no resolver changes**. This alone enables tag-driven collections.

2. **A page may declare a registry `type` (and optional `id`) in frontmatter.**
   Such a page registers as a first-class entity of that type — *in addition to*
   its `page` registration — with its (reserved-filtered) frontmatter as `data`,
   `id` defaulting to the page URL. Then `collection type="rune"` /
   `aggregate type="rune" group="plugin"` read semantically. This is the general
   feature: `type: product`, `type: recipe`, `type: member` — whatever a project
   models. It is the **complement of `entityRoutes`** ({% ref "SPEC-069" /%}),
   which maps entity *types → page URLs*; this maps *pages → entities*.

3. **A config url-pattern → type rule** (mirroring `routeRules` / `entityRoutes`)
   so the type discriminator can be set by **convention, not per-page boilerplate**:
   e.g. pages under `/runes/**` are `rune` entities. Per-page frontmatter then
   carries only the metadata (`category`, `plugin`, `status`), not `type:` repeated
   a hundred times.

4. **Open-world is the deciding property.** Because the catalogue is assembled from
   pages that self-declare, a third-party plugin's documented runes join
   automatically — no hook to extend, no PR to refrakt. The knowledge sits with the
   page (the party that has it), pointing outward, exactly as the composability
   contract prescribes.

5. **Drift guardrail.** Frontmatter can drift from code (add a rune, forget the
   page → missing from the catalogue). That is arguably the *right* semantics (the
   catalogue = documented entities), and it is checkable: a `refrakt inspect` /
   test assertion that every `defineRune` / plugin rune has a corresponding
   documented page turns drift into a build signal. Auto-correctness *and*
   open-world. (Refrakt-specific use of a general capability.)

## Rationale

- **Open-world beats closed-world**, and it is the house style — the same reason
  the composability contract has no central nesting registry. A catalogue that
  third parties can join without our involvement is strictly better than one our
  build must enumerate.
- **Reuse over invention.** The query grammar already does the filtering/grouping
  (including arrays); the only gaps are *indexing* and a *declaration* affordance.
- **General, not a private path.** The same mechanism serves any project's content
  types — the rune catalogue is merely the dogfood showcase.
- **Composes with existing config.** It is the inverse of `entityRoutes` and sits
  naturally alongside `routeRules` as a url-pattern rule.

## Consequences

- A companion spec, **SPEC-092**, details the frontmatter contract (the `type`/`id`
  keys, the reserved-key exclusion list, metadata passthrough), the `page`-entity
  enrichment, the config url-pattern→type rule, `id` derivation, precedence with
  the always-present `page` registration, and the drift check — with the rune
  catalogue as its worked showcase.
- **Target: next minor (post-v0.20.1).** Explicitly *not* in v0.20.1, which stays
  a docs/showcase patch — this is a pipeline feature and would be scope creep there.
- `rune-catalog.md` and the index "N runes" stat can become **generated** via
  `collection`/`aggregate` once rune pages declare their metadata.
- Builds on SPEC-070 (the query grammar) and complements {% ref "SPEC-069" /%}
  (entityRoutes); touches the core register phase and the config schema.
- The reserved-key exclusion is the main subtlety — getting it wrong pollutes every
  page query with layout plumbing, so the spec must pin the list.

{% /decision %}
