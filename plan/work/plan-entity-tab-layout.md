{% work id="WORK-140" status="ready" priority="high" complexity="moderate" tags="plan, layout, tabs, behaviors" %}

# Tab layout for plan entity pages

Add a tab panel to plan entity pages (spec, work, bug, decision) that separates the main authored content from pipeline-generated metadata views. Each entity page gets tabs:

- **Overview** — the full rune content exactly as it renders today (description, acceptance criteria, approach, etc.)
- **Relationships** — entity cards showing implements/implemented-by, depends-on/dependency-of, blocks/blocked-by, and related references
- **History** — git-derived timeline of attribute changes, criteria progress, and status transitions

The tab structure is injected during `postProcess` by emitting the same HTML contract that `tabsBehavior` expects (`[data-name="tabs"]` with `role="tablist"` buttons + `[data-name="panels"]` with `role="tabpanel"` divs). The tabs rune itself cannot be used because the data is synthesized after the schema transform phase.

Tabs should only appear when there is content for at least one of the Relationships or History panels. If an entity has no relationships and only a single commit (no meaningful history), render the page as today with no tab wrapper.

## TOC and section-nav coordination

The desktop TOC sidebar and mobile section-nav dropdown must remain generic — they know nothing about tabs. A plan-specific coordinator behavior bridges the two systems:

- Listens for anchor navigation (click or `hashchange`) where the target `#id` is inside an inactive tab panel
- Activates the correct panel before the browser scrolls to the anchor
- On desktop, the TOC sidebar can be visually dimmed or collapsed when a non-Overview tab is active (CSS-only, no TOC code changes)
- The section-nav dropdown entries for Relationships and History activate their respective tabs

This coordinator lives in the plan package's `behaviors` map alongside the existing `milestone-backlog` entry. The TOC `scrollspy` behavior and `section-nav` behavior remain untouched.

## Acceptance Criteria

- [ ] `postProcess` wraps entity content in a tab-group structure with Overview, Relationships, and History panels
- [ ] Tab structure uses the same HTML contract as `tabsBehavior` (tablist buttons + tabpanel divs)
- [ ] `tabsBehavior` is registered for plan entity tab groups in the plan package behaviors map
- [ ] Tabs are omitted when the entity has no relationships and no meaningful history (single commit)
- [ ] Overview panel contains the existing rune body content unchanged
- [ ] Relationships panel contains the `buildRelationshipsSection` output (currently appended inline)
- [ ] History panel contains the `buildAutoHistorySection` output (currently appended inline)
- [ ] Plan-specific coordinator behavior activates the correct tab when navigating to an anchor inside an inactive panel
- [ ] Desktop TOC sidebar dims or hides via CSS when a non-Overview tab is active (no changes to TOC component code)
- [ ] Mobile section-nav dropdown entries for Relationships/History activate their respective tabs
- [ ] CSS for tab bar styled consistently with existing plan page chrome
- [ ] Existing plan pages without relationships or history render identically to before (no regressions)

## Dependencies

- {% ref "WORK-138" /%} — Plan history rune implementation (provides the history data)

## Approach

### Pipeline changes (`runes/plan/src/pipeline.ts`)

In `postProcess`, instead of appending relationship and history sections as children of the rune tag, wrap them in a tab-group structure:

1. Extract the existing rune body children as the Overview panel content
2. Build Relationships panel from `buildRelationshipsSection` (already implemented)
3. Build History panel from `buildAutoHistorySection` (already implemented)
4. If neither panel has content, return the rune unchanged (no tab wrapper)
5. Emit a wrapper element with `data-rune="plan-entity-tabs"` containing:
   - `[data-name="tabs"]` div with `role="tablist"` and three buttons
   - `[data-name="panels"]` div with three `role="tabpanel"` divs

### Behavior registration (`runes/plan/src/index.ts`)

Add `'plan-entity-tabs': tabsBehavior` to the plan package's `behaviors` map so the tab interaction is wired up automatically.

### Coordinator behavior (`runes/plan/src/behaviors/tab-nav-coordinator.ts`)

A small behavior registered for `plan-entity-tabs` elements that:
- Intercepts anchor clicks where the target heading lives inside a tab panel
- Activates the panel containing the target before scroll
- Listens for `hashchange` for the same purpose (back/forward navigation)

### CSS (`runes/plan/styles/`)

- Tab bar styling consistent with existing plan chrome (badge colors, font sizes)
- Active tab indicator using plan design tokens
- `[data-state="inactive"]` on panels hides content (standard tabs pattern)
- `.rf-plan-toc` gets opacity/pointer-events reduction when a `[data-active-tab]` attribute is not "overview" (CSS-only, scoped to plan layout)

### Config (`runes/plan/src/config.ts`)

Add a `PlanEntityTabs` rune config entry with `block: 'plan-entity-tabs'` for BEM class generation.

## References

- `runes/plan/src/pipeline.ts` — postProcess hook (lines 640-664) where relationship/history injection currently happens
- `packages/behaviors/src/behaviors/tabs.ts` — tabsBehavior HTML contract
- `packages/behaviors/src/behaviors/scrollspy.ts` — TOC scrollspy (must not be modified)
- `packages/behaviors/src/behaviors/section-nav.ts` — mobile section nav (must not be modified)
- `runes/plan/src/config.ts` — plan rune configs

{% /work %}
