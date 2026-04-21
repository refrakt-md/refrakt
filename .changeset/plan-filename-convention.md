---
"@refrakt-md/plan": minor
---

Adopt `{ID}-{slug}.md` as the canonical filename for plan items. `refrakt plan create` now emits e.g. `WORK-058-my-task.md` instead of `my-task.md` for every auto-ID type (work, bug, spec, decision). Milestones still use their semver names (`v1.0.0.md`).

**New command.** `refrakt plan migrate filenames` renames legacy slug-only files in existing projects:

```bash
# Preview renames (default)
refrakt plan migrate filenames

# Apply them; --git uses `git mv` to preserve history
refrakt plan migrate filenames --apply --git
```

The command skips milestones, skips files that already match, reports missing frontmatter IDs, and detects collisions before touching the filesystem.

**Validator warning.** `refrakt plan validate` now emits a `filename-missing-id` / `filename-id-mismatch` warning when a file's name doesn't match its frontmatter `id`. The message points at the migrate command as the one-line fix. Adoption is voluntary — the check is a warning, not an error, so existing projects keep building until they choose to migrate.
