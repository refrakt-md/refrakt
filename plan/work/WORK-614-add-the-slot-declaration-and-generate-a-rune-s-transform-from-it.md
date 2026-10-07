{% work id="WORK-614" status="ready" priority="high" complexity="complex" source="SPEC-143" milestone="v0.39.0" tags="runes,transform,declarative,dx" %}

# Add the slot declaration and generate a rune's transform from it

{% ref "SPEC-143" /%}'s mechanism, without migrating any rune. That happens in
{% ref "WORK-616" /%} and {% ref "WORK-617" /%}.

`createContentModelSchema` gains an `emits` declaration carrying the renderable's
identity (`rune`, `tag`, `property`), its `properties` in {% ref "SPEC-140" /%}'s
data form (`fieldMetas`, which already takes no function values), and its `slots`:

```ts
slots: {
  title: { from: 'title',       as: 'region', el: 'header' },
  blurb: { from: 'description', as: 'region', omitWhenEmpty: true },
  body:  { from: 'sections',    as: 'region' },          // el defaults to 'div'
}
```

When `transform` is absent, the schema calls `makeSlotTransform(options)`, a
closure built once at schema construction, at the **existing single call site**
(`packages/runes/src/lib/index.ts`). No code generation, no `eval`, no second path
downstream. Everything after that call (`applySchemaTable`, serialization, the
engine, contracts, inspect) is unchanged.

Out of scope, per the spec's own verdicts: `unwrap`, `pick`, `filter`, `map`, and
expected-slot diagnostics.

## Acceptance Criteria

- [ ] A rune can declare its content slots: source field, slot name, wrapper element, and omit-when-empty
- [ ] A slot whose name equals its field name needs no declaration beyond being listed
- [ ] A slot declares whether it is a `value` or a `region`; a region emits a boundary element defaulting to `div`, and only a non-default element is stated
- [ ] A region's children carry no `data-name`, so neither `layout` nor `projection` can address inside an authored body
- [ ] The declaration cannot express nesting, ordering or container creation (D2), and a declaration attempting it is rejected rather than silently partially applied
- [ ] Both section arrival modes work, read from the content model's `emitTag` rather than declared again (D5)
- [ ] The declaration carries the renderable's identity — `rune`, `tag` and `property` — since `createComponentRenderable` is no longer called from a transform
- [ ] No declaration can produce two nodes carrying the same `data-name`; one that would is rejected at schema construction, naming the slot
- [ ] The same one-node-per-`data-name` assertion is added to the structure contract, so it covers hand-written transforms too
- [ ] Declaring both `transform` and the slot declaration on one rune is rejected at schema construction, naming the rune (D8)
- [ ] Declaring neither is rejected the same way
- [ ] The slot declaration contains no function values, and a declaration carrying one is rejected at schema construction (D9)
- [ ] The generated transform is invoked at the existing call site, with no second code path through `createContentModelSchema`
- [ ] The slot declaration is sufficient to derive the rune's `sections` config entry, so the identity half of `RuneConfig` is not authored a second time alongside it
- [ ] `refrakt inspect` and the generated reference describe a declaratively-labelled rune at least as completely as a transform-built one
- [ ] The rune authoring guide documents the slot declaration and the family test (D4) as the way to decide whether a new rune needs a transform

## References

- {% ref "SPEC-143" /%} — mechanism, D1–D9
- {% ref "SPEC-081" /%} — the constraints carried forward (flat bag, semantic IR)
- {% ref "SPEC-140" /%} — `fieldMetas`, the properties channel (D6)

{% /work %}
