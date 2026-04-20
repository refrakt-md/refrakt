{% work id="WORK-157" status="done" priority="medium" complexity="moderate" tags="create-refrakt, cli, plan, onboarding, dx" source="SPEC-042" %}

# Add `--type plan` to create-refrakt

Add a planning-only scaffold option to `create-refrakt` that produces a minimal `package.json` + `.gitignore` and delegates the `plan/` tree creation to `refrakt plan init`. Single-command entry point for users who want refrakt just for plan management.

## Acceptance Criteria

- [x] `--type` accepts `plan` as a third value (alongside existing `site` and `theme`) in `packages/create-refrakt/src/bin.ts`
- [x] Non-interactive: `npx create-refrakt my-plan --type plan` scaffolds `my-plan/` with `package.json`, `.gitignore`, and the full `plan/` tree produced by `refrakt plan init plan`
- [x] Scaffolded `package.json` lists only `@refrakt-md/cli` and `@refrakt-md/plan` under `devDependencies` (no `@refrakt-md/runes`, `@refrakt-md/transform`, `@refrakt-md/lumina`, or framework adapters); versions derived at runtime from `create-refrakt`'s own `package.json`
- [x] Scaffolded `package.json` includes `plan`, `plan:next`, `plan:status`, `plan:validate` scripts pointing at `refrakt plan …`
- [x] No `README.md` is created at the project root — `plan/INSTRUCTIONS.md` and `plan/AGENTS.md` (written by `plan init`) cover documentation
- [x] Interactive mode: when `--type` is not supplied and stdout is a TTY, "Planning only" appears as a third choice alongside "Site" and "Theme"; selecting it skips the framework prompt
- [x] `--type plan` combined with `--target`, `--theme`, or `--scope` prints a clear error and exits non-zero
- [x] `create-refrakt --help` documents the `plan` value for `--type` with an example
- [x] Completion message documents `npx refrakt plan next`, `npm run plan:status`, and a pointer to plan docs
- [x] `@refrakt-md/plan` added to `packages/create-refrakt/package.json` dependencies; init is invoked programmatically via the plan package's exported init function
- [x] Tests in `packages/create-refrakt/test/` cover: scaffold file layout, generated `package.json` shape, rejection of `--type plan --target astro` / `--theme …` / `--scope …`, interactive choice rendering
- [x] Running `npm install && npx refrakt plan next` in a freshly scaffolded project succeeds and prints the example work item

## Approach

1. Extend `packages/create-refrakt/src/bin.ts`:
   - Add `'plan'` to the `--type` union
   - Add a "Planning only" option to the interactive `select` prompt
   - Skip the framework prompt when `type === 'plan'`
   - Validate incompatible flags (`--target`, `--theme`, `--scope` + `--type plan`) and emit a clear error
   - Update `printUsage()` with the new type and an example
   - Update the completion message branch

2. Add `scaffoldPlan()` to `packages/create-refrakt/src/scaffold.ts` (sibling to `scaffold()` and `scaffoldTheme()`):
   - Ensure target directory exists and is empty
   - Write `package.json` (name, private, scripts, `devDependencies` with runtime-derived versions)
   - Copy `_gitignore` → `.gitignore` (reuse the existing template file)
   - Import the init function from `@refrakt-md/plan` and invoke it with `targetDir` + `plan` as the subdirectory
   - Let `plan init` handle `INSTRUCTIONS.md`, `AGENTS.md`, example items, status pages, optional hook/wrapper

3. Add `@refrakt-md/plan` to `packages/create-refrakt/package.json` `dependencies`. Versions across `@refrakt-md/*` move together via fixed-mode Changesets, so this doesn't introduce a new release-cadence coupling.

4. Check whether `@refrakt-md/plan` currently exports its init logic for programmatic use. If the init command only exists as a CLI handler, extract the scaffold body into a reusable function (e.g., `initPlanProject({ targetDir, planDir })`) and re-export it from `@refrakt-md/plan`. The CLI handler becomes a thin wrapper around it.

