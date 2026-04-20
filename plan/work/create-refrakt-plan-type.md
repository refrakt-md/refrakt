{% work id="WORK-157" status="ready" priority="medium" complexity="moderate" tags="create-refrakt, cli, plan, onboarding, dx" source="SPEC-042" %}

# Add `--type plan` to create-refrakt

Add a planning-only scaffold option to `create-refrakt` that produces a minimal `package.json` + `.gitignore` and delegates the `plan/` tree creation to `refrakt plan init`. Single-command entry point for users who want refrakt just for plan management.

## Acceptance Criteria

- [ ] `--type` accepts `plan` as a third value (alongside existing `site` and `theme`) in `packages/create-refrakt/src/bin.ts`
- [ ] Non-interactive: `npx create-refrakt my-plan --type plan` scaffolds `my-plan/` with `package.json`, `.gitignore`, and the full `plan/` tree produced by `refrakt plan init plan`
- [ ] Scaffolded `package.json` lists only `@refrakt-md/cli` and `@refrakt-md/plan` under `devDependencies` (no `@refrakt-md/runes`, `@refrakt-md/transform`, `@refrakt-md/lumina`, or framework adapters); versions derived at runtime from `create-refrakt`'s own `package.json`
- [ ] Scaffolded `package.json` includes `plan`, `plan:next`, `plan:status`, `plan:validate` scripts pointing at `refrakt plan …`
- [ ] No `README.md` is created at the project root — `plan/INSTRUCTIONS.md` and `plan/AGENTS.md` (written by `plan init`) cover documentation
- [ ] Interactive mode: when `--type` is not supplied and stdout is a TTY, "Planning only" appears as a third choice alongside "Site" and "Theme"; selecting it skips the framework prompt
- [ ] `--type plan` combined with `--target`, `--theme`, or `--scope` prints a clear error and exits non-zero
- [ ] `create-refrakt --help` documents the `plan` value for `--type` with an example
- [ ] Completion message documents `npx refrakt plan next`, `npm run plan:status`, and a pointer to plan docs
- [ ] `@refrakt-md/plan` added to `packages/create-refrakt/package.json` dependencies; init is invoked programmatically via the plan package's exported init function
- [ ] Tests in `packages/create-refrakt/test/` cover: scaffold file layout, generated `package.json` shape, rejection of `--type plan --target astro` / `--theme …` / `--scope …`, interactive choice rendering
- [ ] Running `npm install && npx refrakt plan next` in a freshly scaffolded project succeeds and prints the example work item

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

{% /work %}
