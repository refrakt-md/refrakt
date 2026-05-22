{% spec id="SPEC-067" status="placeholder" tags="docs, site, marketing, intro" %}

# "See it in action" — site-as-showcase introduction article cluster

A site-side deliverable, not an engine spec: a guided introduction article (or short cluster) that uses the refrakt site itself as the showcase. The reader doesn't watch a demo — they walk through the live site with the article as a tour guide, discovering that every primitive they encounter (nav, drawer, xref, expand, plan content, code embeds) is the system working on itself.

This spec is a **placeholder** to capture the creative beats while we finish the engine work that unblocks it ({% ref "SPEC-060" /%}, {% ref "SPEC-062" /%}, {% ref "SPEC-066" /%}, {% ref "SPEC-061" /%}, {% ref "SPEC-065" /%}). It will be promoted to `draft` and fleshed out once those land.

## Problem

Refrakt's pitch ("Markdoc with rune themes and plan tooling") doesn't land from a feature list. What sells the system is *seeing* the recursion and composition that nothing else does — the spec describing the drawer rune, embedded in a drawer, opened from a sentence in prose, with its source visible in a side panel. The current landing page is fine as an entrypoint but doesn't make this dimension concrete.

A site-as-showcase introduction would close the gap between "I read the marketing copy" and "I get why this is different."

-----

## Design Principles (placeholder)

**The site IS the demo.** No separate showcase, no fenced-off playground. The article is a guided tour of the live site. Every primitive the reader encounters is the system working on itself. This isn't a rhetorical trick — it's literally true and worth saying out loud.

**Recursion as the wow moment.** The reader clicks an xref to the drawer rune's spec and a drawer opens with that spec embedded. The drawer's own behavior is documented by the document opened inside the drawer. This is the line in the sand — the reader either gets the system in that moment or doesn't.

**Discovery over enumeration.** The article doesn't list features. It walks the reader through the site, pointing at primitives in their natural habitat ("this nav is a rune", "this side panel is a drawer triggered by an xref"). Readers who keep exploring beyond the article keep discovering more of the same trick.

**Dogfooding is the credibility signal.** The site's quality is the system's quality. No "the marketing site is polished, the docs are rough" hideout. That's pressure but also the most honest possible demonstration that the team lives in the tool.

-----

## Article Beats (placeholder, to refine)

**Opening hook.** "You're already using it." Quick name-the-primitives-around-you intro:
- This nav is a rune
- The colors are tokens cascading from a theme
- The spec mentioned in the next sentence, when clicked, opens a drawer with the spec that *defined* the drawer
- "Welcome to the tour. There's no separate demo; the tour is the site."

**The recursive drawer moment.** The canonical demo: an xref to `SPEC-060` opens a drawer whose body is `{% expand "SPEC-060" /%}`. The drawer rendering its own spec. Sets the tone for everything that follows.

**Site-wide `·` shortcut.** Every page has a `.` shortcut (configurable) that opens "how this page is built" — a drawer with `{% code-file path=$file.path lang="md" /%}`. Discovered once on the intro article, it works everywhere. The reader tries it on the next page they visit and it works there too. The "this is a system, not a demo" moment.

**Plan in production.** A real work item embedded inline. Click the spec it sources from — drawer opens with the full spec. Click the PR link — out to GitHub. Below: the resulting page the work shipped. Plan, code, output as one continuous artifact.

**Per-plugin glances.** Short pointers into each plugin's natural habitat ("if you write fiction, look at storytelling"; "if you build product pages, look at marketing"). Each link goes to a real page using the plugin in earnest.

**"What you can't do anywhere else."** Concentrated wow: a single section using 6–8 runes composed together (nav + drawer + expand + code-file + xref + tabs + spec embed) to make one cohesive narrative. The "okay, this is genuinely different" moment.

**Outro: the seams.** A small `[show seams]` toggle that outlines every rune on the page with a tag identifying it and links to its doc. Museum-mode for the curious. Some readers turn it on once and turn it off; others turn it on and never turn it off because now they see refrakt everywhere they look.

-----

## Dependencies

Blocked on:

- {% ref "SPEC-060" /%} — drawer rune (the recursive-drawer moment, the `·` shortcut)
- {% ref "SPEC-066" /%} — expand rune (embedded specs inside drawers)
- {% ref "SPEC-062" /%} — code-file rune (view-source affordance per page)
- {% ref "SPEC-061" /%} — page variables (`$file.path` for view-source)
- {% ref "SPEC-065" /%} — configurable xref resolution (the `data-target-type` convention that wires xrefs to drawers)
- {% ref "SPEC-064" /%} — plan plugin unconditional registration (plan content as registry entities so xrefs to specs work site-wide)

Once those land, this spec gets promoted to `draft` and the beats above get fleshed into a real outline with acceptance criteria.

-----

## Out of Scope (placeholder)

- Video tour, marketing copywriting, brand redesign — none of those. The article is a refrakt-rendered page that uses refrakt primitives.
- A separate showcase or demo site at a different URL.
- "Compare to MDX/Astro/Nuxt-content" hit pieces. Side-by-side code snippets are honest; editorializing isn't.
- Generated/AI-narrated walkthroughs — the reader steers their own pace by clicking around the live site.

-----

## Open Questions (placeholder, for when promoted to draft)

- Single article or short cluster (3–5 pages)? Intuition: short cluster, with the intro article as the entrypoint and per-plugin/per-capability pages as branches.
- Where in the site IA does this land? Likely `/intro` or `/see-it-in-action` at the top level, linked from the landing page hero.
- Should there be an "audience selector" (I write docs / I write fiction / I run an OSS project / I'm a theme author) that tunes the tour through the relevant feature subset?
- Does the `·` (or some other key) shortcut convention warrant being shipped as a site-default, or is it per-page opt-in via drawer authoring?
- How to handle progressive enhancement: if a reader has JS disabled, the drawer-trigger UX falls back to fragment-scroll. The article should still feel coherent in that mode. Worth a no-JS pass during implementation.

-----

## References

- {% ref "SPEC-060" /%} — drawer rune
- {% ref "SPEC-066" /%} — expand rune
- {% ref "SPEC-062" /%} — code-file rune
- {% ref "SPEC-061" /%} — page variables
- {% ref "SPEC-065" /%} — configurable xref resolution
- {% ref "SPEC-064" /%} — plan plugin unconditional registration

{% /spec %}
