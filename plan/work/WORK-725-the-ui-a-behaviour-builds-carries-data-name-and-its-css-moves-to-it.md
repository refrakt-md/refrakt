{% work id="WORK-725" status="ready" priority="low" complexity="moderate" source="SPEC-196" tags="behaviors, attributes, lumina, css" milestone="v0.50.0" %}

# The UI a behaviour builds carries data-name, and its CSS moves to it

{% ref "SPEC-196" /%} D6. Behaviours create their own UI (toolbars, buttons, indicators) with
about 70 `className =` writes. Those classes are the behaviour's own, so nothing breaks while they
stay. But the CSS styling them reads classes, so a page under `classes: "none"` would still depend
on them. Each element also gets a `data-name`, and the CSS moves to it.

This is the lowest-priority item in the milestone. If it slips, it moves to the next one without
holding anything up.

## Acceptance Criteria

- [ ] Every element a behaviour creates and gives a class also gets a `data-name` (or `data-state` for a state class)
- [ ] The Lumina rules styling behaviour-built UI select the attributes
- [ ] The classes stay: this item adds attributes and moves CSS, and removes nothing
- [ ] The behaviour tests that check created UI assert the attribute

## Approach

- {% ref "WORK-723" /%} already gives `data-name` to the elements its 13 self-injected selectors
  target. Start from the `className =` writes it left, behaviour by behaviour.
- Name each element as its part of the rune: `data-name="toolbar"`, `data-name="sort-indicator"`.
  Reuse a name the rune's config already declares where the element plays that part.

## Blocked by

- {% ref "WORK-723" /%}

## References

- {% ref "SPEC-196" /%} D6.

{% /work %}
