{% work id="WORK-620" status="done" priority="high" complexity="moderate" source="SPEC-145" milestone="v0.40.0" tags="transform,engine,composition,contracts" pr="refrakt-md/refrakt#678" %}

# A rune config may omit `block`

{% ref "SPEC-145" /%} D2a. A composed rune has no BEM block and ships no CSS, but it still
needs an engine config: its modifiers, universal attributes and meta blocks have to
render. Today `RuneConfig.block` is required. The engine builds
`${prefix}-${config.block}` unconditionally (`packages/transform/src/engine.ts`), so a
config without one emits `rf-undefined`. A rune with no config at all leaks
`data-rune-fields` into the HTML.

Make `block` optional:

- A block-less config gets no `rf-*` classes. Everything else the engine does still
  applies, and the field bag is stripped as usual.
- `refrakt contracts` describes a block-less entry by its `data-*` modifiers. Slot names
  are added by {% ref "WORK-622" /%} once slots exist.

This item adds the capability only. No shipped rune drops its block.

## Acceptance Criteria

- [x] `RuneConfig.block` is optional in `packages/transform/src/types.ts`, and no config without a block emits `rf-undefined`, asserted on a fixture config
- [x] A block-less config's root carries no `rf-*` class and no `data-rune-fields`; its modifiers render as `data-*` attributes and its universal attributes and meta blocks render as they would with a block
- [x] `refrakt contracts` describes a block-less entry by its `data-*` modifiers, with no BEM selectors
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-blockless-config`
PR: refrakt-md/refrakt#678

### What was done
- `packages/transform/src/types.ts`: `RuneConfig.block` is optional, and its doc comment explains block-less configs.
- `packages/transform/src/engine.ts`:
  - `block` is empty when the config has none. Facet modifier classes and BEM element classes are skipped, and an empty `class` attribute is omitted. Every other step still runs.
  - Diagnostics (`requiresParent`, interactive guest, cover sandbox) name the rune via `data-rune` (D2a point 5).
- `packages/transform/src/contracts.ts`: `RuneContract.block` is optional. The new `generateBlocklessContract` emits:
  - `root: [data-rune="…"]`;
  - `data-*` modifiers with no `classPattern`;
  - inline styles, universal axes without selectors, `childOrder` and variants.

  It emits no elements, context modifiers or static modifiers.
- `validate.ts` and the CLI `plugin-validate.ts`: `block` is optional, but an empty one is still an error.
- Guards for the other block consumers: `used-css.ts`, `i18n-extract.ts`, CLI `inspect.ts` (single audit, full audit, dimension audit), `scaffold-css.ts`, `meta-audit.ts`, `format.ts`, editor `deriveChildRunes`, the Lumina `css-coverage` and `prominence-reach` tests, and the create-refrakt scaffolded coverage test.
- Tests: the new `packages/transform/test/blockless-config.test.ts` compares the same fixture config with and without a block. `validate.test.ts` was updated.
- Docs: `site/content/extend/theme-authoring/config-api.md`.
- Changeset: minor for `@refrakt-md/transform` and `@refrakt-md/cli`.

### Notes
- Contracts (both copies) and the SEO baseline show no drift, as the milestone table requires.
- The spec held: the unconditional class build was at `engine.ts:318`.
- `contextModifiers` and `staticModifiers` are class-only, so they are inert on a block-less config. This matches D2a point 3: theming goes through the primitives' own context modifiers.
- The editor's `deriveChildRunes` names child runes by `block`. A block-less child rune is left out of that set. It is not reachable today.
- Slot names in block-less contracts are deferred to WORK-622, per the work item.

{% /work %}
