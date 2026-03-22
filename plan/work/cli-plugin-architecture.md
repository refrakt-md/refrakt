{% work id="WORK-027" status="ready" priority="high" complexity="moderate" tags="cli, architecture, plan" %}

# CLI Plugin Discovery Architecture

> Ref: SPEC-022 (Plan CLI — Plugin Registration section)

## Summary

Enable the refrakt CLI to discover and load commands from installed packages. Currently all commands are hardcoded in `packages/cli/src/bin.ts`. This adds a plugin system so `@refrakt-md/plan` (and future packages) can register subcommands under a namespace (`refrakt plan <cmd>`).

When a plugin package is not installed, the CLI prints install instructions and exits cleanly. The same pattern could be reused by `@refrakt-md/docs` (`refrakt docs`) or `@refrakt-md/storytelling` (`refrakt story`) in the future.

## Acceptance Criteria

- [ ] CLI discovers installed packages that export a `cli-plugin` entry point
- [ ] Plugin commands are registered under their declared namespace (`refrakt plan <cmd>`)
- [ ] When a plugin package is not installed, CLI prints install instructions and exits
- [ ] `@refrakt-md/plan` exports `cli-plugin.ts` with command registrations for all 8 commands
- [ ] Existing commands (inspect, contracts, validate, etc.) are unaffected
- [ ] Tests for plugin discovery, registration, and missing-package fallback

## Approach

Add a plugin discovery step to `packages/cli/src/bin.ts` that runs after built-in command matching fails. Check for a `cli-plugin` export from known package prefixes (`@refrakt-md/*`). Each plugin exports a `{ namespace, commands }` object. Route `refrakt <namespace> <subcommand>` to the matching handler.

The `@refrakt-md/plan` package adds a `cli-plugin.ts` entry point alongside its existing rune exports.

## References

- SPEC-022 (Plan CLI)
- `packages/cli/src/bin.ts` (current CLI entry point)

{% /work %}
