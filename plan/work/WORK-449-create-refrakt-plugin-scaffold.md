{% work id="WORK-449" status="ready" priority="medium" complexity="moderate" source="SPEC-116" tags="create-refrakt,scaffolding,plugins" milestone="v0.25.0" %}

# create-refrakt plugin scaffold

{% ref "SPEC-116" /%} §2 — `--type plugin` emits a package implementing `Plugin`
(`packages/types/src/package.ts`) with one example rune that builds and renders under the
identity transform out of the box.

## Acceptance Criteria
- [ ] `--type plugin` emits a `Plugin` package: a `runes/` dir with one example rune (`createContentModelSchema` + `createComponentRenderable`) and its `theme.runes` config entry
- [ ] Includes a fixture and the `package.json` exports (plus a `cli-plugin` entry stub where relevant)
- [ ] The example rune builds and renders under the identity transform with no hand-editing
- [ ] Inherits the {% ref "ADR-023" /%} deps + day-one build wiring ({% ref "WORK-448" /%})

## Approach
Add `scaffoldPlugin` dispatched from {% ref "WORK-447" /%}. Model the example rune on a simple
existing plugin rune (e.g. a `definition`-style block). Wire `theme.runes` so the engine
styles it.

## Dependencies
- {% ref "WORK-447" /%} — `--type` dispatch
- {% ref "WORK-448" /%} — deps + build wiring

## References
- {% ref "SPEC-116" /%} §2; `packages/types/src/package.ts`; plugin authoring guide

{% /work %}
