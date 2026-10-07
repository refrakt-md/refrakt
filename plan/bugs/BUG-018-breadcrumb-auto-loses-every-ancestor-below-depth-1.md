{% bug id="BUG-018" status="fixed" severity="major" tags="runes,pipeline,breadcrumb,navigation" milestone="v0.39.0" pr="refrakt-md/refrakt#663" %}

# `breadcrumb auto` loses every ancestor below depth 1

`deriveParentUrl` returns a parent URL with a **trailing slash**; the router
registers page URLs **without** one. So `parentOf` maps `/docs/guide` to
`/docs/`, no page is registered under that key, and the ancestor walk stops
dead. `{% breadcrumb auto=true %}` renders the current page and nothing else.

Found while landing {% ref "WORK-563" /%}, which moved the SEO harvest past the
pipeline and so put a page-level assertion on this hook's output for the first
time.

## Actual

Measured through a real `loadContentFromTree` build, three pages at increasing
depth, each carrying `{% breadcrumb auto=true /%}`:

| Page | Trail rendered | Expected |
|------|----------------|----------|
| `/about` | `Home > About` | `Home > About` |
| `/docs/guide` | `Guide` | `Home > Docs > Guide` |
| `/docs/api/ref` | `Ref` | `Home > Docs > API > Ref` |

Depth 1 works by accident: `deriveParentUrl('/about')` hits its
`parent <= 0` branch and returns `'/'`, which *does* match the registered root.
Every deeper page takes the other branch:

```ts
// config.ts — deriveParentUrl
return parent <= 0 ? '/' : trimmed.slice(0, parent + 1);
//                         '/docs/api/reference' → '/docs/api/'  ← trailing slash
```

```ts
// config.ts — buildAutoBreadcrumb
const ancestorPage = pagesByUrl.get(ancestorUrl);
if (!ancestorPage) continue;   // ← every ancestor skipped, silently
```

The `continue` is why nothing ever surfaced: a missing ancestor is skipped
without a warning, so the trail simply comes out short.

## Why the tests did not catch it

The existing pipeline fixtures feed URLs in a shape the router does not
produce — `url: '/docs/other/'`, `parentUrl: '/docs/'`, with trailing slashes
(`packages/runes/test/blog-pipeline.test.ts`, `data-resolve.test.ts`,
`drawer.test.ts`). Under that shape the lookup matches and the walk works. The
router's own tests pin the real shape (`filePathToUrl('docs/api/reference')` →
`'/docs/api/reference'`), but nothing joined the two.

## Suspected wider blast radius — not yet measured

`parentUrl` has other consumers, and they take the same key:

```ts
// buildPageTree
const parent = byUrl.get(p.parentUrl) ?? root;
```

If that lookup misses for the same reason, every page below depth 1 becomes a
direct child of root and `pageTree` is flat. `collection`, `drawer` and
auto-pagination all read from that tree. **This is a suspicion, not a
measurement** — it is the first thing to check, and it is why this is filed as
`major` rather than `minor` despite the visible symptom being small.

## Expected

An auto breadcrumb renders the full ancestor chain at any depth, and a
registered page that cannot be resolved as an ancestor is a diagnostic rather
than a silent `continue`.

## Steps to reproduce

```ts
const files = new Map([
  ['content/index.md', '---\ntitle: Home\n---\n\n# Home\n'],
  ['content/docs/index.md', '---\ntitle: Docs\n---\n\n# Docs\n'],
  ['content/docs/guide.md', '---\ntitle: Guide\n---\n\n{% breadcrumb auto=true /%}\n\n# Guide\n'],
]);
const tree = ContentTree.fromContentMap(files, { contentDir: 'content' });
const site = await loadContentFromTree(tree, { projectFiles: memoryProjectFiles(files), projectRoot: '/virtual', basePath: '/' });
// /docs/guide publishes one ListItem — "Guide" — with no Home and no Docs.
```

## Notes

Not fixed in {% ref "WORK-563" /%} deliberately. That item moves *where* the
harvest happens and makes the published trail match the rendered one, which it
now does — a one-item trail is published as a one-item trail. Correcting the
trail itself changes rendered HTML on every site using `breadcrumb auto`, and
the `parentUrl` question above should be answered before anything is changed,
since a fix in `deriveParentUrl` would move `pageTree` with it.

## References

