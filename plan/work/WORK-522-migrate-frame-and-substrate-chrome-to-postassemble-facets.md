{% work id="WORK-522" status="pending" priority="medium" complexity="complex" source="SPEC-124" tags="engine, transform, refactor, frame, substrate" milestone="v0.30.1" %}

# Migrate frame and substrate chrome to postAssemble facets

Move {% ref "SPEC-086" /%} frame chrome (step 1g) and {% ref "SPEC-087" /%} substrate fills (step 1h) into facets. Both resolve early but *apply* late, and to a target chosen at resolve time — the rune root or the `[data-section="media"]` zone, which does not exist until assembly. They are the canonical two-phase facets, and the second real test of `postAssemble` after cover.

## Acceptance Criteria

- [ ] `frame` and `substrate` are facets; steps 1g and 1h and their `*MetaProps` / `*RootDataAttrs` locals are gone from `engine.ts`
- [ ] Target selection (`self` vs `media`, including `config.frameTarget` / `config.substrateTarget` and the per-instance substrate override) resolves in `resolve` and applies in `postAssemble`
- [ ] `self`-target chrome still contributes its custom properties to the root's inline style, in the same position
- [ ] The `{% ref "SPEC-116" /%}` `frame-overflow="bleed"` inert-marker strip on a clip host is preserved, with its warn
- [ ] `warnFrameNoTarget`, `warnFrameOverflowClip` and `warnSubstrateNoMedia` become `FacetWarning`s with dedupe keys and unchanged messages
- [ ] `FRAME_FACET_META` moves with the frame facet; `SUBSTRATE_CELL` and `SUBSTRATE_OPACITY` move with the substrate facet and are inventoried as hard-coded theme values
- [ ] All 630 pre-existing transform tests pass **unmodified**, including `frames.test.ts`, `substrate.test.ts` and `guest-fit.test.ts`
- [ ] Unit tests cover target resolution for both facets and the overflow-marker strip
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

`resolveFrameChrome` and `resolveSubstrate` are already extracted functions returning a chrome bundle, so the resolve half is mostly wiring. The work is in the apply half: today the engine holds `frameTargetKind` and `substrateTargetKind` as locals and branches on them at two later points. In the facet model the target is resolution state and the application is `postAssemble`.

This item will likely want `postAssemble` to report contributions rather than only mutate — self-target chrome contributes root styles, which the engine currently reads from the chrome bundle after the fact. Decide whether `postAssemble` gains a return value or whether self-target styles are emitted from `resolve` (they can be: the root exists at resolve time). Prefer the latter if it works, to keep the second phase mutation-only.

## Blocked by
- {% ref "WORK-518" /%}

## Blocks
- {% ref "WORK-524" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-086" /%} — surface chrome: elevation and frame presets
- {% ref "SPEC-087" /%} — surface fills: substrate patterns
- {% ref "SPEC-116" /%} — `frame-overflow` and the clip-host inert-marker strip

{% /work %}
