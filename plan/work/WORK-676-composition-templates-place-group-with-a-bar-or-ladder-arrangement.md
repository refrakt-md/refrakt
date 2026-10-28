{% work id="WORK-676" status="ready" priority="high" complexity="moderate" source="SPEC-156" tags="runes, composition, arrangements, layout, skeleton, sequence" milestone="v0.45.0" %}

# Composition templates place group with a bar or ladder arrangement

A composition template has no way to arrange ordinary slots as a row, except by placing the
`bar` rune, which is a name-resolution boundary (SPEC-145 D19). And it has no way to wrap an
`each` slot's items in a list. {% ref "SPEC-156" /%} D2 and D3 answer both with one template tag,
`{% group name="…" layout="bar|ladder" %}`, an engine wrapper with an arrangement.

## Acceptance Criteria

- [ ] A template can place `{% group %}` with a required `name` and `layout` of `bar` or `ladder`; it renders with `data-name` and no `data-rune`, and an unknown `layout` is rejected at schema construction, naming it (D2)
- [ ] A `bar` group renders `data-zone-layout="bar"` over what it holds, and a child written as `{% group name="…" align="end" %}` renders `data-align="end"` and pushes to the end (D2)
- [ ] A `ladder` group renders `<ol>` when the definition declares a `sequence` and `<ul>` otherwise, with `data-zone-layout="ladder"`, and wraps each `each` iteration placed directly in it, or else each top-level node it holds, in an `<li>` (D3)
- [ ] Skeleton gains `[data-zone-layout="ladder"]`: the list reset and column flow for a ladder with no sequence. `cast`'s `list` mode uses it and its own reset is deleted (D3)
- [ ] `{% group %}` is a template tag only: on a page it is reported as an unknown tag, as today (D2)
- [ ] A group is safe where schema is involved: a node-sourced schema property inside a group resolves, asserted against a placed `{% bar %}` where it does not (D9)
- [ ] The composed-runes guide documents `{% group %}` and D9's grouping rule
- [ ] Contracts are regenerated on both copies and the CSS coverage test passes

## References

- {% ref "SPEC-156" /%}: D2, D3, D9.
- {% ref "ADR-030" /%}: rule 6, the group form.

{% /work %}
