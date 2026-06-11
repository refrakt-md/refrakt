{% work id="WORK-381" status="done" priority="medium" complexity="moderate" tags="sandbox,behaviors,performance,showcase" milestone="v0.21.0" %}

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
- [x] `sandbox` accepts `activation` (`eager` default | `visible` | `click`) and a `poster` image URL.
- [x] A non-eager sandbox renders the poster and **defers** iframe creation and dependency loading until activated (in view, or clicked) — verified by no early network request for the deps.
- [x] Under `prefers-reduced-motion`, a non-eager sandbox does not auto-activate; the poster and an explicit activation control are shown.
- [x] Build/SSR stays green (poster is static markup; the iframe is still `srcdoc` once mounted) and **eager sandboxes are byte-for-byte unchanged** (no regression).
- [x] Documented on `runes/sandbox.md` with a `visible`+`poster` example, and the behaviour is registered/loaded like the other progressive-enhancement behaviours.

## References
- `packages/runes/src/tags/sandbox.ts` (has `height`; add `activation`/`poster`)
- `packages/runes/src/config.ts` (`Sandbox` — `interactive: true`)
- `packages/behaviors/src/behaviors/` (deferred-mount behaviour); `runes/sandbox.md`
- Consumers (no dependency — these depend on this item): WORK-382 (three.js scene), WORK-350 (index anchor cell)

## Resolution

Completed: 2026-06-11

Branch: `claude/work-381-sandbox-lazy-activation`

### What was done
- `packages/runes/src/tags/sandbox.ts` — schema gains `activation` (`eager`|`visible`|`click`, validated) and `poster`. Only non-eager activation emits `data-activation`/`data-poster`, so eager sandboxes are byte-for-byte unchanged.
- `packages/behaviors/src/elements/sandbox.ts` — `RfSandbox` now gates the iframe behind activation. `connectedCallback` caches activation/poster; non-eager calls `renderPoster()` and returns. `activate()` (extracted from the old eager path) builds the iframe + wires theme sync, idempotently. `renderPoster()` draws the poster image + a `.rf-sandbox__activate` Run control; `visible` wires an `IntersectionObserver` (rootMargin 200px) that mounts on scroll-in unless `prefers-reduced-motion`. `setTheme` no-ops before mount; `disconnectedCallback` tears down the observer. The iframe (and all its dependency `<script>`/`<link>` tags inside srcdoc) is never created until activation — nothing downloads early.
- `packages/lumina/styles/runes/sandbox.css` — `.rf-sandbox__poster`, `.rf-sandbox__poster-image`, `.rf-sandbox__activate` (accent button with ▶, hover/focus states).
- `packages/behaviors/test/sandbox.test.ts` — 5 jsdom tests: eager mounts immediately (no poster); click defers then mounts on press; visible auto-mounts via a mocked IntersectionObserver; reduced-motion does not auto-activate (no observer, control shown); unknown activation falls back to eager.
- `site/content/runes/sandbox.md` — new "Deferred activation" section with a `visible`+`poster` example, attribute-table rows, and the heavy 3D sitemap sandbox switched to `activation="visible"` (loads three.js only on scroll-in).
- Changeset `sandbox-lazy-activation.md` (minor: runes, behaviors, lumina).

### Verification
- `packages/behaviors` + `packages/runes` tests green (948 passing incl. the 5 new).
- Full workspace build + SvelteKit site build green. Built `runes/sandbox.html` carries exactly one `data-activation="visible"` (the deferred sitemap); all other (eager) sandboxes emit no activation attribute — confirms the no-regression guarantee.

### Notes
- Implemented entirely on the existing `RfSandbox` custom element rather than a separate behavior function — the element already owns iframe lifecycle, so the activation gate lives where the mount does. No new registration needed; it loads with the other progressive-enhancement elements via `registerElements()`.
- Switching the sitemap sandbox to `activation="visible"` also satisfies WORK-389's deferred criterion 3 (lazy mount / poster until in view); that item can now be closed.

{% /work %}
