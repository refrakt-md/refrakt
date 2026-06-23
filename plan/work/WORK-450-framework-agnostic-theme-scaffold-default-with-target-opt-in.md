{% work id="WORK-450" status="ready" priority="high" complexity="moderate" source="SPEC-116" tags="create-refrakt,scaffolding,themes,frameworks" milestone="v0.25.0" %}

# Framework-agnostic theme scaffold default with --target opt-in

Per {% ref "ADR-024" /%}, the `--type theme` scaffold currently emits a Svelte-coupled theme
(`svelte/` folder, `SvelteTheme` export, `target: 'svelte'`) that doesn't match the
framework-agnostic reference theme (Lumina, which ships zero `.svelte`). Default it to
framework-agnostic; make the framework component layer opt-in via `--target`.

## Acceptance Criteria
- [ ] `--type theme` defaults to a framework-agnostic theme: tokens + `./transform` config + `./layouts` configs + manifest + per-rune CSS + `css-coverage` test; **no** `svelte/`, `SvelteTheme`, or `target`
- [ ] `--target <framework>` opts into the framework component layer (adds `svelte/`, the `./svelte` export, framework layout components)
- [ ] The agnostic scaffold matches the reference theme (Lumina) shape and builds clean
- [ ] Inherits the {% ref "ADR-023" /%} deps + day-one build wiring ({% ref "WORK-448" /%})

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

{% /work %}
