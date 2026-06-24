{% work id="WORK-450" status="done" priority="high" complexity="moderate" source="SPEC-116" tags="create-refrakt,scaffolding,themes,frameworks" milestone="v0.25.0" %}

# Framework-agnostic theme scaffold default with --target opt-in

Per {% ref "ADR-024" /%}, the `--type theme` scaffold currently emits a Svelte-coupled theme
(`svelte/` folder, `SvelteTheme` export, `target: 'svelte'`) that doesn't match the
framework-agnostic reference theme (Lumina, which ships zero `.svelte`). Default it to
framework-agnostic; make the framework component layer opt-in via `--target`.

## Acceptance Criteria
- [x] `--type theme` defaults to a framework-agnostic theme: tokens + `./transform` config + `./layouts` configs + manifest + per-rune CSS + `css-coverage` test; **no** `svelte/`, `SvelteTheme`, or `target`
- [x] `--target <framework>` opts into the framework component layer (adds `svelte/`, the `./svelte` export, framework layout components)
- [x] The agnostic scaffold matches the reference theme (Lumina) shape and builds clean
- [x] Inherits the {% ref "ADR-023" /%} deps + day-one build wiring ({% ref "WORK-448" /%})

## Approach
Rework `scaffoldTheme` in `packages/create-refrakt/src/scaffold.ts` to emit the agnostic core
by default (mirroring `packages/lumina`), gating the `svelte/` layer behind `--target`. Drop
`target` from the default manifest.

## Dependencies
- {% ref "WORK-447" /%} — `--type` dispatch (and the `--target` flag plumbing)
- {% ref "WORK-448" /%} — deps + build wiring

## References
- {% ref "SPEC-116" /%}; {% ref "ADR-024" /%}
- `packages/create-refrakt/src/scaffold.ts`; `packages/lumina/package.json`

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-2`

### What was done
Reworked `scaffoldTheme` (ADR-024). Default `--type theme` now emits a **framework-agnostic** theme mirroring Lumina: `src/config.ts` (`mergeThemeConfig`), `src/layouts.ts` (re-exports `defaultLayout`/`docsLayout`/`blogArticleLayout` from `@refrakt-md/transform`), tokens/, styles/runes, `manifest.json` (no `target`; regions-only layouts; `refrakt` range), `index.css`/`base.css`, `css-coverage` test. Exports `./transform` + `./layouts` + `./manifest` + CSS; **no** `svelte/`, `SvelteTheme`, or `target`. `@refrakt-md/*` are peerDependencies (minor range) mirrored to devDependencies.

`--target svelte` opts into the component layer — adds `svelte/index.ts` (`SvelteTheme` + registry), `svelte/layouts/DefaultLayout.svelte`, `svelte/tokens.css`, the `./svelte` export, and the `@refrakt-md/svelte` peer.

bin.ts: `--target svelte` is parsed as the theme component-layer opt-in (distinct from site adapters), inferred to `--type theme`, rejected for other kinds; done-message + usage updated.

### Verified
Scaffolded both variants: agnostic has no `svelte/` and exports `./transform`+`./layouts` only; `--target svelte` adds the layer + export + peer. Matches the reference theme shape.

{% /work %}
