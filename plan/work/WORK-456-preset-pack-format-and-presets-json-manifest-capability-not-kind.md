{% work id="WORK-456" status="done" priority="high" complexity="moderate" source="SPEC-111" tags="presets,manifest,packaging" milestone="v0.25.0" %}

# Preset-pack format and presets.json manifest (capability not kind)

{% ref "SPEC-111" /%} §1,§3 — define the standalone preset-pack format and the `presets.json`
manifest. A pack is a *capability* a package adds, not a `kind` it becomes, so it coexists
with a theme contract / `template.json`.

## Acceptance Criteria
- [x] A preset-pack is a package shipping one or more `ThemeTokensConfig` presets + a standalone `presets.json`, resolvable independently of any theme
- [x] `presets.json` records per-preset `id`, `title`, `scope`, `module`, optional `tunedFor`, and a `refrakt` range
- [x] Packs are a capability, not a `kind`: a package may declare `presets.json` alongside a theme contract / `template.json`; Lumina (theme + 9 presets) is expressible as a theme that also declares a pack — no `ThemeManifest` change
- [x] Distributable discovery scans for each capability (theme contract, `template.json`, `presets.json`) independently
- [x] Lumina's existing presets remain exported/functional and are expressible in the pack format without altering their data

## Approach
Add the `presets.json` type in `packages/types`. Reframe distributable discovery to scan
per-capability. No engine/loader change here — the carrier + validation land in their own work
items (JSON carrier, scope/validation).

## Dependencies
- {% ref "WORK-465" /%} — the `refrakt` range field

## References
- {% ref "SPEC-111" /%} §1, §3; `packages/lumina/src/presets/*`

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `PresetPackManifest`/`PresetEntry` types (WORK-465 `distribution.ts`).
- `packages/cli/src/commands/presets.ts` `discoverPacks()` scans `node_modules` (following symlinks/workspaces) for any package carrying a `presets.json` — independent of `kind`, so a theme that also ships presets is found.
- Gave **Lumina a `presets.json`** declaring its 9 presets (niwaki=syntax, the other 8=palette, tunedFor `@refrakt-md/lumina`), module-pointing at the built `./dist/presets/*.js`; added `presets.json` to its `files` + a `./presets.json` export. No `ThemeManifest` change, no preset-data change. Verified end-to-end: `theme presets list`/`validate` discover Lumina as theme+pack, all 9 resolve and scopes agree.

{% /work %}
