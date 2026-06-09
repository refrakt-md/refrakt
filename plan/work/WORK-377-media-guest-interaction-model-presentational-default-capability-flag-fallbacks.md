{% work id="WORK-377" status="ready" priority="low" complexity="moderate" source="SPEC-090" tags="composability, runes, engine, a11y" milestone="v0.20.0" %}

# Media-guest interaction model: presentational default + capability flag + fallbacks

Define media guests as presentational by default with an explicit `interactive` capability and a static fallback per interactive guest.

## Acceptance Criteria
- [ ] Media-slot guests are presentational by default; interactivity is an explicit guest capability (`codegroup`/`tabs`/`datatable`/`form`/`map`/`sandbox`/`juxtapose`/declared).
- [ ] Each interactive guest defines a static presentational fallback (e.g. codegroup→default tab shown statically, tabs→first panel, map→snapshot, juxtapose→fixed split).

## Approach
Behaviour-driven runes in `@refrakt-md/behaviors`. SPEC-090 §1.

## References

- {% ref "SPEC-090" /%}

{% /work %}
