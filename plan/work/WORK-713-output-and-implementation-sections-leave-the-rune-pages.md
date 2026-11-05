{% work id="WORK-713" status="done" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, runes, simplification" milestone="v0.49.0" pr="refrakt-md/refrakt#780" %}

# Output and implementation sections leave the rune pages

SPEC-193 D2. Fifteen rune pages carry an Output contract (HTML dumps, BEM classes, `data-*`
attributes), and about 40 explain CSS, custom properties or pipeline internals to content authors.
`refrakt inspect` and the structure contract state the structure, generated.

## Acceptance Criteria
- [x] The Output contract / Output / Output structure sections are removed from actions, aggregate, badge, bar, card, code, collection, deflist, expand, file-ref, link, progress, relationships, snippet and plan/plan-history
- [x] backlog, decision-log and plan-activity keep their "Output structure" prose as "What it shows", without theming detail
- [x] CSS, custom-property, engine and pipeline sections (F1) are removed from rune pages, or moved to the theme- or rune-authoring handbook where worth keeping there, each move named in the resolution
- [x] Adapter "Theme Integration" sections move to `extend/`; the maintainer sections ("Keeping this page honest", "Local-development reference") are removed
- [x] Example content about the engine (feature, plan/work, plan/spec, plan/milestone) is replaced with real content
- [x] No page links to a removed section

## Blocked by
- {% ref "WORK-712" /%}

## References
- {% ref "SPEC-193" /%}: D2, F1.

## Resolution

Completed: 2026-11-05

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- Output / Output contract / Output structure removed from the 15 rune pages; backlog, decision-log and plan-activity describe "What it shows" in prose.
- F1 internals cut or reduced to author-facing lines: tint (token table without CSS, "Identity transform output" cut), bar `## CSS`, deflist "Responsive layout" → "On narrow screens", expand "Resolution model" → "What can be embedded", drawer title-level and footer flex detail, snippet/data preprocessor hints and line-number CSS, bento frame/elevation note, hero animated-background mechanism, plan-history "How it works" → "Where the history comes from", "Cross-page pipeline" on plan and design index pages.
- Moves: adapter "Theme Integration" → `extend/theme-authoring/creating-a-theme` (Astro, Nuxt, Next.js, Eleventy tabs); nav-slug-resolution "Active state contract" + "Theme reference" → `extend/theme-authoring/layouts` ("Nav active state"); hero's canvas-sizing tip → sandbox `height="fill"`.
- Removed maintainer sections: "Keeping this page honest" (frontmatter, configuration reference), "Local-development reference" (schema), the `__` prefix section (variables).
- Engine example content replaced in feature, plan/work, plan/spec, plan/milestone.

### Notes
- Plan IDs remaining in prose (deflist, expand, drawer) are left for WORK-715.

{% /work %}
