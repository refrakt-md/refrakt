{% spec id="SPEC-055" status="draft" tags="nav, routing, slug-resolution, active-state" source="SPEC-046" %}

# Nav slug resolution and active state

Disambiguate nav item slugs that match multiple pages, and fix the related symptom where multiple nav items render as active simultaneously. Introduces multi-segment slugs as the first-class disambiguator, nav-location-relative resolution as the default, hard build errors on unresolvable bare slugs, and a longest-prefix-match active-state rule with `aria-current="page"` plus `data-active="ancestor"` semantics.

## Problem

The current `nav` rune accepts plain-text slugs for items (e.g. `- getting-started`). The resolver matches each slug against the entity registry and finds the corresponding page. This works fine when slugs are unique site-wide, but breaks in two ways once they aren't.

**Slug collisions are common in practice.** The refrakt docs site already has at least three pages whose final URL segment is `configuration` — under `/docs/themes/`, `/docs/plugins/`, and elsewhere. Authoring a nav that lists all three forces explicit links because writing `- configuration` three times resolves them all to the same (arbitrary) page. There's no way to disambiguate without abandoning the slug shorthand entirely.

**Multiple items render as active at once.** Whatever URL-comparison logic decides "active" is doing something like substring or prefix matching without a single-winner rule, so when the user lands on `/docs/themes/configuration`, every nav item resolving to a `configuration`-suffixed URL — or every item whose href is a prefix of the current URL — lights up. The visual result is confusing: the reader can't tell where they are.

**Both symptoms have the same root cause** — the resolution model is "find any page matching this string" rather than "find *the* page this slug names within a defined scope." Once resolution is scoped, ambiguity becomes detectable at build time, and active-state can apply a single-winner rule cleanly.

-----

## Design Principles

**Bare slugs must be unambiguous within their scope, or the build fails.** The author's mental model when writing `- configuration` is "the configuration page I'm linking to in this nav." If that's ambiguous, no automatic disambiguation is correct — the author has to tell the system which one. A hard build error with a clear "did you mean `themes/configuration` or `plugins/configuration`?" message is the right escalation. Silent picks or warnings cause issues to ship to production.

**Multi-segment slugs mirror URL structure, not invented identifiers.** When `- configuration` is ambiguous, the disambiguator should look like `themes/configuration` — a relative URL path the author can read directly off the file tree. Inventing a parallel identifier system (`nav-key`) is rejected for v1: it adds a second name to maintain alongside file paths and forces authors to keep both in sync.

**Active state has exactly one winner.** The page-currently-being-viewed maps to at most one nav item via exact match; the visual "you're in this section" highlight maps to at most one item via longest-prefix match. Both are independently single-valued. Themes can render them differently or the same.

**Resolution is scope-bound, not global.** A nav at `site/content/docs/themes/_layout.md` resolves slugs relative to `/docs/themes/`, not by scanning the entire site. This makes resolution predictable, makes errors local, and matches how authors think about section navs.

**Explicit links always work.** `[Label](/full/path)` bypasses all resolution. Authors hitting a corner case the resolver can't handle can always fall back to a full link without losing nav semantics.

-----

## Authoring Surface

### Resolution rules

Given a nav at a known source file (and therefore a known base directory derived from its position in the content tree), each item is resolved by inspecting its source shape:

| Item shape                          | Resolution                                                                  | Example                                                       |
|-------------------------------------|-----------------------------------------------------------------------------|---------------------------------------------------------------|
| Explicit link `[Label](/path)`      | Use the link's `href` as-is. No resolution.                                 | `[Configuration](/docs/themes/configuration)`                 |
| Absolute path `/docs/themes/foo`    | Treat as absolute URL. No resolution.                                       | `/docs/themes/configuration`                                  |
| Multi-segment `themes/foo`          | Join with nav's base directory; verify page exists at that URL.             | At `/docs/_layout.md`, `themes/configuration` → `/docs/themes/configuration` |
| Bare slug `foo`                     | Search pages whose final URL segment is `foo` *within the nav's base*; require exactly one match. | At `/docs/themes/_layout.md`, `configuration` → `/docs/themes/configuration` |

The nav's base directory is the directory containing the nav's source file. For top-level layout files (`site/content/_layout.md`), the base is `/`. Subsection layouts inherit the obvious base (`site/content/docs/themes/_layout.md` → `/docs/themes/`).

### Examples

**Section-scoped sidebar** — bare slugs work because base resolves them:

```markdoc
{# site/content/docs/themes/_layout.md #}
{% nav %}
## Themes
- configuration       {# → /docs/themes/configuration #}
- components          {# → /docs/themes/components #}
- css                 {# → /docs/themes/css #}
{% /nav %}
```

**Cross-section header nav** — multi-segment disambiguates same-named pages:

```markdoc
{# site/content/_layout.md, header region #}
{% nav layout="menubar" %}
## Docs
- docs/getting-started
- docs/themes/configuration
- docs/plugins/configuration
- docs/plan/configuration
{% /nav %}
```

