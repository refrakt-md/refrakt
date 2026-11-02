{% work id="WORK-677" status="done" priority="high" complexity="moderate" source="SPEC-156" tags="runes, composition, sequence, identity, engine" milestone="v0.45.0" pr="refrakt-md/refrakt#750" %}

# A composition declares sequence in its definition, and a ladder stamps only its own list

Whether an ordinal is information is a fact about the content, so `sequence` is identity
({% ref "SPEC-158" /%} D2). A composition declares it in its definition, where a theme's
replacement template cannot remove it ({% ref "SPEC-156" /%} D12, {% ref "ADR-045" /%}). And a
ladder's `data-sequence` lands on the ladder only, not on every ordered list inside the rune
(D14).

## Acceptance Criteria

- [x] A composition's frontmatter accepts `sequence` (`numbered | connected | plain`), and the generated config carries it (D12)
- [x] A definition that declares `sequence` and places no ladder group is rejected at schema construction, naming the rune (D12)
- [x] The definition's sequence is stamped as `data-sequence` on its ladder group only; an ordered list an author writes inside an item is not stamped (D14)
- [x] Whether native runes already stamp an author's nested ordered lists, through `annotateSequence` recursing into every descendant, is checked; if they do, a bug is filed with the reproduction
- [x] SPEC-177 D5's `template-override-no-ladder` check is recorded as owed to SPEC-177, not built here, since replacement templates do not exist yet

## Blocked by

- {% ref "WORK-676" /%}

## References

- {% ref "SPEC-156" /%}: D12, D14.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `composition.ts`: the `sequence` definition key (numbered/connected/plain), carried on `CompositionTemplate` and the generated config. The ladder marker renders `<ol>` when it is set. `sequence-without-ladder` is raised when no ladder is placed.
- `composed-rune.ts`: passes `sequence` into the template.
- `packages/transform/src/engine.ts`: `annotateSequence` takes `laddersOnly`, which is true for a composed config. Only `ol[data-zone-layout="ladder"]` is stamped and numbered. Recursion copies each wrapper instead of mutating the input tree.
- Tests in `composition-group.test.ts`: config, `<ol>`, ordinals, connected/plain, no-sequence `<ul>`, the rejection, and author lists left unstamped.

### Notes
- Native check: `annotateSequence` stops at the first `<ol>` it meets, so an author list nested inside a step is never stamped. `howto`'s and `recipe`'s content models drop any other list (checked with a hint holding an `<ol>`). No bug filed.
- Ladders-only is keyed on `config.composed` rather than a tree scan, because a composed ladder usually sits inside a placed rune, past a `data-rune` boundary.
- SPEC-177 D5's `template-override-no-ladder` check is owed to SPEC-177; replacement templates do not exist yet.

{% /work %}
