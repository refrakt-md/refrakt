{% work id="WORK-133" status="done" priority="medium" complexity="moderate" source="SPEC-015" tags="plan, layout, mobile, behaviors, css" %}

# Mobile plan section navigation and desktop TOC filtering

Long plan entities (specs, work items, decisions) are hard to navigate on mobile — you have to scroll through the entire document to reach a section. The toolbar scrolls away so you can't even reach the sidebar nav. On desktop, the TOC sidebar lists every H2/H3 heading, which becomes a wall of text for detailed specs and is hard to scan.

Plan runes already declare known sections with canonical names (Acceptance Criteria, Dependencies, Approach, etc.) and the transform wraps them in `<section data-name="...">` elements. We can leverage this to build focused section navigation for both mobile and desktop.

## Acceptance Criteria

- [x] Plan toolbar is sticky on mobile (stays visible when scrolling)
- [x] Toolbar title shows the entity ID (e.g., "WORK-127") instead of the hardcoded "Plan"
- [x] Toolbar has a three-dot icon button on the right side that opens a section nav
- [x] Section nav lists only known sections present on the current page
- [x] Tapping a section in the nav smooth-scrolls to that section
- [x] Current section is highlighted in the section nav via scrollspy integration
- [x] Section nav dismisses after selecting a section
- [x] On desktop, the TOC sidebar for plan pages is filtered to known sections only (not all H2/H3 headings)
- [x] Plan rune transform marks known-section headings with a `data-known-section` attribute so both mobile nav and desktop TOC can key off the same signal
- [x] Spec and milestone runes (which lack known sections) retain the existing full-heading TOC behaviour

## Dependencies

- {% ref "WORK-024" /%} — knownSections framework support (done)
- {% ref "WORK-129" /%} — scanner integration for known sections (done)

## Approach

Three layers of change:

**1. Transform: mark known-section headings.** During plan rune transform, add `data-known-section` to the H2 heading element of each known section. This provides a single signal that both the mobile behavior and the desktop TOC builder can use.

**2. Layout + CSS: sticky toolbar with page ID and section nav trigger.** Make the plan toolbar `position: sticky`. Source the title from the page's entity ID (available in frontmatter). Add a three-dot chrome element on the right side. The section nav should be a compact dropdown/popover (not a fullscreen panel — there are only 4-6 items). Wire scrollspy to highlight the active section.

**3. Desktop TOC filtering.** The `buildToc()` function in `packages/transform/src/computed.ts` currently includes all headings matching minLevel/maxLevel. For the plan layout, add filtering to only include headings that have `data-known-section`. Since this attribute is added at transform time, the TOC builder (which runs after transform) can read it. Spec and milestone runes don't declare known sections, so their headings won't have the attribute — the TOC should fall back to the existing full-heading behaviour when no known-section headings are found.

## References

- {% ref "SPEC-015" /%} — Plan site UX (notes mobile-specific UI as out of scope, but this is a targeted improvement that benefits responsive use)
- {% ref "SPEC-037" /%} — Plan package hardening (knownSections design)

## Resolution

Completed: 2026-04-12

Branch: `claude/mobile-plan-section-nav-SNE06`

### What was done

- `runes/plan/src/util.ts` — `buildSections` now adds `data-known-section` attribute (canonical name) to H2 headings that match a known section via `$canonicalName` from the resolver
- `runes/plan/src/commands/render-pipeline.ts` — Added `annotateKnownSections()` that walks the rendered Markdoc tree post-transform and propagates `data-known-section` to the `HeadingInfo` array; populated `frontmatter.toolbarTitle` with entity ID for layout access
- `packages/runes/src/util.ts` — Extended `HeadingInfo` interface with optional `knownSection` field
- `packages/transform/src/types.ts` — Extended `LayoutPageData.headings` type with `knownSection`
- `packages/transform/src/layouts.ts` — Plan layout: toolbar title uses `pageText: 'frontmatter.toolbarTitle'` (shows entity ID), added `sectionNavToggle` chrome element (three-dot button), added `section-nav` behavior, set `knownSectionsOnly: true` on TOC computed config
- `packages/transform/src/layout.ts` — `resolveComputed` TOC case: added `knownSectionsOnly` filtering with fallback to all headings when no known sections exist
- `packages/behaviors/src/behaviors/section-nav.ts` — New behavior: scans `[data-known-section]` headings, builds dropdown with smooth-scroll links, integrates IntersectionObserver scrollspy for active section highlighting, dismisses on selection/Escape/outside-click
- `packages/behaviors/src/index.ts` — Registered `section-nav` as layout behavior
- `runes/plan/styles/default.css` — Sticky toolbar (`position: sticky; top: 0; z-index: 100`), toolbar title flex-grow for button alignment, section nav toggle button styles, section nav dropdown (absolute positioned, shadow, active state with blue border accent)

### Notes

- The `data-known-section` attribute serves as the single source of truth for both the mobile section nav behavior and the desktop TOC filter — no duplication of known-section definitions
- Desktop TOC filtering uses a graceful fallback: when `knownSectionsOnly` is true but no headings have `knownSection` set (specs, milestones), the full H2/H3 heading list is used instead
- The section-nav behavior hides the toggle button entirely when no `[data-known-section]` headings exist on the page

{% /work %}
