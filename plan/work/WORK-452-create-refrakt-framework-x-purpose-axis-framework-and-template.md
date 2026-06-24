{% work id="WORK-452" status="done" priority="high" complexity="moderate" source="SPEC-109" tags="create-refrakt,templates,cli" milestone="v0.25.0" %}

# create-refrakt framework x purpose axis (--framework and --template)

{% ref "SPEC-109" /%} §1,§5 — split the overloaded single axis: `--framework` selects the
adapter, `--template` selects the purpose (the site template). Both default to preserve
today's behaviour, and scaffolding composes framework starter + site template + theme.

## Acceptance Criteria
- [x] `--framework <name>` selects the adapter (svelte/astro/next/nuxt/eleventy/html), reconciling the existing `--type`/`--target` plumbing; the rename is documented
- [x] `--template <name>` selects the purpose; absent → today's minimal starter (existing behaviour preserved)
- [x] Scaffolding composes the three inputs (framework starter, site template `site` config, theme), injecting the framework-specific `target`/wiring
- [x] A `--template` value may be a bundled name, a local directory, or a package identifier (resolution shared with {% ref "WORK-445" /%})

## Approach
Update `bin.ts` flag parsing and the compose step in `scaffold.ts`. The template's `site`
config is framework-agnostic; the scaffolder injects the adapter wiring.

## Dependencies
- {% ref "WORK-447" /%} — `--type` dispatch / flag plumbing

## References
- {% ref "SPEC-109" /%} §1, §5; `packages/create-refrakt/src/bin.ts`

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-3`. Split the axes: `--framework <adapter>` (author-facing name; `--target` kept as alias), `--template <name|dir>` (purpose). `scaffold()` composes framework starter + site template (`applyTemplate`) + theme; `--template` resolves a bundled name or local directory (`resolveTemplateDir`); absent → today's minimal starter. Usage documents the rename.

{% /work %}
