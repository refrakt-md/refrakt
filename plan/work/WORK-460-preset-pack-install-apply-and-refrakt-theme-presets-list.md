{% work id="WORK-460" status="ready" priority="medium" complexity="moderate" source="SPEC-111" tags="presets,install,cli" milestone="v0.25.0" %}

# Preset-pack install apply and refrakt theme presets list

{% ref "SPEC-111" /%} §4 + {% ref "SPEC-110" /%} §4 — the lightest apply (add dep + validate +
optional append) plus a discovery command.

## Acceptance Criteria
- [ ] Preset-pack install rides the shared resolver; apply adds the dependency, validates `presets.json`, and optionally appends the chosen preset to `site.theme.presets` — no scaffold-copy, no site creation, no `theme`-field change
- [ ] `refrakt theme presets list` lists presets resolvable from installed packs + the active theme, filterable by `--scope` and by compatibility with the active theme (universal always shown; `palette` flagged outside its `tunedFor`)
- [ ] Multi-site `--site` is honoured for the optional append

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

{% /work %}
