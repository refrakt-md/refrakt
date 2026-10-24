{% work id="WORK-648" status="ready" priority="medium" complexity="simple" source="SPEC-169" tags="runes, composition, content-model, each" milestone="v0.42.0" %}

# each iterates the items of a list field

Today `each` iterates a list only when the field has an `itemModel` with an `emitTag`. A list
whose items need no extraction, where each item's content is placed as it is, has no way in.
That blocks `steps`, which takes its steps from headings or from an ordered list
({% ref "SPEC-169" /%} D4).

## Acceptance Criteria

- [ ] `each` on a non-greedy field matching one `list` iterates its items, with the bare slot as each item's content and no `$each` bindings
- [ ] A composed `steps` fixture renders the same steps from headings and from an ordered list, with one model and no conditional
- [ ] An `each` over a greedy list field, or a field that can match several lists, is a construction error naming the field
- [ ] The composed-runes guide documents list `each` beside `itemModel`, including that `itemModel` patterns consume the text they match in order (from BUG-038)

## Approach

- SPEC-169's `steps` example places the items in `{% group layout="ladder" %}`. The ladder is
  {% ref "SPEC-156" /%}'s and still draft, so the fixture uses a plain container. It proves the
  model, not the look.
- {% ref "BUG-038" /%} fixes `itemModel` patterns in the same part of the resolver. Land it
  first if both are in flight, so the list `each` tests run beside working `itemModel` tests.
- D4's open question, whether rendering both a list and headings should warn, stays open. The
  fixture covers each input separately.

## References

- {% ref "SPEC-169" /%}: D4.
- {% ref "BUG-038" /%}.

{% /work %}