- {% ref "WORK-563" /%} — where this surfaced; the page-level assertion that found it
- `packages/runes/src/config.ts` — `deriveParentUrl`, `buildBreadcrumbPaths`, `buildAutoBreadcrumb`, `buildPageTree`

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-bug-018-breadcrumb`
PR: refrakt-md/refrakt#663

### Blast radius (answered first, through a real `loadContentFromTree` build)
Site: `/`, `/about`, `/docs`, `/docs/guide`, `/docs/api`, `/docs/api/ref`. On the old code:
- `pageTree` was **completely flat**: all five pages were direct children of `/`. The suspicion was right.
- `nav auto` on `/docs` found no children and warned "has no registered child pages".
- auto `pagination` on the nested section index `/docs/api` rendered a `next` link instead of being suppressed.
- `getSiblingPages` `scope="section"` stopped its walk at the first miss.
- Breadcrumb trails: `/docs/guide` → `Guide`, `/docs/api/ref` → `Ref`.
- With `basePath: '/en'` (router root `/en/`), the trail broke at depth 2 as well.

Correction to the bug text: no in-repo code reads `pageTree`. `collection` and `drawer` don't, and auto-pagination and `nav auto` read `pagesByUrl` and compare `parentUrl` directly. They broke for the same reason, but not through the tree.

### What was done
- `packages/runes/src/config.ts`:
  - `deriveParentUrl` returns the router's shape (`/docs`).
  - New `resolveParentUrl` gives the key the parent page is actually registered under, trying both spellings (base-path root `/en/`, a slug override with a slash). `register` uses it.
  - `buildBreadcrumbPaths` lists only registered pages and steps over index-less directories by path, with a cycle guard.
  - `buildAutoBreadcrumb` raises a `ctx.warn` instead of a silent `continue` when a path ancestor has no page entry. It stays imperative.
- New `packages/content/test/breadcrumb-auto-depth.test.ts`, a real build with router-shaped URLs. Covers depths 1, 2 and 3, rendered (names and hrefs) and JSON-LD, no diagnostics on a well-formed tree, an index-less directory, base path, `pageTree` nesting, `nav auto`, and pagination suppression.
- `packages/content/test/seo-harvest.test.ts`: the WORK-563 truncated-trail pin now asserts `[Home, Guide, Intro]`.
- `packages/runes/test/pipeline-hooks.test.ts`: the register, breadcrumb-path and page-tree fixtures moved to router-shaped URLs (they used `/docs/`, `/docs/guide/`). Added tests for parent spelling (base path, slug with slash, orphan), an index-less directory in paths, depth-2 nesting, and the unresolvable-ancestor warning.
- `site/content/extend/plugin-authoring/pipeline.md`: defines `parentUrl`'s spelling.
- Changeset `breadcrumb-auto-full-ancestor-chain.md` (runes patch).

### Why the fix is at the source, not at the lookup sites
All five consumers compare `parentUrl` with a page `url`: `buildPageTree`, the `parentOf` walk, the `nav auto` and pagination equality checks, and the section walk. `data-resolve` already strips slashes on both sides. Fixing the derivation fixes them all, and the next consumer can't repeat the bug. The invariant: `parentUrl` is the `url` of a registered page, or a path with no page.

Cost: the queryable page-entity `parentUrl` changes from `/docs/` to `/docs`. A `parentUrl:/docs/` filter would need updating; nothing in this repo uses one. The changeset says so.

### Tests
15 tests fail on the old code: 8 of 9 in the new file (depth 1 passes, as expected), the updated seo-harvest pin, and 6 in pipeline-hooks. All 29 pass on the fix. The full suite gave 5122 passed and 2 failed (plan dogfood and plan pipeline). Both pass when rerun alone; they are contention timeouts unrelated to this change.

### Baseline / contracts
`seo:baseline:check` and both contract checks are up to date, with **no diff**. No baseline fixture was added: `generate-seo-baseline.mjs` `harvest()` runs `Markdoc.transform` per fixture with no site and no cross-page pipeline, so a `breadcrumb auto` fixture would record only the unresolved sentinel, identical before and after. The real-build regression test covers this instead.

What moves in output: rendered breadcrumb HTML and `BreadcrumbList` JSON-LD for `breadcrumb auto` pages below depth 1. Beyond that, `pageTree` nesting, `nav auto` children on nested section indexes, and auto-pagination on nested section indexes (now suppressed, as designed).

### Notes / follow-ups (not filed, to avoid ID collisions)
- `pageTree` still attaches a page under an index-less directory to the root rather than to its nearest registered ancestor. That is unchanged and out of scope here.
- The baseline harness cannot capture pipeline-resolved runes (`breadcrumb auto`, `nav auto`, `pagination auto`). Giving it a site-level mode would make this class of change reviewable as a baseline diff.

{% /bug %}
