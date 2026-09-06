{% work id="WORK-530" status="ready" priority="medium" complexity="moderate" source="SPEC-125" tags="runes,config,sections,storytelling" milestone="v0.31.0" %}

# Correct section roles — storytelling runes

Six runes in `plugins/storytelling`, in two families of three that will almost
certainly resolve the same way as each other:

| Rune | Missing |
|---|---|
| `Character`, `Realm`, `Faction` | `body` role |
| `CharacterSection`, `RealmSection`, `FactionSection` | header-ish role |

Grouped into one item because they are the same pattern three times over: the
three entity runes share a shape, and the three `*Section` child runes share
another. A judgement made for one should hold for its siblings, and making it
once is the point of grouping them.

## Acceptance Criteria

- [ ] The three entity runes are assessed together; the decision and its
      reasoning apply consistently across them, or the divergence is explained
- [ ] The three `*Section` child runes are assessed together on the same terms
- [ ] Corrections are applied only where the role genuinely belongs
- [ ] Each correction has a test asserting the new `data-section` and, for a
      `body` role, that `reading`/`dropcap` land on it
- [ ] The rendered-output change for each rune is enumerated in the resolution
- [ ] `refrakt contracts` is regenerated; the affected `unavailable` entries
      disappear and nothing else moves
- [ ] A changeset records the visible change for theme authors
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

Worth a specific look: the `*Section` child runes are *sections of* an entity
rune, so "does this have a page-section header" is a different question for them
than for a top-level rune. `prominence` scales a page-section header — on a child
section that may be the wrong axis entirely, in which case the honest answer is
to leave the role off and let the contract keep recording it as unavailable.

`Realm` also has a media section already (`plugins/storytelling` styles
`[data-section="media"]` in `realm.css`), so it is the one entity rune where a
new `body` role interacts with existing role-based CSS. Check that pairing
visually.

## Blocked by
- {% ref "WORK-528" /%}

## References

- {% ref "SPEC-125" /%} — Phase 1, Direction 1
- {% ref "SPEC-107" /%} — prominence

{% /work %}
