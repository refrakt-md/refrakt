{% work id="WORK-456" status="ready" priority="high" complexity="moderate" source="SPEC-111" tags="presets,manifest,packaging" milestone="v0.25.0" %}

# Preset-pack format and presets.json manifest (capability not kind)

{% ref "SPEC-111" /%} §1,§3 — define the standalone preset-pack format and the `presets.json`
manifest. A pack is a *capability* a package adds, not a `kind` it becomes, so it coexists
with a theme contract / `template.json`.

## Acceptance Criteria
- [ ] A preset-pack is a package shipping one or more `ThemeTokensConfig` presets + a standalone `presets.json`, resolvable independently of any theme
- [ ] `presets.json` records per-preset `id`, `title`, `scope`, `module`, optional `tunedFor`, and a `refrakt` range
- [ ] Packs are a capability, not a `kind`: a package may declare `presets.json` alongside a theme contract / `template.json`; Lumina (theme + 9 presets) is expressible as a theme that also declares a pack — no `ThemeManifest` change
- [ ] Distributable discovery scans for each capability (theme contract, `template.json`, `presets.json`) independently
- [ ] Lumina's existing presets remain exported/functional and are expressible in the pack format without altering their data

## Approach
Add the `presets.json` type in `packages/types`. Reframe distributable discovery to scan
per-capability. No engine/loader change here — the carrier + validation land in their own work
items (JSON carrier, scope/validation).

## Dependencies
- {% ref "WORK-444" /%} — the `refrakt` range field

## References
- {% ref "SPEC-111" /%} §1, §3; `packages/lumina/src/presets/*`

{% /work %}
