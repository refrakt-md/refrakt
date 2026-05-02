{% work id="WORK-168" status="done" priority="high" complexity="moderate" tags="plan, config, dx" source="ADR-010" milestone="v0.11.0" %}

# Plan package consumes unified config (init scaffolds, serve/build read paths)

Wire `@refrakt-md/plan` to the unified `refrakt.config.json`. `plan init` scaffolds the config (creating it or extending an existing one with a `plan` section), and `plan serve` / `plan build` / other plan commands read `plan.dir` from the loaded config instead of relying solely on the `--dir` flag and defaults. The plan section currently exposes only `dir`; specs path remains derived from `dir` (a child folder), and surfacing it as a config field can come later if real-world projects demand it.

## Acceptance Criteria

- [x] `refrakt plan init` creates `refrakt.config.json` if absent, with a `{ "plan": { "dir": "plan" } }` section
- [x] If `refrakt.config.json` already exists without a `plan` section, `plan init` adds one (preserving formatting where reasonable)
- [x] If `refrakt.config.json` already has a `plan` section, `plan init` does not overwrite it (logs that the section is preserved)
- [x] `plan serve`, `plan build`, `plan validate`, `plan status`, `plan next`, `plan update`, `plan create`, `plan history` read `plan.dir` from the loaded config when no `--dir` flag is provided
- [x] Explicit `--dir` flag continues to override the config (highest precedence)
- [x] When neither config nor flag is set, current default behavior (`./plan`) is preserved
- [x] `plan init` output mentions the config file it created or modified
- [x] Tests cover: init creates config, init extends existing config without `plan` section, init preserves existing `plan` section, command reads config-declared paths, command --flag overrides config

## Approach

1. Add a `loadPlanConfig(cwd)` helper in `runes/plan/src/config.ts` that loads `refrakt.config.json` (if present), returns `{ dir }` from the `plan` section with the default `./plan` when missing.

2. Update each command's option-resolution to: argv flag → config value → default.

3. `plan init` gets a small JSON-aware editor — read existing file, parse, merge `plan` section, serialize with same indentation. Use the existing `writeRefraktConfigFile` helper from `packages/cli/src/config-file.ts` if it preserves formatting; if not, accept reformatting on first write and document it.

4. `create-refrakt --type plan` (WORK-157) already delegates to `plan init`, so the scaffolded planning-only project picks up the new config behavior automatically — verify in tests.

## Dependencies

- {% ref "WORK-159" /%} — needs the normalized loader and `PlanConfig` type

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config
- {% ref "SPEC-022" /%} — Plan CLI
- `runes/plan/src/commands/init.ts` — current init logic
- `runes/plan/src/cli-plugin.ts` — entry point

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `runes/plan/src/plan-config.ts` (new) — `resolvePlanDir(argFlag?, cwd?)` resolves plan dir with precedence flag → env (`REFRAKT_PLAN_DIR`) → config (`plan.dir` from `refrakt.config.json`) → default (`'plan'`). `scaffoldRefraktConfigForPlan({ projectRoot, planDir })` creates/extends/preserves the config and returns a structured action result for the init output. JSON indent style is sniffed from the existing file when extending.
- `runes/plan/src/cli-plugin.ts` — Replaced `let dir = process.env.REFRAKT_PLAN_DIR || 'plan';` with `let dir = resolvePlanDir().dir;` across all 11 plan command handlers (serve, build, update, next, create, status, validate, next-id, history, init, migrate). Each handler still parses `--dir` and overwrites the resolved value, so flag precedence is preserved.
- `runes/plan/src/commands/init.ts` — Added `noConfig?: boolean` option and `refraktConfig: { action, path, message } | null` field to `InitResult`. Step 6 calls `scaffoldRefraktConfigForPlan` unless `noConfig`. The `didNothing` check excludes `preserved` so a re-run only re-checking the config still reports correctly.
- `handleInit` now accepts `--no-config`, surfaces the config action in init output (`+` for created/extended, `·` for preserved).
- `runes/plan/test/plan-config.test.ts` (new) — 12 tests for both helpers: precedence ordering, missing/malformed config files handled, scaffold actions (create/extend/preserve/skip), relative-dir computation, indent preservation.
- Smoke test: end-to-end `plan init` in a fresh project creates `refrakt.config.json` with `{ "plan": { "dir": "plan" } }`.

### Notes

- Backwards-compat-friendly: pre-v0.11.0 projects without a config file still work — `resolvePlanDir()` returns `{ dir: 'plan', source: 'default' }` exactly like the old `process.env.REFRAKT_PLAN_DIR || 'plan'` line did when the env var was unset.
- `--no-config` opt-out lets users who don't want a refrakt.config.json skip the scaffolding without affecting other init steps.
- All 2286 tests pass.

{% /work %}
