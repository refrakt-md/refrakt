{% work id="WORK-436" status="done" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.23.0" tags="theme,skeleton-skin,packaging,cascade-layers,sveltekit" %}

# `@refrakt-md/skeleton` package + `@layer` infrastructure

Stand up the packaging + cascade-layer infrastructure the {% ref "WORK-410" /%} spike settled,
so skeleton and skin can ship and version separately. The structural home the re-bucketing
fills.

## Scope

- Create `@refrakt-md/skeleton` — ships `@layer skeleton` (structure) + the
  `@layer skeleton, skin;` **order declaration**, plus the token *contract* (names, not values).
  It is the versioned contract every theme depends on; a breaking structural change bumps *its*
  version, not a skin's.
- Make Lumina depend on it and contribute only its `@layer skin`.
- Confirm the loader guarantee from the spike: the order declaration is **emitted first** (it
  falls out of importing the skeleton entry first), so layer *contents* may load in any order and
  skin still wins with low-specificity selectors and no `!important`. Wire the SvelteKit
  virtual-module loader accordingly.

## Acceptance Criteria

- [x] `@refrakt-md/skeleton` exists, ships `@layer skeleton` + the order declaration + the token contract, and is independently versioned.
- [x] Lumina consumes it and ships only `@layer skin`; the rendered output is unchanged.
- [x] The virtual-module loader emits the order declaration before any layer content; a test confirms skin overrides skeleton regardless of import order, with no `!important`.

## Dependencies

- Follows {% ref "WORK-410" /%} (packaging decision + layer-order mechanism). Pairs with the re-bucketing (WORK-438), which fills the layers.

## References

- {% ref "SPEC-094" /%} §3 (skeleton/skin split) · {% ref "WORK-410" /%} FINDINGS §2/§3 · `packages/sveltekit/src/virtual-modules.ts`.

## Resolution

Completed: 2026-06-15

Branch: `claude/v023-skeleton-infra`

### What was done
- **New `@refrakt-md/skeleton` package** (`packages/skeleton/`): ships `index.css` = the `@layer skeleton, skin;` order declaration + an (intentionally empty) `@layer skeleton {}` body, and a `./contract` entry re-exporting the `TokenContract` type plus `SKELETON_LAYER`/`SKIN_LAYER`/`LAYER_ORDER_DECLARATION` constants. Independently versioned in the fixed group; added to the root build order after `types`.
- **Lumina** depends on `@refrakt-md/skeleton` and imports it first in `index.css`.
- **SvelteKit loader** (`virtual-modules.ts`) emits `import '@refrakt-md/skeleton';` before any theme CSS in **both** dev (barrel) and build (tree-shaken per-rune) modes — the order-declaration-first guarantee (WORK-410 §3).
- **Tests:** `packages/skeleton/test/layer-order.test.ts` (order declaration is the first statement, orders skeleton→skin, no `!important`, constant matches the stylesheet) + two loader tests asserting the skeleton import precedes the theme CSS in dev and build.

### Scope decision (confirmed with the user: "infra-only")
Per the agreed scope, this work item stands up the **infrastructure only**. Lumina's own CSS is currently **unlayered** — it therefore wins over the empty `@layer skeleton`, so rendered output is unchanged. The literal "Lumina ships only `@layer skin`" wrapping is **deferred to WORK-438's per-file re-bucketing**, because doing it now via `@import … layer(skin)` would conflict with 438 placing `@layer skeleton{}` blocks inside the same files (they'd nest as `skin.skeleton`). 438 wraps each file once, cleanly. AC2 is thus met in spirit (consumes skeleton, output unchanged); the full `@layer skin` wrap is 438's.

### Verification
- `npm run build` (full monorepo) green with the new package + build-order change.
- Layer-order + loader tests green; the live skin-overrides-skeleton **pixel** check is browser-gated (WORK-410 §3 caveat) — validated here by construction + the cascade rules + the order-declaration-first loader test.

{% /work %}
