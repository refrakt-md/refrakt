{% work id="WORK-399" status="done" priority="high" complexity="moderate" source="SPEC-101" tags="sandbox,behaviors,lumina,layout,cover" milestone="v0.21.0" %}

# Cover guest fill and sandbox `fill` height mode

cover.css stretches only `img`/`video` to fill the media well; any other guest — a
`sandbox` above all — sits at its own height. CSS alone can't fix the sandbox case:
the custom element (`packages/behaviors/src/elements/sandbox.ts`) sets an **inline**
iframe height (fixed px, or live auto-resize via `rf-sandbox-resize` postMessage when
`data-height="auto"`), which fights a host-owned height. This item makes any guest
fill a cover well, with sandbox `height="fill"` as the mechanism for the live case
({% ref "SPEC-101" /%} §4). Benefits every cover host (card, bento-cell, hero alike).

## Acceptance Criteria
- [x] Cover-scoped fill CSS: in `[data-media-position="cover"] [data-section="media"]`, non-`img`/`video` direct guests (and the sandbox iframe) get `height: 100%`; global sandbox CSS unchanged.
- [x] `sandbox` gains `height="fill"` (`data-height="fill"`): the element sets the iframe to `height: 100%` and registers **no** auto-resize listener; documented attribute grammar alongside the existing number/`auto`.
- [x] The identity transform sets `fill` automatically when a sandbox is the direct guest of a cover media zone, so the composition needs zero sandbox-side config; an explicit author `height` is not overridden.
- [x] The poster (`activation` non-eager) also fills under cover rather than its `min-height: 150px` box — visual consistency even though non-eager-under-cover warns ({% ref "WORK-400" /%}).
- [x] Unit tests: schema (`fill` accepted), element behaviour (no resize listener in fill mode), transform auto-fill under a cover host; contracts/CSS coverage green.

## Approach
- CSS in `packages/lumina/styles/dimensions/cover.css` (generic guest fill) +
  `packages/lumina/styles/runes/sandbox.css` if needed for the iframe.
- Element: `fill` branch beside the `auto` branch in
  `packages/behaviors/src/elements/sandbox.ts` (`buildIframe`, `renderPoster`).
- Schema: `height` attribute accepts `fill` in `packages/runes/src/tags/sandbox.ts`
  (type widens from Number; keep numeric behaviour identical).
- Auto-fill: in the engine's cover handling (`packages/transform/src/engine.ts` §6d
  already locates the cover media zone for posture demotion — set
  `data-height="fill"` on an `rf-sandbox` guest there when its height is `auto`).

## References
- {% ref "SPEC-101" /%} §4 · {% ref "SPEC-089" /%} · sandbox element mechanics: `packages/behaviors/src/elements/sandbox.ts`

## Resolution

Completed: 2026-06-11

Branch: `claude/spec-101-hero-cover-prism`

### What was done
- `packages/lumina/styles/dimensions/cover.css` — non-img/video direct guests of a cover media well fill it (display:block + 100%); backdrop sandbox sits flush (margin/radius 0); iframe height 100% carry.
- `packages/runes/src/tags/sandbox.ts` — `height` widens to `[Number, String]`; `"fill"` passes through, numeric strings keep px behaviour, unknown strings normalise to `auto`.
- `packages/behaviors/src/elements/sandbox.ts` — `fill` mode pins the iframe to 100% (ignoring rebuild-preserved heights), registers no auto-resize listener, and the poster fills the host instead of the 150px floor.
- `packages/transform/src/engine.ts` — in the §6d cover handling, an auto-height `rf-sandbox` in the cover media zone is switched to `data-height="fill"`; explicit numeric heights untouched.
- Tests: schema (fill accepted, unknown→auto), element (100% pin, resize message ignored, poster fill, numeric untouched), engine (auto-fill under cover, numeric preserved, non-cover untouched). Contracts + CSS coverage green.

### Notes
- Verified end-to-end in the built site: the hero docs page's prism sandbox carries `data-height="fill"` with zero sandbox-side config.

{% /work %}
