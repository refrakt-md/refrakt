{% work id="WORK-620" status="in-progress" priority="high" complexity="moderate" source="SPEC-145" milestone="v0.40.0" tags="transform,engine,composition,contracts" %}

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

- [ ] `RuneConfig.block` is optional in `packages/transform/src/types.ts`, and no config without a block emits `rf-undefined`, asserted on a fixture config
- [ ] A block-less config's root carries no `rf-*` class and no `data-rune-fields`; its modifiers render as `data-*` attributes and its universal attributes and meta blocks render as they would with a block
- [ ] `refrakt contracts` describes a block-less entry by its `data-*` modifiers, with no BEM selectors
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy

{% /work %}
