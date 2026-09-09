{% work id="WORK-540" status="done" priority="high" complexity="moderate" source="" tags="docs,content,information-architecture" milestone="v0.32.0" pr="refrakt-md/refrakt#593" %}

# Move author-facing pages out of the Extend handbook into Docs

The `/docs` vs `/extend` split is sound in principle — `extend/index.md` states it outright ("If you're here to author content... head to the Docs handbook"). But seven pages sat on the wrong side of the line, and the entity-registry concept had no author-facing home at all.

## Context

Found while auditing the content-author documentation surface. The split had been drawn by *subsystem* (this is part of the rune system, so it goes in rune-authoring) rather than by *audience* (who performs this task). Pages describing what an author types in a Markdown file ended up in a handbook whose own introduction tells authors to leave.

The sharpest cases:

- **`extend/variables.md`** — its own description reads "The author-facing variable surface", and it was not in the Extend sidebar at all. Only reachable from a card on `extend/index.md`.
- **`extend/rune-authoring/page-sections.md`** — ~19 rune reference pages link to it. It documents the eyebrow/headline/blurb syntax an author writes.
- **The entity registry** — `collection`, `aggregate`, `relationships`, and `expand` all sent readers to `extend/plugin-authoring/pipeline.md` to learn what an entity *is*. That page opens by describing itself as a build-time plugin mechanism. Authors needed the concept; they were being handed the implementation.

## Acceptance Criteria
- [x] Author-facing pages live under `/docs`, with redirect stubs at their old URLs
- [x] An author-facing Entities page exists, and the four registry runes link to it instead of the pipeline page
- [x] `entityRoutes` is documented as site configuration rather than inside the pipeline hook reference
- [x] The tint cascade is split — frontmatter semantics for authors, resolution and SSR contract for theme developers
- [x] Both handbooks cross-link at their boundaries instead of duplicating content
- [x] Every internal link resolves, verified against the built site
- [x] No redirect loops (the old `docs/authoring/*` stubs pointed at the pages being moved back)

## Approach

One rule: **a page has exactly one home, chosen by who performs the task, not by which subsystem implements it.** Where both audiences genuinely need the material at different depths, split the page rather than pick a side — that applies to `tint-cascade` (frontmatter vs. resolution function) and `pipeline` (what an entity is vs. how to register one).

Reuse the redirect-stub pattern the repo already established when `docs/authoring/*` and `docs/themes/*` moved to `/extend`. Note that those stubs point *at* pages being moved back, so they have to be replaced with real content rather than left in place, or the redirect chain loops.

No link-checking tooling exists in the repo, so verify with a script that resolves every internal link against the pages that actually exist, and check anchors against the heading IDs in the built HTML rather than a reimplementation of the slug algorithm.

## References

- Follow-up: the `docs/configuration/*` pages are still hand-written field tables that can drift from the schema. Generating them is the remaining stage of this work and needs a SPEC.

## Resolution

Completed: 2026-09-08

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**Moved to `/docs/authoring/`** (redirect stubs left at the old `/extend/` URLs): `variables`, `partials`, `page-sections`, `nav-slug-resolution`, `rich-menubar-panels`. The old `docs/authoring/*` stubs for those four pointed *at* the pages being moved back, so they were replaced with the real content rather than left in place — leaving them would have produced a redirect loop.

**Moved to `/docs/configuration/`**: the i18n overview, now `configuration/i18n.md`, next to the `locale` and `strings` fields it documents.

**New `docs/authoring/entities.md`** — the concept `collection`, `aggregate`, `relationships`, and `expand` all used to send readers into `plugin-authoring/pipeline.md` for. Covers what an entity is, the three ways entities get registered (including `type` in frontmatter, which is the mechanism behind the rune catalog), how the five registry runes relate, embeddability, ordering, and relationships. The four rune pages now link here; `relationships.md:109` keeps its link to the pipeline page for the `relate()`/`getRelated()` contract, which is genuinely plugin-author material.

**New `docs/configuration/entity-routes.md`** — `entityRoutes` is site config but was documented only inside the pipeline hook reference, so it was invisible from the configuration docs. Full field reference, placeholders, page bodies, filtering, and when to drop to a hook instead. `pipeline.md` keeps a short pointer.

**Split `tint-cascade`** — `docs/authoring/tint.md` gets the cascade order, field semantics, worked example, YAML idioms, and the intentional-vs-incidental notes; `extend/theme-authoring/tint-cascade.md` keeps `resolveTintCascade`, the SSR helper contract, and the anti-flash script, plus a new section on what a non-SvelteKit adapter has to honour.

**Navigation**: `docs/_layout.md` gains Authoring and Configuration sections (Guide is now just getting-started + content); `extend/_layout.md` drops the moved entries; the root menubar and footer gain Authoring and Entities; `docs/content.md` ends with a card grid into the rest of the Authoring guide; `extend/index.md` points rune authors at the author-facing surface their runes will be used through.

**Links**: 30 files rewritten to the new URLs. Also fixed two pre-existing broken links in `plan/docs/` that pointed at a `sites.md` anchor that never existed — they now point at the new entity-routes page.

### Verification

Wrote a link checker that resolves every internal link in `site/content` against the page tree, and checks anchors against the ids in the **built HTML** rather than a reimplementation of the slug algorithm. That distinction mattered: three anchors I had written by intuition were wrong, because refrakt's heading-ID generator preserves em-dashes and commas and drops inline code entirely. Filed as BUG-005 — twelve pre-existing deep links in the docs are silently broken for the same reason.

After fixes: zero broken links, zero bad anchors, and zero redirect loops in anything this change touched. The 15 remaining findings are all pre-existing and confirmed absent from this diff. Site builds clean (all 11 authoring pages and 9 configuration pages emitted, all redirect stubs resolving); full suite 4185/4185.

### Notes

- The rule applied throughout: a page has one home, chosen by who performs the task, not by which subsystem implements it. Where both audiences genuinely need the material at different depths, the page was split rather than assigned to one side.
- `docs/authoring/` still holds four legacy stubs (`authoring-overview`, `content-models`, `output-contract`, `patterns`) pointing into `extend/rune-authoring/`. Those are correct — those pages are rune-development material and stay in Extend.
- Nothing was duplicated. Every cross-handbook reference is a link.

{% /work %}
