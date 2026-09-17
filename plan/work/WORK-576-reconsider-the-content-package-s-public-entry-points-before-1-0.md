{% work id="WORK-576" status="draft" priority="low" complexity="moderate" milestone="v1.0.0" source="SPEC-135" tags="content, api, dx, 1.0" %}

# Reconsider the content package's public entry points before 1.0

`loadContent` takes **fourteen positional parameters** (`packages/content/src/site.ts:697`)
and is exported from `@refrakt-md/content`. {% ref "WORK-575" /%} adds an
options-bag overload beside it rather than a fifteenth positional, which is the
right move for that change and deliberately not a redesign.

This item is the redesign question, deferred to where it belongs: a public
function's shape is much cheaper to change before 1.0 than after.

## What exists today

```ts
export async function loadContent(
	dirPath, basePath, icons, additionalTags, packages, sandboxExamplesDir,
	variables, securityPolicy, projectRoot, xrefPatterns, fileRoots,
	siteConfig, repoUrl, repoBranch,
): Promise<Site>

export async function loadContentFromTree(
	tree: ContentTree,
	options: LoadContentFromTreeOptions = {},
): Promise<Site>
```

Both are public (`packages/content/src/index.ts:19-20`). Two entry points, two
parameter conventions, and the options bag already carries a field admitting the
problem — `reader` is documented as accepted "so hosts can wire it once and not
need to thread it again when new internal consumers land".

`Site` itself is a **pure data interface**: `tree`, `pages`, `navigation`,
`pipelineWarnings`, `pipelineStats`, `aggregated`, `partials`. No behaviour.

## The shape worth considering

The codebase already uses a static factory one level down —
`ContentTree.fromDirectory(dirPath)`. Mirroring it would give one convention
instead of two:

```ts
Site.fromDirectory(path, options)
Site.fromTree(tree, options)
```

It also fixes a small lie: `loadContent` returns a `Site`, and the name does not
say so.

**Do not make `Site` a class instance to get this.** Keep `export interface Site`
as the data shape and add `export const Site = { fromDirectory, fromTree }`
beside it — TypeScript merges a type and a value under one name. Factories and
naming, with nothing new crossing a serialization boundary.

That caveat is not hypothetical. This pipeline already has a scar from class
instances crossing SSR: stage 3 exists specifically to turn Markdoc `Tag`
instances into plain `{$$mdtype:'Tag'}` objects because the SvelteKit
server→client boundary requires it. Anything returned from content loading
should be assumed to be heading somewhere that cannot carry a prototype until
proven otherwise.

## Questions to settle

- Does any part of `Site` actually cross the server→client boundary, or is it
  server-side throughout with only `pages[].renderable` crossing? The answer
  decides how much freedom there is.
- Do the free functions that already take a `Site` — `generateSitemap(site)`,
  `analyzeRuneUsage(site.pages)` — belong as methods, or is the loss of
  tree-shaking a real cost for a build-time package?
- Is the positional `loadContent` retired at 1.0, or kept indefinitely as a
  deprecated alias? Retiring is a breaking change; 1.0 is the moment it is free.
- Is `ContentTree` the model to follow, or does it have the same problem one
  level down?

## Acceptance Criteria

- [ ] A decision recorded on whether `@refrakt-md/content` exposes one entry-point convention or two at 1.0
- [ ] If the factory shape is adopted, `Site` remains a plain serializable object — no class instance returned from content loading
- [ ] Whichever shape is chosen, every adapter uses the same one; no adapter left on a legacy signature
- [ ] The positional `loadContent` is either retired with a migration note in the 1.0 changeset, or documented as permanently supported

## Notes

Filed from {% ref "SPEC-135" /%} D5, which needed a reporter threaded into
content loading and found there was no clean place to put it. That item takes
the cheap fix; this one asks whether the cheap fix should still be the shape a
1.0 ships with.

## References

- {% ref "SPEC-135" /%} — D5, the reporter seam that surfaced this
- {% ref "WORK-575" /%} — adds the options-bag overload this item would supersede or confirm
- `packages/content/src/site.ts` — `loadContent`, `loadContentFromTree`, `Site`
- `packages/content/src/index.ts` — the public surface

{% /work %}
