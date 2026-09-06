{% work id="WORK-531" status="ready" priority="medium" complexity="simple" source="SPEC-125" tags="runes,config,sections,media,places" milestone="v0.31.0" %}

# Correct section roles — media and places runes

The two remaining slot/role mismatches, in different plugins and unrelated to
each other:

| Rune | Plugin | Missing |
|---|---|---|
| `Playlist` | `plugins/media` | `body` role |
| `ItineraryDay` | `plugins/places` | header-ish role |

Split from {% ref "WORK-529" /%} and {% ref "WORK-530" /%} only because they
share no family with those — not because they are harder.

## Acceptance Criteria

- [ ] Both runes are individually assessed: is the missing role an oversight, or
      is the slot deliberately not a semantic section?
- [ ] Corrections are applied only where the role genuinely belongs; a decision
      not to add one is recorded with its reasoning
- [ ] Each correction has a test asserting the new `data-section` and, for the
      `body` role, that `reading`/`dropcap` land on it
- [ ] The rendered-output change is enumerated in the resolution
- [ ] `refrakt contracts` is regenerated; the affected `unavailable` entries
      disappear and nothing else moves
- [ ] A changeset records the visible change if a role is added
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

`Playlist` is the one to think about rather than assume. A playlist body is a
track list — structured content the rune reinterprets, not authored prose. It may
well warrant the **structural** `body` role (it is the rune's main content
region, and Lumina's shared `[data-section="body"]` rules would apply) while
*not* being prose-bearing.

That is exactly the `DataTable` / `Showcase` shape, and the resolution is the
same: add the role if the region is structurally the body, and let
{% ref "WORK-537" /%} settle whether it bears prose. Do **not** withhold a correct
structural role to work around the overloaded meaning — that is the mistake
{% ref "SPEC-125" /%} Direction 2 exists to avoid.

## Blocked by
- {% ref "WORK-528" /%}

## References

- {% ref "SPEC-125" /%} — Phase 1, Direction 1; and Direction 2 for the overload
- {% ref "WORK-537" /%} — separates the prose capability from the structural role

{% /work %}
