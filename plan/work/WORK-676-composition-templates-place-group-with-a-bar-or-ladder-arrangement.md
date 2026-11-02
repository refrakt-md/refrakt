{% work id="WORK-676" status="done" priority="high" complexity="moderate" source="SPEC-156" tags="runes, composition, arrangements, layout, skeleton, sequence" milestone="v0.45.0" pr="refrakt-md/refrakt#750" %}

# Composition templates place group with a bar or ladder arrangement

A composition template has no way to arrange ordinary slots as a row, except by placing the
`bar` rune, which is a name-resolution boundary (SPEC-145 D19). And it has no way to wrap an
`each` slot's items in a list. {% ref "SPEC-156" /%} D2 and D3 answer both with one template tag,
`{% group name="…" layout="bar|ladder" %}`, an engine wrapper with an arrangement.

## Acceptance Criteria

- [x] A template can place `{% group %}` with a required `name` and `layout` of `bar` or `ladder`; it renders with `data-name` and no `data-rune`, and an unknown `layout` is rejected at schema construction, naming it (D2)
- [x] A `bar` group renders `data-zone-layout="bar"` over what it holds, and a child written as `{% group name="…" align="end" %}` renders `data-align="end"` and pushes to the end (D2)
- [x] A `ladder` group renders `<ol>` when the definition declares a `sequence` and `<ul>` otherwise, with `data-zone-layout="ladder"`, and wraps each `each` iteration placed directly in it, or else each top-level node it holds, in an `<li>` (D3)
- [x] Skeleton gains `[data-zone-layout="ladder"]`: the list reset and column flow for a ladder with no sequence. `cast`'s `list` mode uses it and its own reset is deleted (D3)
- [x] `{% group %}` is a template tag only: on a page it is reported as an unknown tag, as today (D2)
- [x] A group is safe where schema is involved: a node-sourced schema property inside a group resolves, asserted against a placed `{% bar %}` where it does not (D9)
- [x] The composed-runes guide documents `{% group %}` and D9's grouping rule
- [x] Contracts are regenerated on both copies and the CSS coverage test passes

## References

- {% ref "SPEC-156" /%}: D2, D3, D9.
- {% ref "ADR-030" /%}: rule 6, the group form.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/src/lib/composition.ts`: the `{% group %}` template tag. `checkGroup` checks it at load (`group-invalid`), and the outline gains `group`/`layout`. `expandGroup` renders `refrakt:group` / `refrakt:group-item` markers. A ladder wraps each `each` iteration placed directly in it (through a new `wrapItem` on `expandSlot`), or else each top-level node. The marker schemas render `div` (bar, or align) or `ul`/`ol` (ladder), with `data-name`, `data-zone-layout` and `data-align`.
- `composition-errors.ts`: `group-invalid`.
- Skeleton `dimensions/metadata.css`: `[data-zone-layout="ladder"]:not([data-sequence])` (reset, column). `runes/cast.css` loses its list flex-column rule. `plugins/business/src/tags/cast.ts` stamps `data-zone-layout="ladder"` on the items list in `list` mode.
- Tests: `packages/runes/test/composition-group.test.ts`.
- Docs: the composed-runes guide (vocabulary row, a `{% group %}` section with the D9 rule, the Errors row) and theme-authoring `blocks-and-layout.md` (`ladder`).

### Notes
- D9 as built: a slot-placed node carries its owner and slot name across any boundary (SPEC-145 D10a), so slots are already safe inside a placed `{% bar %}`. The hazard that remains is a rune the template itself places, matched by a `children` row; the test asserts on that.
- A group placed inside a placed rune takes that rune's BEM element class (e.g. `rf-section__steps`), as any `data-name` descendant does.
- Contracts are unchanged: they do not describe `data-zone-layout` on cast's list.

{% /work %}
