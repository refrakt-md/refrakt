{% work id="WORK-374" status="ready" priority="medium" complexity="moderate" source="SPEC-089" tags="surfaces, runes, engine, lumina, layout" milestone="v0.20.0" %}

# content-place 2-axis logical overlay anchor + orientation-adaptive auto

Add `content-place`, a 2-axis logical overlay anchor active only in cover mode, with an orientation-adaptive `auto` default.

## Acceptance Criteria
- [ ] `content-place` is 2-axis logical (`start|center|end` × `start|center|end`), default `end`, mapping to `justify`/`align`; physical aliases may exist.
- [ ] Active only in `cover` mode; a build warning otherwise.
- [ ] `content-place="auto"` (the cover default) adapts to the rune's container-query orientation (portrait→block-end, landscape→inline-start); an explicit value pins it.

## Approach
Media zone is a container-query context (WORK-339). SPEC-089 §2.

## References

- {% ref "SPEC-089" /%}

{% /work %}
