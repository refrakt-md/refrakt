{% work id="WORK-381" status="ready" priority="medium" complexity="moderate" tags="sandbox,behaviors,performance,showcase" milestone="v0.20.1" %}

# Sandbox lazy/poster activation

`sandbox` is **eager** today: the iframe is created and its dependencies load on
page render (it has a `height` knob but no deferral). That's fine for a small demo,
but a heavy sandbox — a three.js scene (WORK-382), a large framework demo — on a
perf-sensitive page like the site index costs a chunk of load time we deliberately
avoided (WORK-350 and WORK-380 both limited live iframes "to keep the landing page
fast").

Add a **deferred-activation** capability so a heavy sandbox can headline a page
without the load-time hit — useful for *any* heavy sandbox, not just three.js.

## Approach
- **`activation` attribute:** `eager` (default — unchanged behaviour) | `visible`
  (mount when scrolled into view, via `IntersectionObserver`) | `click` (mount on
  explicit user activation, for the heaviest cases).
- **`poster` attribute:** a static image (or the rendered static fallback) shown in
  the iframe's place until activation. The rune emits the poster + `data-activation`;
  the iframe's `src`/`srcdoc` and dependency `<link>`/`<script>` tags are **not
  created** until activation, so nothing downloads early.
- **Deferred mount lives in `@refrakt-md/behaviors`** (alongside the other
  progressive-enhancement behaviours); the engine/renderer emit the poster markup
  and data attributes, the behaviour does the swap.
- **`prefers-reduced-motion`:** a non-eager sandbox does **not** auto-activate; the
  poster + an explicit activation control are shown (so motion-sensitive users opt
  in).
- Keep **eager the default** — zero change for existing sandboxes.

## Acceptance Criteria
- [ ] `sandbox` accepts `activation` (`eager` default | `visible` | `click`) and a `poster` image URL.
- [ ] A non-eager sandbox renders the poster and **defers** iframe creation and dependency loading until activated (in view, or clicked) — verified by no early network request for the deps.
- [ ] Under `prefers-reduced-motion`, a non-eager sandbox does not auto-activate; the poster and an explicit activation control are shown.
- [ ] Build/SSR stays green (poster is static markup; the iframe is still `srcdoc` once mounted) and **eager sandboxes are byte-for-byte unchanged** (no regression).
- [ ] Documented on `runes/sandbox.md` with a `visible`+`poster` example, and the behaviour is registered/loaded like the other progressive-enhancement behaviours.

## References
- `packages/runes/src/tags/sandbox.ts` (has `height`; add `activation`/`poster`)
- `packages/runes/src/config.ts` (`Sandbox` — `interactive: true`)
- `packages/behaviors/src/behaviors/` (deferred-mount behaviour); `runes/sandbox.md`
- Consumers (no dependency — these depend on this item): WORK-382 (three.js scene), WORK-350 (index anchor cell)

{% /work %}
