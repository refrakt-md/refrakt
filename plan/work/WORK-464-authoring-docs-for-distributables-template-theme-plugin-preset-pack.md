{% work id="WORK-464" status="ready" priority="medium" complexity="simple" source="SPEC-116" tags="docs,authoring" milestone="v0.25.0" %}

# Authoring docs for distributables (template, theme, plugin, preset-pack)

The docs ACs across {% ref "SPEC-109" /%}, {% ref "SPEC-111" /%}, and {% ref "SPEC-116" /%} —
authoring guides for each distributable, each `create-refrakt --type` kind with a worked
example.

## Acceptance Criteria
- [ ] A template-authoring guide covers the manifest, the framework × purpose model, scaffold-copy semantics, the `asset:` scheme, and bundling a sandbox
- [ ] A theme-authoring update covers the framework-agnostic default + `--target` ({% ref "ADR-024" /%})
- [ ] A plugin-authoring pointer + a preset-pack guide cover the `scope` vocabulary, the JSON carrier + `$schema`, the dual preset/tint role, and compatibility (`tunedFor`) semantics
- [ ] Each `create-refrakt --type` kind is documented with a worked example, and the {% ref "ADR-023" /%} peerDeps/compat convention is explained

## Approach
Extend `site/content/extend/*` (theme-authoring, plugin-authoring) and add a
template-authoring + preset-pack-authoring guide. Land after the formats exist so examples are
accurate.

## Dependencies
- {% ref "WORK-449" /%} — plugin scaffold
- {% ref "WORK-450" /%} — theme scaffold default
- {% ref "WORK-451" /%} — template format
- {% ref "WORK-456" /%} — preset-pack format

## References
- {% ref "SPEC-109" /%}; {% ref "SPEC-111" /%}; {% ref "SPEC-116" /%}; `site/content/extend/*`

{% /work %}
