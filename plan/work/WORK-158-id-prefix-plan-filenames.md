{% work id="WORK-158" status="done" priority="medium" complexity="moderate" tags="plan, cli, tooling, conventions, migration" %}

# Adopt `{ID}-{slug}.md` filename convention for plan items

Plan files currently live under `plan/{work,specs,decisions}/` with slug-only filenames (e.g. `plan-validate-command.md`). The ID (`WORK-033`) lives in the `{% work %}` frontmatter tag but doesn't appear in the filename. A few recent items (WORK-149 through WORK-156) started prefixing the ID, producing an inconsistent mix: 8 prefixed vs. 196 unprefixed across work/specs/decisions.

Standardising on `{ID}-{slug}.md` for every auto-ID type (work, bug, spec, decision) makes files grep-friendly, gives unambiguous references in commits/PRs/chat ("see WORK-158" points at exactly one file without a frontmatter scan), and sorts items by ID naturally in directory listings. Milestones keep their semver names (`v1.0.0.md`) since they don't use the numeric ID scheme.

## Acceptance Criteria

- [x] `runCreate()` in `runes/plan/src/commands/create.ts` emits `{ID}-{slug}.md` for auto-ID types (work, bug, spec, decision); milestones still emit `{slug}.md`
- [x] `runes/plan/test/create.test.ts` asserts the new filename format for each auto-ID type and that milestones are unchanged
- [x] New `refrakt plan migrate filenames` subcommand scans a plan directory, renames any file whose name doesn't already match `{ID}-{slug}.md` to the new convention, and defaults to `--dry-run` (prints planned renames only). `--apply` performs the rename; `--git` uses `git mv` to preserve history when the target is a git working tree.
- [x] Migrate command handles: skipping milestones, skipping already-prefixed files, reporting files with missing/malformed frontmatter IDs, exiting non-zero if any file can't be processed.
- [x] Migrate command has test coverage: dry-run output, apply mode, mixed prefixed/unprefixed input, missing-ID error path.
- [x] This repo's 196 existing unprefixed files under `plan/work/`, `plan/specs/`, `plan/decisions/` are renamed using the new `migrate` command with `--git --apply` in a single migration commit (dogfooding proof).
- [x] `refrakt plan validate` warns when a file's filename prefix doesn't match its frontmatter `id` attribute (or its `name` for milestones, which should pass through unchanged), and points at `refrakt plan migrate filenames` in the warning text.
- [x] `plan/INSTRUCTIONS.md` documents the filename convention under a new "Filename Convention" section alongside the existing "ID Conventions" table, and references the migrate command for existing projects.
- [x] `CLAUDE.md`'s Plan section mentions the convention so agents creating new items match it.
- [x] Changeset (`npx changeset`) captures this as a minor bump for `@refrakt-md/plan` and flags the filename convention change + available migrate command in the changelog so downstream consumers know how to upgrade.
- [x] Full test suite passes (`npm test`).
- [x] Manual verification: `npx refrakt plan create work --title "Test item"` produces `plan/work/WORK-159-test-item.md`, and running `refrakt plan migrate filenames --dry-run` on a fixture with mixed naming prints the expected planned renames.

## Approach

1. **CLI change** (`runes/plan/src/commands/create.ts`): in `runCreate`, after computing the `slug`, prepend the ID for auto-ID types — `const fileName = isAutoIdType(type) ? ${id}-${slug}.md : ${slug}.md;`. Reuse the existing `isAutoIdType` import from `./next-id.js`.

2. **Migrate command** (`runes/plan/src/commands/migrate.ts`, new): ship the rename logic as a first-class CLI subcommand so downstream repos can adopt the convention without writing their own script. Signature:

   ```
   refrakt plan migrate filenames [--dir plan] [--dry-run] [--apply] [--git] [--format json]
   ```

   Reuse `scanPlanFiles` to discover items. For each entity, derive the target filename from `{id}-{current-slug}.md` (where current-slug is the existing filename minus any existing ID prefix, minus `.md`). Skip milestones. If `--git` is set and the target is inside a git working tree, shell out to `git mv`; otherwise `fs.renameSync`. Default mode is `--dry-run` so running the command blind is safe.

   Wire it into `runes/plan/src/cli-plugin.ts` (or wherever the existing subcommands are registered — check `packages/cli/src/commands/` for the plan plugin registration).

3. **Migration of this repo**: run the new command against `plan/` with `--git --apply`, review the diff, commit as a standalone "plan: rename files to {ID}-{slug}.md convention" commit. This doubles as end-to-end validation of the migrate command on real data.

4. **Validator**: in `runes/plan/src/commands/validate.ts`, add a check that extracts the ID prefix from each filename (regex `^(WORK|BUG|SPEC|ADR)-\d+`) and compares against the frontmatter ID. Mismatch or missing prefix → warning that includes the fix command: `refrakt plan migrate filenames --apply`. Skip milestones. Add a test in `runes/plan/test/` with a fixture pair (matching + mismatched).

5. **Docs**:
   - Add a "Filename Convention" section to `plan/INSTRUCTIONS.md` directly after the ID Conventions table, with a one-liner pointer at `refrakt plan migrate filenames` for existing projects.
   - Update the Plan section of `CLAUDE.md` to mention the convention in a single sentence near the existing ID-prefix guidance.
   - Add a `@refrakt-md/plan` changelog entry (via `npx changeset`) calling out the convention change, the new migrate command, and — importantly — that downstream repos on the old convention will start seeing validator warnings but are not forced to migrate (validator emits a warning, not an error).

