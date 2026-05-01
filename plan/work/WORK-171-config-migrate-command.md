{% work id="WORK-171" status="draft" priority="low" complexity="simple" tags="cli, config, migration" source="ADR-010" milestone="v0.11.0" %}

# Add `refrakt config migrate` command

Add a small migration command that rewrites a flat-shape `refrakt.config.json` into the nested form (`site.*` and explicit `plugins`). Optional for users — the flat shape stays valid indefinitely — but useful for projects adopting the unified config or moving to multi-site.

## Acceptance Criteria

- [ ] New command `refrakt config migrate` (handled in `packages/cli/src/commands/config.ts`)
- [ ] By default, prints the proposed migration as a unified diff to stdout without modifying the file
- [ ] `--apply` writes the migrated config back to disk (preserving file path)
- [ ] `--to <shape>` accepts `nested` (default — flat → singular `site`) or `multi-site` (singular `site` → `sites.<name>`); `--to multi-site` requires `--name <name>`
- [ ] Migration is idempotent — running on an already-migrated file is a no-op
- [ ] When the source file declares both `site` and `sites`, the command refuses to migrate and explains the conflict
- [ ] `plugins` field is populated from the project's installed `@refrakt-md/*` packages on first migration if absent (with a comment in the diff explaining the source)
- [ ] Tests cover: flat → nested, singular → multi-site, idempotent re-run, conflict refusal, dry-run vs `--apply`

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

{% /work %}
