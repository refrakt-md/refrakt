{% work id="WORK-520" status="pending" priority="high" complexity="complex" source="SPEC-124" tags="engine, transform, refactor, bg" milestone="v0.30.1" %}

# Migrate the background axis to a facet and exercise the layers channel

Move the ~200-line background block (step 1f) into a `bg` facet. This is the first facet that builds its own element tree, so it is the first real use of `FacetResult.layers` — declared since {% ref "WORK-517" /%} and unexercised. If `layers` cannot express the bg layer's construction and placement, the channel needs redesigning before the remaining migrations depend on it.

## Acceptance Criteria

- [ ] `bg` is a facet; step 1f and its `bgMetaProps` / `bgDataAttrs` / `bgElement` locals are gone from `engine.ts`
- [ ] `FacetResult.layers` carries the bg layer with its placement; the engine's manual splice at step 5b is replaced by generic layer insertion
- [ ] Preset resolution (including the single-level `extends` chain), gradients, image, video, blur, position, fit, opacity, fixed, overlay and scrim all behave unchanged
- [ ] The bg guest from {% ref "SPEC-104" /%} is relocated into the layer and dropped from the flow, as today
- [ ] The scrim reroute reads cover state via `ctx.axis()`, and `bg` declares `after: ['cover', 'tint']`
- [ ] `data-color-scheme` scrim polarity yields to tint via the facet channel, not a seeded read
- [ ] The `--has-bg` modifier lands in the same position in the class string
- [ ] All 630 pre-existing transform tests pass **unmodified**, including `bg-gradient`, `bg-overlay-scrim` and `bg-guest`
- [ ] Unit tests cover gradient construction, preset `extends`, overlay token vs raw CSS, and the scrim/cover split
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

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

{% /work %}
