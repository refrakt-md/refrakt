{% work id="WORK-449" status="done" priority="medium" complexity="moderate" source="SPEC-118" tags="create-refrakt,scaffolding,plugins" milestone="v0.25.0" %}

# create-refrakt plugin scaffold

{% ref "SPEC-118" /%} §2 — `--type plugin` emits a package implementing `Plugin`
(`packages/types/src/package.ts`) with one example rune that builds and renders under the
identity transform out of the box.

## Acceptance Criteria
- [x] `--type plugin` emits a `Plugin` package: a `runes/` dir with one example rune (`createContentModelSchema` + `createComponentRenderable`) and its `theme.runes` config entry
- [x] Includes a fixture and the `package.json` exports (plus a `cli-plugin` entry stub where relevant)
- [x] The example rune builds and renders under the identity transform with no hand-editing
- [x] Inherits the {% ref "ADR-023" /%} deps + day-one build wiring ({% ref "WORK-448" /%})

## Approach
Add `scaffoldPlugin` dispatched from {% ref "WORK-447" /%}. Model the example rune on a simple
existing plugin rune (e.g. a `definition`-style block). Wire `theme.runes` so the engine
styles it.

## Dependencies
- {% ref "WORK-447" /%} — `--type` dispatch
- {% ref "WORK-448" /%} — deps + build wiring

## References
- {% ref "SPEC-118" /%} §2; `packages/types/src/package.ts`; plugin authoring guide

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-2`

### What was done
`scaffoldPlugin` (SPEC-118 §2) emits a `Plugin` package: `src/tags/callout.ts` (an example rune via `createContentModelSchema` + `createComponentRenderable`, modeled on the working `lore` rune — title attr + body, `aside` with `data-rune="callout"`), `src/config.ts` (`RuneConfig` for `Callout`: block + tone modifier + autoLabel), `src/index.ts` (`Plugin` export wiring `runes.callout` + `theme.runes`), `styles/callout.css`, `README.md`, `tsconfig.json`. ADR-023 wiring: `@refrakt-md/*` peers (minor range) mirrored to devDeps; `@markdoc/markdoc` dep. Snippet + fixture included.

### Verified
Scaffolded `@acme/my-plugin`, linked the workspace node_modules, ran `tsc` → exit 0 with `dist/` output. Loaded the built plugin: `name` set, `runes.callout.transform` is a valid Markdoc tag schema, `theme.runes.Callout` present, fixture present. Builds and renders out of the box.

{% /work %}
