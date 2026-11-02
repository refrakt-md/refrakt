{% work id="WORK-692" status="done" priority="medium" complexity="moderate" source="SPEC-186" tags="content-model, resolver, composition" milestone="v0.47.0" pr="refrakt-md/refrakt#757" %}

# A content model reads groups and claims a trailing node

SPEC-186 D1 and D3: a field may be a group, which matches all of its required members in order or takes nothing; and a field may claim its container's last node with `position: last`.

## Acceptance Criteria
- [x] A group matches when its required members match in order, takes nothing otherwise, and leaves the nodes it looked at for the next field (D1.1)
- [x] Group members may be optional; a group may be required or optional and may contain groups; member names resolve flat and must be unique across the model (D1.2–D1.4)
- [x] `position: last` reserves the container's last node when the field matches it, the fields before it reading the rest, and reserves nothing otherwise (D3)
- [x] At most one `position: last` field per model, and only as its last field; anything else is rejected at load
- [x] Composition definitions accept `group` and `position: last`, with load-time errors documented in the composed-runes guide (D6)

## References

- {% ref "SPEC-186" /%}: D1, D3, D6.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/types/src/content-model.ts`: `ContentFieldDefinition.group` and `position: 'last'`.
- `packages/runes/src/lib/resolver.ts`:
  - `takeField`, the single-field step factored out of `resolveSequence` with no change in behaviour;
  - `takeGroup`, which matches all-or-nothing, handles optional members and nested groups, and resolves members flat with the group's name set to `true`;
  - `resolveSequence` reserves the last significant node for a `position: last` field.
- `packages/runes/src/lib/composition.ts`:
  - `FIELD_KEYS` gains `group` and `position`;
  - `parseFields` parses groups recursively;
  - `checkModelFields` runs per top-level field list, with the codes `content-group-invalid`, `content-field-duplicate` and `content-position-invalid`;
  - `slotFields` flattens group members into slots.
- `packages/runes/src/reference.ts`: serialises and renders groups and `position: last`.
- `packages/runes/test/content-model-groups.test.ts`.
- Composed-runes guide: the "Groups" and "`position: last`" sections, and the three Errors rows.

### Notes
- A required group that fails takes nothing and drops nothing, which is D4.2's rule ahead of WORK-694. A required plain field still drops and reports its child until WORK-694 changes that.
- The load checks run for composition definitions. Native code models are not checked; the resolver honours `position: last` only on the last field.

{% /work %}
