{% decision id="ADR-024" status="proposed" tags="themes,architecture,frameworks,scaffolding,distribution" source="SPEC-116" %}

# Themes are framework-agnostic by default; the framework component layer is opt-in

## Context

refrakt's rendering pipeline already decouples *what a rune means* from *how a
framework draws it*. The identity transform (`packages/transform/src/engine.ts`)
turns a serialized tree into framework-neutral HTML — BEM classes, data
attributes, injected structural elements — and interactive runes are realised as
**framework-neutral web components** in `@refrakt-md/behaviors`, initialised as
custom elements. The Svelte component registry (`packages/svelte/src/registry.ts`)
is **empty**: its own doc comment states all runes now render through the identity
transform + behaviors, and the registry is "preserved for user-defined component
overrides."

The reference theme is the existence proof. **Lumina ships zero `.svelte` files.**
Its `package.json` exports `./transform`, `./layouts`, `./manifest`, `./base.css`,
CSS, and `./presets/*` — and describes itself as "design tokens, CSS, identity
transform, and layout configs." It renders identically under all nine adapters
(`html`, `astro`, `next`, `nuxt`, `eleventy`, `react`, `vue`, `svelte`,
`sveltekit`). The HTML adapter's theme type is explicit: "*Unlike SvelteTheme, this
has no component registry or element overrides — all runes render through the
identity transform*," consuming `layouts: Record<string, LayoutConfig>` — layouts
as **config**, not components. And `ThemeManifest.target` / `SiteConfig.target` are
already deprecated as "documentation-only … adapters do not validate it and it is
increasingly vestigial."

Despite all of this, two surfaces still assume a theme *is* a Svelte package:

1. **The scaffold.** `create-refrakt --type theme` (`packages/create-refrakt/src/scaffold.ts`)
   emits a `svelte/` folder, a `SvelteTheme` export wrapping the empty registry, a
   `svelte/layouts/DefaultLayout.svelte`, and `target: 'svelte'`. It teaches a
   Svelte-coupled theme that does not match the reference theme it is modelled on.
2. **Install validation.** `theme install` warns when `./svelte` is missing
   ("runtime rendering may fail", `packages/cli/src/commands/theme.ts`) — but Lumina
   has no `./svelte` and renders everywhere. The check treats an optional,
   framework-specific layer as required.

So the engine is decoupled; the *authoring and validation surfaces* lag behind and
re-couple themes to one framework.

## Decision

**A refrakt theme is framework-agnostic by default. A framework-specific component
layer is an opt-in, additive override — not part of a theme's essence.**

Concretely:

- **The agnostic core** — design tokens, CSS, identity-transform config
  (`./transform`), layout **configs** (`./layouts`, `LayoutConfig`), and the
  `ThemeManifest` — is what every adapter consumes and what a theme fundamentally
  *is*. This is the Lumina shape.
- **The framework layer** — a component override registry and framework-specific
  layout components (e.g. `./svelte`) — is **optional**, consumed only by the
  matching adapter, and additive on top of the agnostic core (the base registry is
  empty, so an agnostic theme overrides nothing and still renders fully).
- **A theme is "framework-specific" only when it deliberately ships that layer.**
  Such a theme is the exception (a deliberate pairing with one adapter), not the
  default an author is steered toward.
- **`./transform` is the theme contract; `./svelte` (or any framework export) is
  optional.** Its absence is normal, not a defect.

This is not new capability — it ratifies how the engine already works and aligns the
authoring/validation surfaces with the reference theme.

## Consequences

- **Scaffold (folded into {% ref "SPEC-116" /%}).** `--type theme` defaults to a
  framework-agnostic theme mirroring Lumina (tokens + `./transform` config +
  `./layouts` configs + manifest + per-rune CSS + `css-coverage` test), with **no**
  `svelte/`, `SvelteTheme`, or `target`. A `--target <framework>` flag opts into the
  framework component layer (adds `svelte/`, the `./svelte` export, framework layout
  components) for deliberately framework-specific themes.
- **Install validation (folded into {% ref "SPEC-110" /%} §5).** Post-install
  validation treats `./transform` as the required contract and `./svelte` (or any
  framework export) as **optional**: its absence is not warned. Validation may note
  *which* framework layer(s), if any, a theme provides rather than implying one is
  mandatory.
- **`target` stays vestigial.** This decision is consistent with deprecating
  `target`; an agnostic theme has no single target. A framework-specific theme may
  record its target for humans, but adapters still must not gate on it.
- **No engine change.** The identity transform, behaviors, and the empty registry
  are unchanged; this is an authoring-surface and validation alignment.
- **Relationship to {% ref "ADR-009" /%}.** Refines the theme export contract: the
  agnostic exports (`./transform`, `./layouts`, manifest, CSS) are the baseline; the
  framework runtime export is an optional addendum, not a required export.

## References

- Engine + behaviors: `packages/transform/src/engine.ts`, `@refrakt-md/behaviors`.
- Empty component registry: `packages/svelte/src/registry.ts`.
- Reference theme shape: `packages/lumina/package.json` (no `.svelte`; exports
  `./transform`, `./layouts`, `./manifest`, `./presets/*`).
- Framework-agnostic adapter theme: `packages/html/src/theme.ts` (`HtmlTheme`,
  `layouts: Record<string, LayoutConfig>`).
- Surfaces that re-couple: `packages/create-refrakt/src/scaffold.ts` (theme scaffold),
  `packages/cli/src/commands/theme.ts` (`./svelte` warning).
- Deprecated target field: `packages/types/src/theme.ts` (`SiteConfig.target`,
  `ThemeManifest.target`).
- Prior framework-readiness decisions: {% ref "ADR-001" /%}, {% ref "ADR-002" /%},
  {% ref "ADR-009" /%}.

{% /decision %}
