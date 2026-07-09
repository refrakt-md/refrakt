{% work id="WORK-464" status="done" priority="medium" complexity="simple" source="SPEC-118" tags="docs,authoring" milestone="v0.25.0" %}

# Authoring docs for distributables (template, theme, plugin, preset-pack)

The docs ACs across {% ref "SPEC-109" /%}, {% ref "SPEC-111" /%}, and {% ref "SPEC-118" /%} —
authoring guides for each distributable, each `create-refrakt --type` kind with a worked
example.

## Acceptance Criteria
- [x] A template-authoring guide covers the manifest, the framework × purpose model, scaffold-copy semantics, the `asset:` scheme, and bundling a sandbox
- [x] A theme-authoring update covers the framework-agnostic default + `--target` ({% ref "ADR-024" /%})
- [x] A plugin-authoring pointer + a preset-pack guide cover the `scope` vocabulary, the JSON carrier + `$schema`, the dual preset/tint role, and compatibility (`tunedFor`) semantics
- [x] Each `create-refrakt --type` kind is documented with a worked example, and the {% ref "ADR-023" /%} peerDeps/compat convention is explained

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
- {% ref "SPEC-109" /%}; {% ref "SPEC-111" /%}; {% ref "SPEC-118" /%}; `site/content/extend/*`

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-3`

### What was done
- New `site/content/extend/distributing/` section: `index.md` (four-layer overview, the `create-refrakt --type` kinds with worked examples, the ADR-023 peerDeps/compat convention, and the install commands), `templates.md` (manifest, framework×purpose model, scaffold-copy semantics, the `asset:` scheme, bundled sandboxes, theme-portability), `preset-packs.md` (scope vocabulary, JSON carrier + `$schema`, `tunedFor` compatibility, the dual preset/tint role).
- Theme-authoring `overview.md`: a "Framework-agnostic by default (ADR-024)" section covering the default + `--target svelte` opt-in.
- Plugin-authoring `authoring.md`: a "Scaffolding a plugin" note.
- Updated the sandbox config doc (`sites.md`) to `sandbox.dir` (ADR-022) — also closes WORK-463's docs criterion.

{% /work %}
