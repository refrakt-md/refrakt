---
'@refrakt-md/cli': minor
---

Add `refrakt config validate` — the config-resolution layer on its own.

```bash
refrakt config validate
refrakt config validate --site main
refrakt config validate --format json
```

Checks that `refrakt.config.json`'s names resolve — the theme package and every
entry in `plugins[]` — which is the half the published JSON Schema cannot cover,
since it validates shape rather than resolution.

It sits beside the `refrakt config migrate` that already exists, and runs the
same layer `refrakt validate` runs first, narrowed to that layer rather than
reimplemented. A test pins the two commands to identical findings for the same
project.

This completes WORK-579: the theme-authoring checks moved to
`refrakt theme validate`, and the config layer now has its own entry point.
