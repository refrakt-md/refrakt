{% work id="WORK-168" status="draft" priority="high" complexity="moderate" tags="plan, config, dx" source="ADR-010" milestone="v0.11.0" %}

# Plan package consumes unified config (init scaffolds, serve/build read paths)

Wire `@refrakt-md/plan` to the unified `refrakt.config.json`. `plan init` scaffolds the config (creating it or extending an existing one with a `plan` section), and `plan serve` / `plan build` / other plan commands read `plan.dir` from the loaded config instead of relying solely on the `--dir` flag and defaults. The plan section currently exposes only `dir`; specs path remains derived from `dir` (a child folder), and surfacing it as a config field can come later if real-world projects demand it.

## Acceptance Criteria

- [ ] `refrakt plan init` creates `refrakt.config.json` if absent, with a `{ "plan": { "dir": "plan" } }` section
- [ ] If `refrakt.config.json` already exists without a `plan` section, `plan init` adds one (preserving formatting where reasonable)
- [ ] If `refrakt.config.json` already has a `plan` section, `plan init` does not overwrite it (logs that the section is preserved)
- [ ] `plan serve`, `plan build`, `plan validate`, `plan status`, `plan next`, `plan update`, `plan create`, `plan history` read `plan.dir` from the loaded config when no `--dir` flag is provided
- [ ] Explicit `--dir` flag continues to override the config (highest precedence)
- [ ] When neither config nor flag is set, current default behavior (`./plan`) is preserved
- [ ] `plan init` output mentions the config file it created or modified
- [ ] Tests cover: init creates config, init extends existing config without `plan` section, init preserves existing `plan` section, command reads config-declared paths, command --flag overrides config

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

{% /work %}