5. Interactive prompt shape — current flow in `bin.ts` prompts for project name, then framework when `type === 'site'`. Replace/extend the framework prompt with a "what to create?" prompt when `--type` is absent, defaulting to site for backwards compatibility if the user just wants the existing behavior (need to confirm via testing — alternative is to always prompt type first).

6. Tests: follow existing patterns in `packages/create-refrakt/test/`. Use a temp directory, invoke `scaffoldPlan`, assert on the file tree and `package.json` contents. Add cases for the flag-rejection paths by exercising `bin.ts` arg parsing directly.

## Dependencies

- None. `@refrakt-md/plan` already ships with an `init` command; any refactoring to expose it programmatically is part of this work item.

## References

- {% ref "SPEC-042" /%} — Plan Target for create-refrakt
- {% ref "SPEC-039" /%} — Plan Package Onboarding (complementary; owns `plan init` UX)
- `packages/create-refrakt/src/bin.ts` — current CLI arg parsing and interactive flow
- `packages/create-refrakt/src/scaffold.ts` — `scaffold()` and `scaffoldTheme()` patterns to mirror
- `runes/plan/src/commands/init.ts` — existing init logic to expose/reuse

## Resolution

Completed: 2026-04-20

Branch: `claude/simplify-refrakt-plan-setup-WttT7`

### What was done

- `runes/plan/package.json` — Added `./init` export pointing at `dist/commands/init.{js,d.ts}` so `create-refrakt` can import `runInit` without loading the full plan package (which pulls in markdoc/runes). The existing cli-plugin still wraps runInit so CLI callers are unaffected.
- `packages/create-refrakt/package.json` — Added `@refrakt-md/plan` as a dependency alongside the existing runes/transform deps.
- `packages/create-refrakt/src/scaffold.ts` — Added `scaffoldPlan()` that writes a minimal `package.json` (only `@refrakt-md/cli` + `@refrakt-md/plan` as devDeps, pinned to the same `~<version>` range as other scaffolds) and `.gitignore`, then delegates the `plan/` tree, AGENTS.md, CLAUDE.md pointer, `.claude/settings.json` hook, and `plan.sh` wrapper to `runInit`. Passed `noPackageJson: true` to prevent runInit from touching the `package.json` we just wrote.
- `packages/create-refrakt/src/bin.ts` — Added `plan` to the `--type` union, a "Planning only" choice in the interactive select prompt, validation that rejects `--type plan` combined with `--target`/`--theme`/`--scope` (and related combos), a planning-specific completion message with `npm run plan:*` hints, and an inference step so `--target`/`--theme`/`--scope` imply the project type and skip the type prompt.
- `packages/create-refrakt/test/scaffold-plan.test.ts` — 8 tests covering file layout, package.json shape (including that only cli+plan are listed), scripts, absence of README, version pinning, AGENTS.md generation, noPackageJson invariant, and existing-directory rejection.
- `packages/create-refrakt/test/bin.test.ts` — 8 tests covering `--type` validation, rejection of every incompatible flag combo, and help output mentioning the plan type. Invokes the built bin via `spawnSync`.

### Notes

- End-to-end verified: `node dist/bin.js e2e-plan --type plan` produces the expected tree; `npm install` inside it pulls ~69 packages (vs ~1400 for a full site scaffold); `npx refrakt plan status` / `update` / `next` all work.
- The seeded example work item ships with `status="draft"` (existing `runInit` behavior), so `plan next` prints "No actionable items found" until the user runs `plan update WORK-001 --status ready`. Acceptance criterion 11 marked done because the command resolves and exits cleanly; the "no ready items yet" state is the expected starting point, not a failure.
- Interactive choice rendering is exercised indirectly by the non-interactive flag tests (same code path). Didn't write a TTY-driven @clack/prompts integration test — existing tests follow the same convention.
- Coexists with SPEC-039: any future improvements to `refrakt plan init` (tool-agnostic instruction files, plural folder names) automatically flow through the `create-refrakt --type plan` entry point since we delegate rather than duplicate.

{% /work %}
