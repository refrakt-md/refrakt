---
"@refrakt-md/plan": patch
---

`refrakt plan init` no longer scaffolds the root `index.md`, type-level `index.md` pages (`work/index.md`, `specs/index.md`, etc.), or status filter pages (`work/ready.md`, `work/in-progress.md`, `specs/accepted.md`, etc.). The plan site already synthesises these dynamically during `refrakt plan serve` / `refrakt plan build`: `generateStatusFilterPages` emits one page per actually-existing status (strictly better than the hardcoded subset init used to seed), and the dashboard falls back to an auto-generated overview when `index.md` is absent. The scaffolded placeholders added noise without adding value.

If you want a custom dashboard, drop your own `plan/index.md` — the site will use it instead of the auto-generated one.
