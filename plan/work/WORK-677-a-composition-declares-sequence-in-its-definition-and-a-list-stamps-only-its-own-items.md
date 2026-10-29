{% work id="WORK-677" status="ready" priority="high" complexity="moderate" source="SPEC-156" tags="runes, composition, sequence, identity, engine" milestone="v0.45.0" %}

# A composition declares sequence in its definition, and a list stamps only its own items

Whether an ordinal is information is a fact about the content, so `sequence` is identity
({% ref "SPEC-158" /%} D2). A composition declares it in its definition, where a theme's
replacement template cannot remove it ({% ref "SPEC-156" /%} D12, {% ref "ADR-045" /%}). And a
list's `data-sequence` lands on its own items track only, not on every ordered list inside the rune
(D14).

## Acceptance Criteria

- [ ] A composition's frontmatter accepts `sequence` (`numbered | connected | plain`), and the generated config carries it (D12)
- [ ] A definition that declares `sequence` and places no `list` group is rejected at schema construction, naming the rune (D12)
- [ ] The definition's sequence is stamped as `data-sequence` on its `list` group's items track only; an ordered list an author writes inside an item is not stamped (D14)
- [ ] Whether native runes already stamp an author's nested ordered lists, through `annotateSequence` recursing into every descendant, is checked; if they do, a bug is filed with the reproduction
- [ ] SPEC-177 D5's `template-override-no-list` check is recorded as owed to SPEC-177, not built here, since replacement templates do not exist yet

## Blocked by

- {% ref "WORK-676" /%}

## References

- {% ref "SPEC-156" /%}: D12, D14.

{% /work %}
