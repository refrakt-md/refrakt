{% work id="WORK-623" status="in-progress" priority="high" complexity="moderate" source="SPEC-145" milestone="v0.40.0" tags="runes,composition,validation,dx" %}

# A composition definition is checked at construction

Every rejection {% ref "SPEC-145" /%} decides at definition load or schema construction,
in one place, so that a bad definition fails with its rune and the offending name rather
than rendering silently wrong. Between them, D11 and D26 match every content-model field
to exactly one slot.

The bulk of this item is the error messages. Each check names the rune and the thing it
rejected, and the tests assert the message as well as the throw.

## Blocked by

- {% ref "WORK-622" /%}

## Acceptance Criteria

- [ ] A template containing `data`, `snippet` or `include` is rejected at definition load, naming the rune and the offending tag (D4)
- [ ] Declaring more than one of slot declaration / template / `transform` is rejected at schema construction (D5)
- [ ] A content-model field that no slot places is a build error naming the field — content is never silently dropped (D11)
- [ ] A template naming a slot the content model does not produce is rejected at schema construction, naming the slot (D26)
- [ ] A template placing the same slot twice is rejected at schema construction, naming the slot (D26)
- [ ] `each` on a single-valued field is rejected at schema construction, naming the slot (D26)
- [ ] Inside an `each` slot, `$each` exposes exactly the content model's `emitAttributes`; naming any other field is rejected at schema construction, naming the field (D26)
- [ ] A composition cycle is detected and reported by rune name, at schema construction rather than at render
- [ ] A composition template placing a rune that declares a top-level schema `type` is rejected at build, naming both runes; a subordinate emitter (`figure`, `gallery`) is allowed (D9)
- [ ] A template placing a rune that declares `requiresParent` is rejected at definition load, naming both runes and the required parent (D12)
- [ ] A composed rune ships no CSS, and a definition that tries to is rejected naming the rune (D2)

{% /work %}
