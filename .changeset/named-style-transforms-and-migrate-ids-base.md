---
'@refrakt-md/transform': minor
'@refrakt-md/runes': patch
'@refrakt-md/marketing': patch
'@refrakt-md/learning': patch
'@refrakt-md/media': patch
'@refrakt-md/storytelling': patch
'@refrakt-md/plan': minor
---

Rune configs are now plain data, and `plan migrate ids` keeps the published claimant (WORK-608, WORK-607)

**Breaking: `styles[…].transform` takes a name, not a function** (WORK-608).
Use one of the named transforms already used by meta fields and structure
entries. That vocabulary now has three more entries:

- `align`: an alignment keyword becomes a CSS `align-*` value (was `resolveValign`).
- `fr`: `"2 1"` becomes `2fr 1fr` (was `ratioToFr`).
- `gap`: a gap preset becomes a spacing token (was `resolveGap`).

The type is exported as `NamedTransform`. Replace
`transform: resolveValign` with `transform: 'align'`. The helpers stay exported.
After this change `postTransform` is the only function a `RuneConfig` carries,
so a rune config can cross a JSON boundary. A test checks every core and plugin
rune for this. Structure contracts now record these transform names; before,
`JSON.stringify` silently dropped them because they were functions. Rendered
output is unchanged.

**`plan migrate ids --against <ref>`** (WORK-607, BUG-026). When two files
claim one ID, the one already on the base ref keeps it, and the branch-local
claimant is renumbered. Before this, the claimant that moved was picked by
sorting filenames, which could renumber the entity already referenced from
merged commits and published CHANGELOGs. Without `--against`, a collision is
now refused rather than resolved by filename. Every renumber and refusal names
the claimant that kept the ID and why. `plan validate --against` now suggests
the matching `migrate ids --against` command.
