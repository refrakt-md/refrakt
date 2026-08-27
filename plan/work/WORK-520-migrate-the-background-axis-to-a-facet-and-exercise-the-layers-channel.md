{% work id="WORK-520" status="done" priority="high" complexity="complex" source="SPEC-124" tags="engine, transform, refactor, bg" milestone="v0.30.1" pr="refrakt-md/refrakt#582" %}

# Migrate the background axis to a facet and exercise the layers channel

Move the ~200-line background block (step 1f) into a `bg` facet. This is the first facet that builds its own element tree, so it is the first real use of `FacetResult.layers` — declared since {% ref "WORK-517" /%} and unexercised. If `layers` cannot express the bg layer's construction and placement, the channel needs redesigning before the remaining migrations depend on it.

## Acceptance Criteria

- [x] `bg` is a facet; step 1f and its `bgMetaProps` / `bgDataAttrs` / `bgElement` locals are gone from `engine.ts`
- [x] `FacetResult.layers` carries the bg layer with its placement; the engine's manual splice at step 5b is replaced by generic layer insertion
- [x] Preset resolution (including the single-level `extends` chain), gradients, image, video, blur, position, fit, opacity, fixed, overlay and scrim all behave unchanged
- [x] The bg guest from {% ref "SPEC-104" /%} is relocated into the layer and dropped from the flow, as today
- [x] The scrim reroute reads cover state via `ctx.axis()`, and `bg` declares `after: ['cover', 'tint']`
- [x] `data-color-scheme` scrim polarity yields to tint via the facet channel, not a seeded read
- [x] The `--has-bg` modifier lands in the same position in the class string
- [x] All 630 pre-existing transform tests pass **unmodified**, including `bg-gradient`, `bg-overlay-scrim` and `bg-guest`
- [x] Unit tests cover gradient construction, preset `extends`, overlay token vs raw CSS, and the scrim/cover split
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

The block's size is mostly branch surface, not depth: a trigger condition raising the layer, then a sequence of independent facets (image, video, guest, overlay, scrim) appending children. It should decompose into a `resolve` that returns one layer plus `classes` / `dataAttrs` / `consumes`.

Two theme values live inside it — `BLUR_PRESETS` (`4px/8px/16px`, declared *inside* the function body) and `SCRIM_STRENGTH` (`0.3/0.55/0.8`). Move them with the facet and inventory them for the token follow-on; do not hoist them into a shared constants module, which would entrench hard-coded design values in a framework-agnostic engine.

`warnRawOverlay` is one of the eight warn-once sets; convert it to a `FacetWarning` with a `dedupeKey`, preserving process-wide dedupe scope and the exact message.

## Blocked by
- {% ref "WORK-519" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-088" /%} — bg gradients and the custom-CSS escape hatch
- {% ref "SPEC-104" /%} — live sandbox guests in the bg backdrop layer
- {% ref "SPEC-089" /%} — cover mode, which reroutes the scrim away from this layer

## Resolution

Completed: 2026-08-27

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- `packages/transform/src/facets/bg.ts` — the SPEC-088 axis: preset resolution with one `extends` level, `buildBgGradient` / `resolveBgStop`, image and video bases, the flat overlay wash, the legibility scrim, and the SPEC-104 sandbox-guest relocation. Owns `BG_GRADIENT_DIRECTIONS`, `SCRIM_STRENGTH`, `BLUR_PRESETS` and `TOKEN_REF`.
- `packages/transform/src/facets/types.ts` + `driver.ts` — added `FacetResult.absorbs`.
- `packages/transform/src/engine.ts` — step 1f, step 5b's hand-written splice, the `bgMetaProps` / `bgDataAttrs` / `bgElement` / `bgGuestNode` locals and the gradient/scrim/overlay helpers all gone. Down to 1549 lines from 2223 before the facet work began.
- `packages/transform/test/facets/bg.test.ts` — 44 tests covering gradient construction, preset `extends`, overlay token vs raw CSS, the scrim/cover split and guest absorption.

### Notes

**`layers` held.** This was the item that would show whether the channel was designed right, and it was: the engine's bespoke bg-layer splice became a generic `before-content` insertion any facet can use.

**But relocation turned out to be two halves.** `layers` puts the new subtree in; nothing took the original out. The bg sandbox guest moves from the host's children into the layer, and without an explicit channel it would render twice. Added `FacetResult.absorbs` — nodes the facet took ownership of, matched by identity, filtered from the flow by the engine.

**Two more seed reads retired.** `bg` declares `after: ['cover', 'tint']`, so cover's scrim reroute and tint's scheme claim arrive through `ctx.axis()` instead of engine internals. With both tint and bg publishing their claim as facet state, the `color-scheme` seed is gone entirely — only `media-position` and `content-place` remain, both going in WORK-523.

**A test I got wrong, worth recording.** My first draft asserted that an out-of-range gradient alpha (`primary/900`) falls back to the plain token. It does not: the fallback interpolates the *whole* stop, emitting `var(--rf-color-primary/900)`, which is not a valid custom-property name. The code was right about what it does; the assumption was mine. Preserved verbatim and now pinned by a test documenting the quirk — fixing it would be a behaviour change and belongs in its own item.

Every declared channel on `FacetResult` now has a real user. All 630 pre-existing transform tests pass unmodified, including the bg-gradient, bg-overlay-scrim and bg-guest suites.

{% /work %}
