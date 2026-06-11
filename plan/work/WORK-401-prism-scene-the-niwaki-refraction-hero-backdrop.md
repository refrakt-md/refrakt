{% work id="WORK-401" status="in-progress" priority="medium" complexity="moderate" source="SPEC-101" tags="sandbox,showcase,threejs,site,niwaki" milestone="v0.21.0" %}

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
- [ ] `site/examples/prism-scene/` renders the scene from a version-pinned three.js ESM import; **faked refraction only** — wireframe/flat-shaded prism, additive-blended `Points`/line beams, tinted-copy dispersion; no `MeshPhysicalMaterial` transmission.
- [ ] Niwaki light + dark hex pairs drive the theme-aware variants (scene reads the injected theme); values pinned with a comment naming `packages/lumina/src/presets/niwaki.ts` as the palette of record.
- [ ] Ambient by contract: no pointer handlers (the cover posture demotion blocks them anyway); the scene carries itself with no interaction.
- [ ] Production posture: designed dim (lives under the cover scrim), `devicePixelRatio` capped (~1.5), RAF paused on `visibilitychange`, `prefers-reduced-motion` renders a composed static frame, a CSS gradient on the iframe body covers the boot frame, try/catch static fallback for blocked-CDN/no-WebGL.
- [ ] Renders standalone in a plain `{% sandbox src="prism-scene" height=… /%}` (previewable before the hero-cover work lands); `vite build` stays green (no SSR/WebGL at build).

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

{% /work %}
