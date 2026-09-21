---
'@refrakt-md/plan': minor
---

Prevent duplicate plan IDs before the merge that creates them, and renumber
them when it can be proved what every reference meant.

```bash
refrakt plan validate --against origin/main
refrakt plan migrate ids --apply --git
```

`plan validate` already reported duplicates at error severity. It could only do
so once **both** claimants were reachable — after the merge, when every
`{% ref %}` to that ID had already become ambiguous. `--against <ref>` fires one
step earlier, on the branch, comparing the IDs you claim against those the base
ref spends. A ref that cannot be resolved fails loudly rather than reporting a
clean run.

`plan migrate ids` joins the `filenames` / `pr-attrs` / `dependencies` family —
dry-run by default, `--apply` writes, `--git` stages. It renumbers an entity's
`id`, its filename and its self-references, and rewrites `{% ref %}`,
`{% xref %}`, `source=` and `supersedes=`.

**It refuses when anything outside the moved entity references the colliding
ID**, naming each blocking reference with file and line. Once two files share an
ID there is no way to establish which one a reference meant, and repointing one
at the wrong entity is silent and permanent.

The duplicate-ID finding now names `plan migrate ids` as its fix, matching how
the filename findings name theirs.
