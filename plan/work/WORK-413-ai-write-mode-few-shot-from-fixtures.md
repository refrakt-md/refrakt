{% work id="WORK-413" status="pending" priority="medium" complexity="moderate" source="SPEC-102" milestone="v0.22.0" tags="fixtures,ai" %}

# AI write mode draws fixtures as few-shot exemplars

`ai/src/modes/write.ts` hardcodes an "Example structure" in its prompt. Replace it with the
unified fixtures — drawing each rune's `rich`/`canonical` fixture (with its `notes`) as
in-context few-shot exemplars. No training pipeline; retrieval into the prompt only.

## Acceptance Criteria

- [ ] The write mode selects fixtures by `role` (rich/canonical) and includes them (+ `notes`) as few-shot examples instead of the hardcoded prompt example.
- [ ] No fine-tuning / training pipeline is introduced.

## Dependencies

- Requires {% ref "WORK-411" /%} (manifest) and {% ref "WORK-412" /%} (annotated corpus).

## References

- {% ref "SPEC-102" /%} · `packages/ai/src/modes/write.ts`.

{% /work %}
