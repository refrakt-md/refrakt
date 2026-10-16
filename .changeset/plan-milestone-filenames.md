---
'@refrakt-md/plan': patch
---

`refrakt plan create milestone --id v1.2.0 --title "…"` now writes `milestones/v1.2.0.md`. It used to name the file after the title (`milestones/<title-slug>.md`), contrary to the convention that a milestone's filename is its name, and two milestones with the same title could not both be created. `plan init`, and so `create-refrakt --type plan`, now writes its example milestone as `milestones/v0.1.0.md` instead of `milestones/first-release.md`.

`refrakt plan migrate filenames` now renames a milestone whose filename is not `<name>.md`, so a plan directory that picked up title-named milestones can be repaired with `--apply --git`. It used to skip milestones entirely. Its result no longer has a `skipped.milestones` count; milestones are counted under `skipped.alreadyCorrect` or planned like any other file.
