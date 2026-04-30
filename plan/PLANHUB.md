# Plan Hub overrides

This file refines [`plan/INSTRUCTIONS.md`](./INSTRUCTIONS.md) for projects that
use Plan Hub (the server-backed companion to the local `refrakt plan` workflow).
When this file is present, the overrides below take precedence over the local
equivalents; the rest of `plan/INSTRUCTIONS.md` still applies unchanged.

This file was scaffolded by `refrakt planhub init` (per ADR-011). Re-running
that command with `--force` regenerates it.

## Command overrides

### Reserving an entity ID — use `refrakt planhub next-id`

Use `refrakt planhub next-id <type>` instead of `refrakt plan next-id <type>`
to avoid cross-branch ID conflicts. The local command only scans files in
your working tree; the server-backed lookup considers every branch the Plan
Hub installation has indexed, so two contributors creating items in parallel
cannot collide on the same ID.

```bash
# Print just the ID (pipe-friendly)
refrakt planhub next-id work

# Or get a structured response
refrakt planhub next-id work --format json
```

**Auth.** Public repos work with no token at all. Private repos need either
a stored device-flow session (`refrakt planhub login`) or a `PLAN_HUB_TOKEN`
env var carrying the `entities:read` scope. The command tries
unauthenticated first and only authenticates if the server returns 401, so
agents on public repos do not need any setup.

## Push after plan mutations

When Plan Hub is configured, push to the remote **immediately** after any
command that mutates plan content — status transitions, criterion checks,
resolutions, and new item creation. This ensures the Plan Hub dashboard
reflects progress in near-real-time rather than waiting for a batch push
at the end of a session.

Only auto-push commits that are purely plan mutations (files under `plan/`).
Do not force-push mixed code + plan commits — those follow the normal PR
workflow instead. Use `git pull --rebase` before pushing to avoid conflicts
on busy repos.

```bash
# Example: update status then push
refrakt plan update WORK-042 --status in-progress
git add plan/ && git commit -m "plan: start WORK-042" && git push
```

Use the `plan:` commit-message prefix for these commits to keep them easy to
filter in the log.

## Reserved for future overrides

Subsequent planhub commands that supersede a local equivalent (e.g. agent
heartbeat, MCP-driven mutation paths) will land in this file alongside the
override above. No design or location changes expected — see ADR-011.
