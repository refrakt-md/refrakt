{% work id="WORK-259" status="ready" priority="medium" complexity="simple" source="SPEC-066" tags="pipeline, transform, headings, toc" milestone="v0.15.0" %}

# Generic `data-outline-scope` walkers (TOC isolation + heading-ID namespacing)

Two generic walkers that consume the `data-outline-scope` attribute as a neutral "this subtree is a sub-outline boundary" marker. Expand sets the attribute (WORK-260); the TOC walker and heading-ID walker honor it. Any future rune (sidenote, aside, quote, panel) can adopt the same convention and get the same behavior automatically.

These walkers are extracted from the cross-cutting concern they really are: they don't know about expand specifically and shouldn't.

## Acceptance Criteria

- [ ] TOC walker (used by `{% toc %}` and similar tooling) skips headings descended from any element with `data-outline-scope` set, regardless of which rune set it
- [ ] Heading-ID walker prefixes IDs of headings inside any `data-outline-scope` subtree with `{scope-value}--` (e.g., `SPEC-023--acceptance-criteria`)
- [ ] Heading IDs use the standard slugifier for the suffix portion; the prefix is the literal value of the nearest enclosing `data-outline-scope` attribute
- [ ] Both walkers are generic — they know nothing about expand or any specific rune
- [ ] When `data-outline-scope` is not present (the default for normal content), behavior is unchanged from today
- [ ] Tests cover: TOC skipping inside scoped subtrees; heading-ID prefixing; nested-scope behavior (innermost scope wins); absence of attribute = no-op
- [ ] Authoring docs note the `data-outline-scope` convention as a primitive available to any rune that wants to be a sub-outline boundary

## Approach

The TOC walker is the consumer side of an existing extraction; locate the heading-collection helper and add the `data-outline-scope` skip check.

The heading-ID walker is part of the existing heading-anchor-generation logic; add the scope-prefix lookup using the nearest enclosing ancestor's `data-outline-scope` value.

Both changes are small and intentionally generic — no expand-specific code.

## Dependencies

- None within v0.15.0. Independent prerequisite for WORK-260.

## References

- {% ref "SPEC-066" /%} — expand-rune spec (introduces and motivates the convention)
- {% ref "SPEC-060" /%} — drawer rune (potential future opt-in for the same convention)

{% /work %}
