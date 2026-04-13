{% work id="WORK-139" status="ready" priority="low" complexity="simple" source="SPEC-038" tags="plan, css, history" %}

# `plan-history` CSS rendering

Style the `plan-history` rune with a vertical timeline layout following the design conventions established by the `timeline` rune (connected line, circle markers) and the `diff` rune (add/remove coloring).

## Acceptance Criteria

- [ ] `.rf-plan-history` base styles: vertical timeline with left border line and circle markers
- [ ] Filled circle markers for events with structured changes, open circles for creation events
- [ ] `<time>` elements styled consistently with the timeline rune conventions
- [ ] `<code>` commit hash styled monospace and subdued
- [ ] Attribute change values use `data-type="add|remove"` with diff rune background tints
- [ ] Status transitions use sentiment colour system (done=positive, blocked=negative)
- [ ] `.rf-plan-history--global` modifier styles for commit-grouped feed
- [ ] `.rf-plan-history__commit-message` and `__entity-summary` styled for global mode
- [ ] Criteria collapse "+N more criteria" styled as subtle expandable summary
- [ ] Responsive: timeline readable on mobile viewports
- [ ] CSS uses design tokens (`--rf-color-*`, `--rf-radius-*`, etc.), no hard-coded values
- [ ] CSS added to plan package styles (`runes/plan/styles/`)

## Dependencies

- {% ref "WORK-138" /%} — Site rune implementation (defines the HTML structure to style)

## Approach

Add CSS to `runes/plan/styles/default.css` (or a new `plan-history.css` imported from it). Reference the timeline rune's proportions (2px border, 0.75rem markers, left-indented content) and the diff rune's data-attribute color conventions. Use existing plan design tokens where available.

The BEM selectors to style are defined by the HTML structure in SPEC-038's Rendering section.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (Rendering section)

{% /work %}
