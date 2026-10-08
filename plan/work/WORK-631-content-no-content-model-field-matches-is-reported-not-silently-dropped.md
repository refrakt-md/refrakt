{% work id="WORK-631" status="ready" priority="high" complexity="moderate" source="SPEC-145" tags="runes,content-model,composition,dx,correctness" milestone="v0.41.0" %}

# Content no content-model field matches is reported, not silently dropped

Found by {% ref "WORK-625" /%}, the composed `character`. A `{% hint %}` an author wrote
before the first section was matched by no preamble field and dropped, with no error and no
warning. The composed definition works around it with a catch-all `body` preamble field.
SPEC-145 records the finding beside the `character` worked example.

**D11 promises against this silent loss but checks the other direction.** It requires that
every declared *field* is placed by a slot. Nothing checks that every *authored node* is
matched by a field. So content can still vanish between the author's file and the content
model, by another route.

This applies to any content model, not just compositions. A tree-owning rune with a narrow
preamble loses unmatched content the same way, so the fix belongs in the content-model
resolver, not in the composition layer. First measure how many shipped runes drop content
today, so the change can be staged as a warning before an error if needed.

## Acceptance Criteria

- [ ] The content-model resolver reports an authored node that no field matches, naming the rune, the node type and its source line
- [ ] The report reaches `refrakt validate` and the build output as a structured finding, not only a console line
- [ ] The number of shipped runes and fixtures that trip it today is measured and recorded, and the severity (warning or error) is chosen from that measurement
- [ ] A composed rune without a catch-all field, given content no field matches, produces the report; the composed `character` fixture keeps its `body` field and produces none
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy

{% /work %}
