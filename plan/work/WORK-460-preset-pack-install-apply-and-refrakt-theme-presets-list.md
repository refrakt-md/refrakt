{% work id="WORK-460" status="done" priority="medium" complexity="moderate" source="SPEC-111" tags="presets,install,cli" milestone="v0.25.0" %}

# Preset-pack install apply and refrakt theme presets list

{% ref "SPEC-111" /%} §4 + {% ref "SPEC-110" /%} §4 — the lightest apply (add dep + validate +
optional append) plus a discovery command.

## Acceptance Criteria
- [x] Preset-pack install rides the shared resolver; apply adds the dependency, validates `presets.json`, and optionally appends the chosen preset to `site.theme.presets` — no scaffold-copy, no site creation, no `theme`-field change
- [x] `refrakt theme presets list` lists presets resolvable from installed packs + the active theme, filterable by `--scope` and by compatibility with the active theme (universal always shown; `palette` flagged outside its `tunedFor`)
- [x] Multi-site `--site` is honoured for the optional append

## Approach
Add the preset-pack branch to the `kind`-keyed apply work item and a `theme presets list`
subcommand. Capability discovery is independent of `kind` — a theme package may also be a
preset pack.

## Dependencies
- {% ref "WORK-456" /%} — pack format
- {% ref "WORK-445" /%} — shared resolver
- {% ref "WORK-446" /%} — multi-site `--site`

## References
- {% ref "SPEC-111" /%} §4; {% ref "SPEC-110" /%} §4

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `theme presets list` — discovers installed packs + the active theme's pack, filterable by `--scope`, flagging palette presets not `tunedFor` the active theme (advisory ⚠, never blocking).
- `theme presets validate` — pack-manifest validation (WORK-459).
- `theme presets install <source> [--use <id>] [--site] [--registry]` — the lightest apply: resolve via the shared resolver, install via the package manager, validate `presets.json` + refrakt compat, and optionally append `<pkg>/<id>` to the target site's `theme.presets` (multi-site `--site` honoured). No scaffold-copy, no site creation, no theme-field change.
- Wired under `refrakt theme presets <list|validate|install>` in `bin.ts`. Verified end-to-end against Lumina.

{% /work %}
