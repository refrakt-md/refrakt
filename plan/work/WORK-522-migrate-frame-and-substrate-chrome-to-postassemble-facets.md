{% work id="WORK-522" status="done" priority="medium" complexity="complex" source="SPEC-124" tags="engine, transform, refactor, frame, substrate" milestone="v0.30.1" pr="refrakt-md/refrakt#580" %}

# Migrate frame and substrate chrome to postAssemble facets

Move {% ref "SPEC-086" /%} frame chrome (step 1g) and {% ref "SPEC-087" /%} substrate fills (step 1h) into facets. Both resolve early but *apply* late, and to a target chosen at resolve time — the rune root or the `[data-section="media"]` zone, which does not exist until assembly. They are the canonical two-phase facets, and the second real test of `postAssemble` after cover.

## Acceptance Criteria

- [x] `frame` and `substrate` are facets; steps 1g and 1h and their `*MetaProps` / `*RootDataAttrs` locals are gone from `engine.ts`
- [x] Target selection (`self` vs `media`, including `config.frameTarget` / `config.substrateTarget` and the per-instance substrate override) resolves in `resolve` and applies in `postAssemble`
- [x] `self`-target chrome still contributes its custom properties to the root's inline style, in the same position
- [x] The `{% ref "SPEC-116" /%}` `frame-overflow="bleed"` inert-marker strip on a clip host is preserved, with its warn
- [x] `warnFrameNoTarget`, `warnFrameOverflowClip` and `warnSubstrateNoMedia` become `FacetWarning`s with dedupe keys and unchanged messages
- [x] `FRAME_FACET_META` moves with the frame facet; `SUBSTRATE_CELL` and `SUBSTRATE_OPACITY` move with the substrate facet and are inventoried as hard-coded theme values
- [x] All 630 pre-existing transform tests pass **unmodified**, including `frames.test.ts`, `substrate.test.ts` and `guest-fit.test.ts`
- [x] Unit tests cover target resolution for both facets and the overflow-marker strip
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

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

## Resolution

Completed: 2026-08-27

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- `packages/transform/src/facets/chrome.ts` — the shared two-phase chrome contract: `Chrome` (dataAttrs + styles + consumes), `ChromeTarget` (`self` | `media` | `null`), `ChromeCarry`, `applyChromeToTag`, `hasMediaSection`.
- `packages/transform/src/facets/frame.ts` — the SPEC-086 axis, owning `FRAME_FACET_META`, preset `extends` resolution, the guest-fit displace-mode default, and the SPEC-116 overflow-marker strip.
- `packages/transform/src/facets/substrate.ts` — the SPEC-087 axis, owning `SUBSTRATE_CELL` and `SUBSTRATE_OPACITY` and the target-override precedence.
- `packages/transform/src/engine.ts` — steps 1g, 1h and 6c removed along with `resolveFrameChrome`, `resolveSubstrate`, `applyChromeToTag`, the `FrameChrome`/`SubstrateChrome` interfaces and three `*_WARNED` sets. Down to 1889 lines from 2223 before the facet work began.
- `packages/transform/src/helpers.ts` — `findMediaZone` moved here; engine and facets now share one implementation.
- `packages/transform/test/facets/{frame,substrate}.test.ts` — 42 new tests covering target resolution for both axes, the overflow-marker strip, both phases, and the carry channel.

### Notes

Sequenced ahead of tint deliberately, as the item most likely to push on the interface. It did, three times:

1. **`FacetContext.theme`** — facets had no access to theme preset registries. `frame` resolves a named preset against the theme's frame registry; `tints` and `backgrounds` are declared alongside because the next two axes need the same kind of lookup.
2. **`FacetResult.carry`** — private scratch from a facet's `resolve` to its own `postAssemble`. The chrome bundle and its target are neither emitted nor expressible as a string, and `state` is `Record<string, string>`. Re-resolving in the second phase would duplicate the work and let the two phases disagree.
3. **`postAssemble` returns `FacetWarning[] | void`** instead of `void` — a `media`-target chrome finding no media zone is only detectable against the assembled tree. An earlier attempt added an ad-hoc `ctx.warn()` for this and was backed out: it made the two phases inconsistent with each other for no gain, and would have bypassed the collector's dedupe.

Also removed the duplicate `findMediaZone` — the engine kept its own while `helpers` gained one during WORK-518, which is exactly the duplication that item's resolution warned about.

Self-target chrome is emitted from `resolve` (the root exists then) rather than applied in `postAssemble`, keeping the second phase mutation-only as the item's approach proposed.

All 630 pre-existing transform tests pass unmodified; only the facet tests were updated, for the extended interface.

{% /work %}
