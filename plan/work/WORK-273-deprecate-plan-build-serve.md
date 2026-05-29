{% work id="WORK-273" status="done" priority="low" complexity="simple" source="SPEC-071" tags="plan, cli, deprecation" milestone="v0.16.0" %}

# Deprecate plan build and serve commands

Mark `plan build` and `plan serve` deprecated, pointing users at the site approach, once refrakt's own plan site proves the replacement. Keep the authoring CLI. Removing the bespoke render stack is a later release, out of scope here.

## Acceptance Criteria
- [ ] `plan build` and `plan serve` print a deprecation notice pointing at `create-refrakt --type plan` (new projects) and the `entityRoutes` config (existing projects), then still run
- [ ] The authoring CLI (`create` / `next` / `update` / `validate` / `status` / `migrate` / `next-id` / `history`) is unchanged
- [ ] Migration documented; removal of `build` / `serve` + the bespoke render stack scheduled for a later release

## Dependencies
- WORK-272 (the replacement must be proven before deprecating)

## References

- {% ref "SPEC-071" /%} — Deprecation of plan build / serve

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- `plugins/plan/src/commands/build.ts` and `serve.ts`: print a deprecation notice on invocation pointing at `create-refrakt --type plan` and the `entityRoutes` config (SPEC-069/071), then still run. The authoring CLI (create/next/update/validate/status/migrate/next-id/history) is untouched.

### Notes
- Removal of `build`/`serve` and the bespoke render stack is scheduled for a later release (out of scope for this milestone), so existing users aren't broken.

{% /work %}
