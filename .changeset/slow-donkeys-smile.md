---
'@refrakt-md/cli': minor
---

**Breaking (pre-1.0):** `refrakt validate`'s `--config` and `--manifest` flags
have moved to `refrakt theme validate`.

They validate **theme-authoring** artifacts — a `ThemeConfig` and a theme
manifest — under a name that reads like a **site-authoring** one. `theme`
already holds `install`, `info` and `list`, so they slot in beside them:

```bash
refrakt theme validate --config ./theme.config.json
refrakt theme validate --manifest ./manifest.json
```

Passing `--config` or `--manifest` to the bare command now errors and names
where the flag went. They are retired rather than aliased through a deprecation
window: pre-1.0, and the behaviour they hung off was close to a no-op.

**`refrakt validate` no longer validates `baseConfig`.** With no arguments it
used to validate refrakt's own built-in theme config and print a checkmark — in
a user's project, a self-test of the library reported as though it were a check
of their work. It now reports that it validated nothing and exits non-zero.
Site validation — config resolution, then content, for every site in
`refrakt.config.json` — lands in the next release of this milestone.

`refrakt theme validate` with no arguments does the same rather than falling
back to `baseConfig`: a validation command must never report success on nothing.
