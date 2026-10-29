{% work id="WORK-678" status="ready" priority="medium" complexity="moderate" source="SPEC-161,SPEC-156" tags="runes, composition, marketing, steps, sequence, section" milestone="v0.45.0" %}

# steps is a composition over section and a list

`steps` is a `section` with a numbered sequence of steps, each a `section` with a split
({% ref "SPEC-161" /%} D5). Its numbering needs a sequenced `list` group, which {% ref "WORK-676" /%} and
{% ref "WORK-677" /%} provide, and SPEC-169 D4's example is the template.

## Acceptance Criteria

- [ ] A composed `steps` definition declares `sequence: numbered` and `defaults: { elevation: flush }`, and places its steps in a numbered `list` group, accepting both an ordered list and step headings (SPEC-169 D4)
- [ ] Its numbers are DOM nodes ({% ref "WORK-583" /%}), not CSS counters
- [ ] A step written as a list item with no heading renders as body ({% ref "ADR-046" /%})
- [ ] Rendered beside the plugin `steps` for every gallery fixture, light and dark; every difference is listed and explained
- [ ] The plugin `steps` is unchanged; replacing it is a later step

## Blocked by

- {% ref "WORK-677" /%}
- {% ref "WORK-583" /%}
- {% ref "WORK-663" /%}: definition `defaults` (v0.44.0)

## References

- {% ref "SPEC-161" /%}: D5.
- {% ref "SPEC-169" /%}: D4.

{% /work %}