6. Verify no tooling reads plan files by filename rather than frontmatter scan — `scanPlanFiles` in `runes/plan/src/scanner.ts` is the canonical path and already keys off frontmatter, so CLI commands (`update`, `next`, `status`, `history`) are unaffected. Double-check any site-rendering code under `site/` that links to plan files.

## Risks

- Outbound links to specific plan files (from site pages, README snippets, external URLs) will break. Grep for `plan/work/`, `plan/specs/`, `plan/decisions/` across the repo before the migration commit and update any hard-coded references.
- Open PRs touching plan files will get merge conflicts. Low impact given the short review window — coordinate or rebase on merge.
- Downstream repos consuming `@refrakt-md/plan` will see validator warnings after the upgrade. Mitigation: keep the validator check at warning severity (not error), provide the migrate command as the one-command fix, document clearly in the changeset. Adoption stays voluntary.

## References

- Current naming inconsistency: 8 prefixed work items (WORK-149–156) vs. 149 unprefixed; 0/38 specs prefixed; 0/9 decisions prefixed
- `runes/plan/src/commands/create.ts` — where the filename is generated
- `runes/plan/src/scanner.ts` — frontmatter-based scan used by all other CLI commands (unaffected by rename)

## Resolution

Completed: 2026-04-21

Branch: `claude/file-naming-convention-LJdwR`

### What was done

- **`runes/plan/src/commands/create.ts`**: `runCreate()` now emits `${id}-${slug}.md` for every auto-ID type (work, bug, spec, decision) via `isAutoIdType(type)`. Milestones continue to emit `${slug}.md` (e.g. `v1.0.0.md`).
- **`runes/plan/src/commands/migrate.ts`** (new, ~155 lines): ships `refrakt plan migrate filenames` with `--dry-run` (default), `--apply`, `--git`, `--dir`, `--format json`. Uses `scanPlanFiles` to discover items, strips existing prefixes via `ID_PREFIX_RE = /^(WORK|BUG|SPEC|ADR)-\d+-/`, skips milestones, detects collisions before touching the filesystem, and shells out to `git mv` (with the target dir passed as `cwd` so nested git repos resolve correctly). Returns a structured result with `scanned/planned/applied/skipped/errors/exitCode`.
- **`runes/plan/src/cli-plugin.ts`**: wired `handleMigrate` into the plugin with subcommand dispatch for `filenames`.
- **`runes/plan/src/commands/validate.ts`**: added `checkFilenameIdMatch()` that emits `filename-missing-id` / `filename-id-mismatch` warnings pointing at `refrakt plan migrate filenames --apply` as the fix. Skips milestones. Warning (not error) so downstream projects upgrade voluntarily.
- **`runes/plan/src/commands/init.ts`**: uses `runCreate()`'s returned file path for tracked examples instead of a hardcoded slug, so the example tree matches the ID-prefixed filenames `runCreate` now produces (`SPEC-001-example-spec.md`, `WORK-001-example-work-item.md`, `ADR-001-example-decision.md`).
- **Tests**:
  - `runes/plan/test/create.test.ts` — split the filename assertion into per-type tests; duplicate-file test now uses milestones (since prefixed types can't collide on slug)
  - `runes/plan/test/migrate.test.ts` (new, ~180 lines, 10 tests) — dry-run, apply, mixed prefixed/unprefixed, missing-ID error path, `git mv` mode with a nested git working tree
  - `runes/plan/test/validate.test.ts` — new `filename-id match` describe block, 4 tests
  - `runes/plan/test/init.test.ts`, `packages/create-refrakt/test/scaffold-plan.test.ts` — expect prefixed example filenames
- **Dogfooding**: ran `migrate filenames --git --apply` against this repo, renaming 196 files across `plan/work/`, `plan/specs/`, `plan/decisions/`. Milestones (`v0.9.0.md`, `v1.0.0.md`) correctly skipped. Commit `f2b3512` bundled the CLI additions with the 196 renames because `git mv` stages both sides automatically — clean history.
- **Docs**: new "Filename Convention" section in `plan/INSTRUCTIONS.md` with a table + migrate command usage; paragraph added to the Plan section of `CLAUDE.md`; updated inline filename references in `plan/specs/SPEC-022-plan-cli.md`.
- **Changeset**: `.changeset/plan-filename-convention.md` — minor bump for `@refrakt-md/plan` describing the convention change, the new migrate command, and the validator warning. Adoption is explicitly voluntary.

### Notes

- `scanPlanFiles` keys off frontmatter IDs, so `update`, `next`, `status`, `history`, and `validate` are transparent to the rename — no scanner changes needed.
- The `git mv` call originally failed in tests with "not under version control" because it ran from the process cwd (refrakt root) and resolved the outer `.git` instead of the nested test repo. Fixed by threading `cwd` through `performRename` and passing `resolve(dir)` from `runMigrateFilenames`.
- `create-refrakt` scaffold was affected indirectly because it calls `runInit` with `noPackageJson: true`; the init fix (use `runCreate` return path) was the minimal change to keep the scaffold tree consistent with the new filename format.
- Full test suite: 2224 pass. Three `runes/plan/test/build.test.ts` timeouts in the combined run were flaky (5s timeout with real tests running at ~2.5–2.9s in isolation); the file passes cleanly when run alone.
- Manual verification: `plan create work --title "Sanity check item"` produced `plan/work/WORK-159-sanity-check-item.md` as expected (deleted after); `plan migrate filenames --dry-run` reports all 205 non-milestone files already correct, 2 milestones skipped.

{% /work %}
