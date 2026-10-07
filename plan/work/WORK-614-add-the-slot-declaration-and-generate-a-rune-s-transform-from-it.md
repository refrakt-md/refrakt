{% work id="WORK-614" status="done" priority="high" complexity="complex" source="SPEC-143" milestone="v0.39.0" tags="runes,transform,declarative,dx" pr="refrakt-md/refrakt#668" %}

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

- [x] A rune can declare its content slots: source field, slot name, wrapper element, and omit-when-empty
- [x] A slot whose name equals its field name needs no declaration beyond being listed
- [x] A slot declares whether it is a `value` or a `region`; a region emits a boundary element defaulting to `div`, and only a non-default element is stated
- [x] A region's children carry no `data-name`, so neither `layout` nor `projection` can address inside an authored body
- [x] The declaration cannot express nesting, ordering or container creation (D2), and a declaration attempting it is rejected rather than silently partially applied
- [x] Both section arrival modes work, read from the content model's `emitTag` rather than declared again (D5)
- [x] The declaration carries the renderable's identity — `rune`, `tag` and `property` — since `createComponentRenderable` is no longer called from a transform
- [x] No declaration can produce two nodes carrying the same `data-name`; one that would is rejected at schema construction, naming the slot
- [x] The same one-node-per-`data-name` assertion is added to the structure contract, so it covers hand-written transforms too
- [x] Declaring both `transform` and the slot declaration on one rune is rejected at schema construction, naming the rune (D8)
- [x] Declaring neither is rejected the same way
- [x] The slot declaration contains no function values, and a declaration carrying one is rejected at schema construction (D9)
- [x] The generated transform is invoked at the existing call site, with no second code path through `createContentModelSchema`
- [x] The slot declaration is sufficient to derive the rune's `sections` config entry, so the identity half of `RuneConfig` is not authored a second time alongside it
- [x] `refrakt inspect` and the generated reference describe a declaratively-labelled rune at least as completely as a transform-built one
- [x] The rune authoring guide documents the slot declaration and the family test (D4) as the way to decide whether a new rune needs a transform

## References

- {% ref "SPEC-143" /%} — mechanism, D1–D9
- {% ref "SPEC-081" /%} — the constraints carried forward (flat bag, semantic IR)
- {% ref "SPEC-140" /%} — `fieldMetas`, the properties channel (D6)

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-slot-labelling`
PR: refrakt-md/refrakt#668

### What was done
- `packages/runes/src/lib/slots.ts` (new): `EmitsDeclaration` / `SlotDeclaration` types, `validateEmits`, `makeSlotTransform` (a closure built once at construction), `slotSections` (derives the `sections` join table), `describeSlots` / `formatSlotLine` for the review surfaces.
- `packages/runes/src/lib/index.ts`: `transform` is optional and `emits` added. D8 errors for both/neither. `const transform = options.transform ?? makeSlotTransform(…)` at the single call site. `sections` is derived from the slots (a `sections` option may add `layout`-created names but not restate a slot). The declaration is recorded on a new `schemaEmits` WeakMap.
- `packages/runes/src/lib/resolver.ts`: `selectStructuralModel` picks the conditional branch the resolver took, so D5 reads `emitTag` from the right model.
- Rejected at construction, naming rune and slot: function values / `undefined` / class instances (D9); nesting, ordering and container keys, and a compound `el` (D2); a `value` slot from a greedy field or from `sections` (one `data-name` on several nodes); a slot that shares a name with a property; a `from` naming no field; custom/delimited models.
- `packages/lumina/test/data-name-uniqueness.test.ts`: the one-node-per-`data-name` assertion over the whole fixture corpus (core fixtures, every plugin rune `fixture`, the SEO fixtures), beside the structure contract.
- `refrakt inspect` gets a "Slots (declared)" section and a `slots` JSON field (`null` for transform-built runes). `refrakt reference` gets an "Output slots" section and an `emits` JSON field.
- Docs: `output-contract.md` documents the declaration and the D4 family test; `authoring-overview.md` points to it. The CLI docs for inspect and reference are updated.
- Tests: `packages/runes/test/slots.test.ts` (24), including byte-identity against an equivalent hand-written transform.

### Notes
- **Existing violations, reported rather than hidden.** 17 runes break one-node-per-`data-name` today. They are recorded in a shrink-only `KNOWN_DUPLICATES` list (a stale entry fails the test).
  - Four repeat a name in the root slot bag that `layout` reads: `deflist` `row`, `palette` `group`, `plan-progress` `group`, `spacing` `section`.
  - The rest name repeated item elements (`recipe` `ingredient`/`step`, `diff` `line`, `grid` `cell`, …).
  - The structure contract is config-derived and cannot see transform output, so the assertion is a corpus test beside it rather than a contract field.
- **Resolved section entries** render as `buildSections` did. Each entry gets `<section data-name=slug>`; a known section's heading gets `data-known-section`; top-level `hr` is dropped. Those per-entry slugs are each section's own identity. The mechanism never names a region's children.
- **Attribute values** (`from: 'attrs.x'`, `as: 'value'`) render as text in `el` (default `span`). The spec did not spell this out, but the storytelling sub-runes' `name` needs it.
- **Follow-ups not filed** (to avoid ID collisions):
  - decide what to do about the 17 known duplicates;
  - SPEC-143's own AC list still names `character`, `realm` and `faction` (see WORK-617).

{% /work %}