Bare `configuration` in this nav would fail the build — base is `/`, no `/configuration` page exists, and multiple `*/configuration` pages would match if a fallback search were attempted (the resolver doesn't fall back; failing to resolve at base is an error).

**Mixed bare + segmented + explicit**:

```markdoc
{# site/content/docs/_layout.md #}
{% nav %}
## Themes
- themes/configuration
- themes/components

## Plugins
- plugins/configuration
- plugins/authoring

## External
- [Refrakt CLI on npm](https://www.npmjs.com/package/refrakt)
{% /nav %}
```

### Build error shape

When a bare slug fails to resolve uniquely:

```
Error: Nav item `configuration` in site/content/docs/_layout.md cannot be resolved.

The nav's base is `/docs/`, but no page exists at `/docs/configuration`.
Did you mean one of:
  - themes/configuration       (/docs/themes/configuration)
  - plugins/configuration      (/docs/plugins/configuration)
  - plan/configuration         (/docs/plan/configuration)

Use a multi-segment slug or an explicit [link](/path) to disambiguate.
```

When a bare slug resolves to nothing:

```
Error: Nav item `getting-startd` in site/content/docs/_layout.md cannot be resolved.

No page found at `/docs/getting-startd`.
Closest matches:
  - getting-started            (/docs/getting-started)
```

-----

## Active State

Each rendered page evaluates its nav items against the current URL using two independent rules:

### Rule 1 — Exact match (`aria-current="page"`)

The item whose resolved `href` equals the current page's URL (after normalization of trailing slashes and index pages) gets `aria-current="page"`. This is the standard ARIA semantic for "you are here."

At most one item satisfies this rule per nav. If zero items match (e.g. current page isn't in the nav), no item gets `aria-current`.

### Rule 2 — Longest-prefix match (`data-active="ancestor"`)

Among items whose resolved `href` is a strict prefix of the current URL (and which did *not* get `aria-current`), the item with the longest matching prefix gets `data-active="ancestor"`. Provides the breadcrumb-like "you're inside this section" affordance.

At most one item satisfies this rule per nav. Ties (which shouldn't occur given the longest-prefix definition) resolve to source order.

### Combined behavior

| Current URL                          | Item href                          | Resulting state                            |
|--------------------------------------|------------------------------------|--------------------------------------------|
| `/docs/themes/configuration`         | `/docs/themes/configuration`       | `aria-current="page"`                      |
| `/docs/themes/configuration/css`     | `/docs/themes/configuration`       | `data-active="ancestor"`                   |
| `/docs/themes/configuration`         | `/docs/themes`                     | `data-active="ancestor"`                   |
| `/docs/themes/configuration`         | `/blog`                            | neither                                    |
| `/docs/themes/configuration`         | `/docs/themes/components`          | neither                                    |

### Theme contract

Themes style `[aria-current="page"]` and `[data-active="ancestor"]` independently. Reference treatment in Lumina: `aria-current="page"` gets the strongest emphasis (bold + accent color + indicator bar); `data-active="ancestor"` gets a subtler treatment (accent color only, no bar). Themes can collapse both into one style if they prefer.

-----

## Engine Changes

### `NavItem` resolution at postProcess

The cross-page pipeline's postProcess phase (`packages/content/src/pipeline.ts`) is where resolution happens. Today, slug resolution is partially deferred to the runtime `rf-nav` web component, which causes the SSR HTML to lack resolved `href`s and limits build-time validation.

This spec moves all slug resolution into postProcess:

1. Each `NavItem` reads its `data-slug` (set during the rune's identity transform).
2. The postProcess hook receives the nav's source file path; derives the base directory.
3. Applies the resolution table above. On failure, throws a build error pointing at the source file and item.
4. On success, writes the resolved URL into the rendered `<a href>` directly. The slug attribute remains for debugging but is no longer functionally required.

Active-state evaluation moves to build time per page (the page being rendered knows its own URL during postProcess of layout-cascade navs). Each `NavItem` gets `aria-current` or `data-active="ancestor"` attributes baked into the SSR HTML.

### `rf-nav` web component changes

With resolution moved to build time, the web component no longer resolves slugs. Its remaining responsibilities are interactive behavior only (collapsible toggling, menubar dropdown open/close, mega panel open/close — all already in scope from SPEC-046 / SPEC-054).

This is a simplification, not a new responsibility.

### Closest-match suggestions

The error message format above includes closest-match suggestions. Implementation can use a simple Levenshtein threshold (≤2 edits) plus the disambiguation candidates that share the bare slug. Cap suggestions at 3.

-----

## Acceptance Criteria

- [ ] `NavItem` slugs are resolved at postProcess time, not at runtime
- [ ] Bare slugs (`foo`) resolve against the nav's base directory derived from the nav's source file location
- [ ] Multi-segment slugs (`foo/bar`) resolve relative to the nav's base directory
- [ ] Slugs starting with `/` are treated as absolute paths with no resolution
- [ ] Explicit markdown links (`[Label](/path)`) bypass resolution entirely
- [ ] An unresolvable bare slug fails the build with an error that names the source file, the slug, the attempted URL, and up to 3 closest-match suggestions
- [ ] An unresolvable multi-segment slug fails the build with an error naming the source file, the slug, and the attempted URL
- [ ] Build error suggestions include same-bare-slug candidates from other directories (the "did you mean themes/configuration vs plugins/configuration" case)
- [ ] Each rendered page's nav has at most one item with `aria-current="page"` (exact URL match)
- [ ] Each rendered page's nav has at most one item with `data-active="ancestor"` (longest strict-prefix match, excluding the `aria-current` item)
- [ ] Active-state attributes are written into SSR HTML at build time, not applied client-side
- [ ] `rf-nav` web component no longer performs slug resolution — only interactive behavior
- [ ] Lumina ships reference CSS for `[aria-current="page"]` and `[data-active="ancestor"]` on `.rf-nav-item__link` with visually distinct treatments
- [ ] All existing `{% nav %}` usages in `site/content/` continue to resolve correctly (i.e. no nav currently relies on cross-base global slug matching)
- [ ] At least one site nav is updated to demonstrate multi-segment slugs disambiguating same-named pages
- [ ] `npx refrakt inspect nav` shows resolved hrefs and active-state attributes for a representative input including a current-URL parameter
- [ ] Authoring docs (`site/content/docs/authoring/`) and the `nav` rune reference page document the resolution rules and the build error format

-----

## Out of Scope

- **`base="/path"` attribute on `{% nav %}`** — nav-location-relative resolution plus multi-segment slugs cover every realistic case. Adding an explicit `base=` attribute is YAGNI until a use case appears (e.g. a virtual nav assembled outside the content tree).
- **`nav-key` frontmatter** — rejected as a second identifier system that competes with file paths. Multi-segment slugs are the disambiguator. If a compelling use case appears later (e.g. very long URL paths, frequently-renamed pages), this can be revisited in a separate spec.
- **Fuzzy / fallback resolution** — the resolver does not search outside the nav's base. Building elsewhere requires explicit multi-segment slugs or explicit links. No silent picks.
- **Migration tool for existing ambiguous slugs** — the build error message is the migration tool. Authors hit the error, read the suggestions, edit the file. Faster to ship and less ceremony than a custom CLI command.
- **Custom active-state matching rules** (e.g. regex, glob) — exact match plus longest-prefix covers every realistic case. Custom rules are over-engineering for a navigation primitive.
- **Multiple `aria-current` values** (`page`, `step`, `location`) — only `page` is in scope for nav. Other values are for breadcrumbs / steppers / forms.
- **Build-time URL normalization edge cases** beyond trailing slash and index page handling (e.g. case sensitivity, encoded characters). Standard URL comparison rules apply; out-of-scope edge cases are deferred until they break a real page.

-----

## Open Questions

**How does the resolver know each nav's source file path?** The pipeline already tracks `TransformedPage` source paths for each page; for navs that come from layout cascades, the source is the `_layout.md` file that defined the nav. Need to confirm this is reachable at postProcess time and threaded into the resolution call. If not, the pipeline hook signature widens.

**What's the right "base directory" rule for navs in non-layout content?** Most navs live in `_layout.md` files where the base is unambiguous. But a `{% nav %}` inside a regular content page could either inherit the page's directory as its base, or fall back to `/`. Recommend: the directory containing the source file, regardless of file type. Consistent and predictable.

**Trailing-slash normalization for exact-match comparison.** `/docs/themes/configuration` vs `/docs/themes/configuration/` — same page, different strings. The resolver should treat them as equal. Recommend lowercase + strip trailing slash before comparison. Index pages (`/docs/`) compare equal to `/docs`.

**Index pages within the base.** A nav at `/docs/themes/_layout.md` writing `- index` or `-` (bare) to mean "the section's own landing page" — should that work? Recommend: writing nothing special. If `docs/themes/index.md` exists, an item named `themes` from a parent nav resolves to it. Listing the section's own index from inside its own layout is an unusual pattern; explicit `[Overview](/docs/themes)` covers it.

**Case sensitivity.** URLs are conventionally lowercase; slugs in source are conventionally lowercase. Recommend: case-insensitive matching at the resolver, but emit lowercase URLs in the rendered href. If an author writes `- Configuration`, the resolver finds `/docs/themes/configuration` and emits that.

**What error format does the CLI surface use vs the SvelteKit dev overlay?** Both should show the same content. Recommend: the resolver throws a structured error object that the CLI prints as text and the Vite plugin transforms into a SvelteKit-style overlay. One source of truth, two surfaces.

**Should the active-state rule also apply when no item is `aria-current`?** Example: nav lists `/docs/themes`, `/docs/plugins`; current URL is `/blog/foo`. No exact match. Should `/docs/themes` get `data-active="ancestor"` because it's a prefix of... no, it isn't. So nothing matches. Both rules naturally produce zero. Confirming: an empty nav is fine.

{% /spec %}
