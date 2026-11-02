{% work id="WORK-692" status="in-progress" priority="medium" complexity="moderate" source="SPEC-186" tags="content-model, resolver, composition" milestone="v0.47.0" %}

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

{% /work %}
