{% work id="WORK-171" status="done" priority="low" complexity="simple" tags="cli, config, migration" source="ADR-010" milestone="v0.11.0" %}

# Add `refrakt config migrate` command

Add a small migration command that rewrites a flat-shape `refrakt.config.json` into the nested form (`site.*` and explicit `plugins`). Optional for users — the flat shape stays valid indefinitely — but useful for projects adopting the unified config or moving to multi-site.

## Acceptance Criteria

- [x] New command `refrakt config migrate` (handled in `packages/cli/src/commands/config.ts`)
- [x] By default, prints the proposed migration as a unified diff to stdout without modifying the file
- [x] `--apply` writes the migrated config back to disk (preserving file path)
- [x] `--to <shape>` accepts `nested` (default — flat → singular `site`) or `multi-site` (singular `site` → `sites.<name>`); `--to multi-site` requires `--name <name>`
- [x] Migration is idempotent — running on an already-migrated file is a no-op
- [x] When the source file declares both `site` and `sites`, the command refuses to migrate and explains the conflict
- [x] `plugins` field is populated from the project's installed `@refrakt-md/*` packages on first migration if absent (with a comment in the diff explaining the source)
- [x] Tests cover: flat → nested, singular → multi-site, idempotent re-run, conflict refusal, dry-run vs `--apply`

## Approach

1. `runConfigMigrate(args)` reads the raw config (not the normalized form — we need the original shape), applies the requested transform, and either prints a diff or writes the result.

2. Use a minimal diff library (or hand-roll line diff — the file is small) for the dry-run output.

3. JSON formatting: preserve tabs/spaces by sniffing the source file's indentation before re-serializing.

## Dependencies

- {% ref "WORK-159" /%} — needs the loader to expose the raw config alongside the normalized form
- {% ref "WORK-160" /%} — for plugin enumeration when populating `plugins`

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config (Migration section)
- `packages/cli/src/config-file.ts` — current loader and writer

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/cli/src/commands/config.ts` (new) — `runConfigCommand` dispatches the `config` namespace; `migrate` subcommand handles flat → nested and singular → multi-site transformations.
- Default behavior is dry-run: prints a line-based diff to stdout showing what would change. `--apply` writes the result back.
- `--to <shape>` selects between `nested` (default, flat → `site`) and `multi-site` (singular `site` → `sites.<name>`); `--to multi-site` requires `--name`.
- Idempotent: running on an already-migrated config logs "No changes needed" and exits cleanly.
- Refuses to migrate when the source declares both `site` and `sites` (clear error explaining the conflict).
- On flat → nested migration, `plugins` is auto-populated from `discoverPlugins()` if absent — gives users a working plugin list immediately. Discovery failures are non-blocking.
- JSON indent style is sniffed from the original file before re-serializing so formatting is preserved.
- `packages/cli/src/bin.ts` — Wired `config` into the dispatch and added it to the static `--help` text.
- `packages/cli/test/config-migrate.test.ts` (new) — 9 tests: flat → nested dry run, flat → nested with --apply, multi-site requires --name, singular → multi-site, idempotent re-run, conflict refusal (both site and sites), missing config error, multi-site refuses flat shape, --help mentions config command.

### Notes

- The diff output is line-based and not a real git-diff implementation. The aim is "a human can see what changed" for short JSON files. If users start migrating very large configs we could swap to a real diff library, but for now this keeps the dependency footprint zero.
- Skipped a `--to flat` reverse migration — there's no use case for moving back to the legacy flat shape and we'd have to deal with the `plugins` field which has no flat-shape equivalent.
- All 2295 tests pass.

{% /work %}
