{% work id="WORK-133" status="ready" priority="medium" complexity="moderate" source="SPEC-015" tags="plan, layout, mobile, behaviors, css" %}

# Mobile plan section navigation and desktop TOC filtering

Long plan entities (specs, work items, decisions) are hard to navigate on mobile — you have to scroll through the entire document to reach a section. The toolbar scrolls away so you can't even reach the sidebar nav. On desktop, the TOC sidebar lists every H2/H3 heading, which becomes a wall of text for detailed specs and is hard to scan.

Plan runes already declare known sections with canonical names (Acceptance Criteria, Dependencies, Approach, etc.) and the transform wraps them in `<section data-name="...">` elements. We can leverage this to build focused section navigation for both mobile and desktop.

## Acceptance Criteria

- [ ] Plan toolbar is sticky on mobile (stays visible when scrolling)
- [ ] Toolbar title shows the entity ID (e.g., "WORK-127") instead of the hardcoded "Plan"
- [ ] Toolbar has a three-dot icon button on the right side that opens a section nav
- [ ] Section nav lists only known sections present on the current page
- [ ] Tapping a section in the nav smooth-scrolls to that section
- [ ] Current section is highlighted in the section nav via scrollspy integration
- [ ] Section nav dismisses after selecting a section
- [ ] On desktop, the TOC sidebar for plan pages is filtered to known sections only (not all H2/H3 headings)
- [ ] Plan rune transform marks known-section headings with a `data-known-section` attribute so both mobile nav and desktop TOC can key off the same signal
- [ ] Spec and milestone runes (which lack known sections) retain the existing full-heading TOC behaviour

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

{% /work %}
