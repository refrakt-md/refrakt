{% work id="WORK-436" status="ready" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.23.0" tags="theme,skeleton-skin,packaging,cascade-layers,sveltekit" %}

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

- [ ] `@refrakt-md/skeleton` exists, ships `@layer skeleton` + the order declaration + the token contract, and is independently versioned.
- [ ] Lumina consumes it and ships only `@layer skin`; the rendered output is unchanged.
- [ ] The virtual-module loader emits the order declaration before any layer content; a test confirms skin overrides skeleton regardless of import order, with no `!important`.

## Dependencies

- Follows {% ref "WORK-410" /%} (packaging decision + layer-order mechanism). Pairs with the re-bucketing (WORK-438), which fills the layers.

## References

- {% ref "SPEC-094" /%} §3 (skeleton/skin split) · {% ref "WORK-410" /%} FINDINGS §2/§3 · `packages/sveltekit/src/virtual-modules.ts`.

{% /work %}
