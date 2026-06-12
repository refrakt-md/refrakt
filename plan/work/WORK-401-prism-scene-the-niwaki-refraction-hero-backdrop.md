{% work id="WORK-401" status="done" priority="medium" complexity="moderate" source="SPEC-101" tags="sandbox,showcase,threejs,site,niwaki" milestone="v0.21.0" %}

# Prism scene — the niwaki-refraction hero backdrop

The showcase scene for the animated hero background ({% ref "SPEC-101" /%} §7): the
brand metaphor, literally. A slowly rotating prism; a thin stream of markdown glyph
particles (`#`, `*`, `>`, `{%`) enters one face as a faint **ishi**-tinted beam
(stone grey — undifferentiated input); fanned spectrum streams leave the other in
the **Niwaki** syntax roles — wakaba (keyword green), sakura (function pink), matsu
(pine — link/constant), momiji (string peach, punchy string-expression orange as an
accent). Markdown in, structured meaning out, in the exact colours this site renders
syntax in.

## Acceptance Criteria
- [x] `site/examples/prism-scene/` renders the scene from a version-pinned three.js ESM import; **faked refraction only** — wireframe/flat-shaded prism, additive-blended `Points`/line beams, tinted-copy dispersion; no `MeshPhysicalMaterial` transmission.
- [x] Niwaki light + dark hex pairs drive the theme-aware variants (scene reads the injected theme); values pinned with a comment naming `packages/lumina/src/presets/niwaki.ts` as the palette of record.
- [x] Ambient by contract: no pointer handlers (the cover posture demotion blocks them anyway); the scene carries itself with no interaction.
- [x] Production posture: designed dim (lives under the cover scrim), `devicePixelRatio` capped (~1.5), RAF paused on `visibilitychange`, `prefers-reduced-motion` renders a composed static frame, a CSS gradient on the iframe body covers the boot frame, try/catch static fallback for blocked-CDN/no-WebGL.
- [x] Renders standalone in a plain `{% sandbox src="prism-scene" height=… /%}` (previewable before the hero-cover work lands); `vite build` stays green (no SSR/WebGL at build).

## Approach
- Follow the `site/examples/threejs-scene/index.html` patterns (pinned
  `three@0.160.0`, theme reading, reduced-motion, fallback) and the `sitemap-3d`
  scene's structure for the heavier composition.
- Glyphs as point sprites (canvas-generated textures per glyph); beam/spectrum as
  curve-sampled particle streams; dispersion = three-to-five tinted stream copies
  with small angular offsets.
- Independent of {% ref "WORK-398" /%}/{% ref "WORK-399" /%} — the scene is just an
  examples directory; the hero composition wires it up in the docs item (WORK-402,
  which depends on this).

## References
- {% ref "SPEC-101" /%} §5, §7 · {% ref "WORK-382" /%} (scene patterns) · palette: `packages/lumina/src/presets/niwaki.ts`, `site/content/themes/niwaki.md`

## Resolution

Completed: 2026-06-11

Branch: `claude/spec-101-hero-cover-prism`

### What was done
- `site/examples/prism-scene/index.html` — the niwaki-refraction backdrop. A flat-shaded triangular prism (CylinderGeometry, 3 radial segments) rotating slowly; markdown glyphs (`#`, `*`, `>`, `{%`, `[`, `` ` ``) flow in as an ishi-tinted beam (canvas glyph sprites); five spectrum particle streams fan out in the niwaki roles (wakaba/sakura/matsu/momiji/momiji-punchy) as soft-dot sprites with a widening jitter cone. Hex pairs pinned from `packages/lumina/src/presets/niwaki.ts` (light + dark), with a palette-of-record comment.
- Faked refraction only — no transmission materials. Additive blending in dark mode, normal in light (additive washes out on a light ground).
- Production posture: DPR capped at 1.5, RAF paused on `visibilitychange`, reduced-motion renders one composed static frame (particles mid-flight), the canvas fades in over a CSS gradient boot backdrop, try/catch falls back to a quiet CSS prism (clip-path triangle + five gradient fans — the metaphor survives no-JS/no-WebGL/blocked-CDN).
- No pointer handlers — ambient by the SPEC-090 posture contract.

### Notes
- Module syntax checked; the scene ships embedded in the hero docs page and the site build is green (no SSR/WebGL at build). The actual WebGL render needs a browser glance: `cd site && npm run dev` → /runes/marketing/hero (the animated-background example) in light + dark, plus the reduced-motion still frame.


---

Completed: 2026-06-12

### Superseded in review — wireframe waves
The prism scene shipped, worked, and was pulled on review: too experimental for the
flagship example (user call). Replaced by `site/examples/wireframe-waves/` — the
SPEC-101 "safe classic": a vertex-displaced wireframe plane rolling in slow
sine-sum swells, ishi-stone base with matsu (light) / wakaba (dark) crest tints,
fog fading the far edge into the CSS backdrop. The full production posture carries
over unchanged (pinned three.js, DPR cap 1.5, visibilitychange pause, reduced-motion
static frame, fade-in over the boot gradient, CSS horizon-lines fallback, no pointer
handlers). `site/examples/prism-scene/` removed; docs and records updated.


---

Completed: 2026-06-12

### Fix — canvas pinned to the iframe viewport
The "wireframe cut off at the bottom / fixed aspect" report: directory-mode
sandbox assembly wraps the example's HTML in a plain `<div data-source="HTML">`
(attribute stripped in the iframe, the wrapper stays). That auto-height div sits
between `body` and the canvas, so the canvas's `height: 100%` resolved to auto
and collapsed to its attribute height — a fixed-size strip at the top of the
band. The canvas (and the CSS fallback) are now `position: fixed; inset: 0` —
pinned to the iframe viewport, immune to wrapper structure. The hero docs
authoring contract gained a bullet documenting the pattern.

{% /work %}
