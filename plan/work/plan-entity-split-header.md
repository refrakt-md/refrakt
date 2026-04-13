{% work id="WORK-141" status="ready" priority="medium" complexity="moderate" tags="plan, transform, config, identity-transform" %}

# Split plan entity header into primary badges, title, secondary badges

Restructure the identity transform config for plan entity runes (spec, work, bug, decision, milestone) so the header badges are split into two groups around the title, matching the visual hierarchy already used by backlog cards:

1. **Primary badges** (id on the left, status on the right, justify-between) — above the title, minimal chrome, matching the backlog card header layout
2. **Title** (h1) — prominent, between the badge groups
3. **Secondary badges** (priority, complexity, milestone, assignee, source, dates, etc.) — below the title
4. **Tabs / body content** — below the secondary badges

Currently all badges are grouped in a single `header` structure entry with `before: true`, placing them above the body content (which contains the title). This makes the header cluttered and inconsistent with the backlog card layout.

## Acceptance Criteria

- [ ] Plan entity rune configs use `slots` to define assembly order: `['header-primary', 'content', 'header-secondary']`
- [ ] Primary badges (id, status) are assigned to the `header-primary` slot with id on the left and status on the right (justify-between)
- [ ] Secondary badges (priority, complexity, assignee, milestone, source, created, modified, etc.) are assigned to the `header-secondary` slot
- [ ] Title (h1 from body content) renders between the two badge groups
- [ ] All five entity types (spec, work, bug, decision, milestone) are updated consistently
- [ ] Primary badges render without label text (labelHidden), matching backlog card style
- [ ] Secondary badges retain their current label + value rendering
- [ ] Backlog cards remain unchanged (they build their own structure in pipeline.ts)
- [ ] BEM classes follow the pattern: `.rf-work__header-primary`, `.rf-work__header-secondary`
- [ ] CSS in Lumina updated to style the split header layout (primary badges inline, title prominent, secondary badges as pills/row)
- [ ] Existing CSS coverage tests pass
- [ ] Contracts regenerated

## Dependencies

- {% ref "WORK-140" /%} — Tab layout for plan entity pages (the tab group sits below the secondary badges)

## Approach

### Config changes (`runes/plan/src/config.ts`)

For each entity rune config (Work, Spec, Bug, Decision, Milestone):

1. Add `slots: ['header-primary', 'content', 'header-secondary']`
2. Split the existing `structure.header` into two entries:
   - `'header-primary'`: `{ tag: 'div', slot: 'header-primary', children: [id-badge, status-badge] }`
   - `'header-secondary'`: `{ tag: 'div', slot: 'header-secondary', children: [remaining badges...] }`
3. Remove the old single `header` structure entry
4. Update `sections` map to reflect the new structure names

The engine's `assembleWithSlots` function handles the ordering — primary badges are emitted first, then content (which includes the title), then secondary badges. No engine changes needed.

### CSS changes (`packages/lumina/styles/runes/`)

Update the per-rune CSS files (work.css, spec.css, bug.css, decision.css) to style the split layout:
- `.rf-work__header-primary` — flex row with `justify-content: space-between`, id on the left and status on the right (matching backlog card header layout)
- `.rf-work__header-secondary` — flex row with wrap, pill-style badges with labels

### Variant-specific badges

Each rune type has different secondary badges:
- **Work**: priority, complexity, assignee, milestone, source, created, modified
- **Spec**: version, supersedes, created, modified
- **Bug**: severity, assignee, milestone, source, created, modified
- **Decision**: date, supersedes, source, created, modified
- **Milestone**: target, created, modified

## References

- `runes/plan/src/config.ts` — current plan rune configs with single header structure
- `packages/transform/src/types.ts` — `RuneConfig.slots`, `StructureEntry.slot` definitions
- `packages/transform/src/engine.ts` — `assembleWithSlots` implementation
- `runes/plan/src/pipeline.ts` — backlog card builder (reference for primary/secondary badge pattern)
- `packages/lumina/styles/runes/work.css` — current work rune CSS

{% /work %}
