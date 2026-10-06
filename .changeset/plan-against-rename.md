---
'@refrakt-md/plan': patch
---

Fix `plan validate --against` reporting a renamed plan entity as an ID collision.

`collisionsFrom` compared the two sides' **slugs** with the ID prefix stripped, so it
forgave only a rename that kept its slug and moved directory. A slug change — the
ordinary rename, since the slug is derived from the title — was reported as a
collision. That fires on any title edit to an existing entity, and on
`plan validate --against` after `plan migrate filenames --apply` renames files
wholesale.

The check now tests what its own contract describes: **a collision is two claimants
surviving the merge.** If the base's path is absent from the working tree, the merge
applies the deletion and one claimant remains, so it is not reported. `collisionsFrom`
takes the repo root to make that test.

Nothing is weakened. A new file claiming an ID whose base file *survives* is still
flagged, and two files claiming one ID in the same tree is still an error from
`checkDuplicateIds`, which runs before this.

What this deliberately does not catch is an ID *reused* for a different entity — the
base's file deleted, a new one written under the same ID. That also leaves one
claimant, so it is not a collision, but it silently repoints every reference to it.
Detecting that needs content rather than paths, and it is not a reason to block a
merge; a test pins the distinction so it stays deliberate.

The misreport was also actively dangerous, because the error text advises
`plan migrate ids --apply --git`. Run against a rename, that renumbers a legitimate
entity and breaks every reference to it.
