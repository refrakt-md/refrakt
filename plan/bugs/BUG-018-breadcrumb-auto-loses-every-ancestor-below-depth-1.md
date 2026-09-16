{% bug id="BUG-018" status="confirmed" severity="major" tags="runes,pipeline,breadcrumb,navigation" %}

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

{% /bug %}
