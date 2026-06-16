---
"@refrakt-md/runes": minor
"@refrakt-md/transform": minor
"@refrakt-md/content": minor
"@refrakt-md/skeleton": minor
"@refrakt-md/behaviors": minor
---

**Live sandbox guests in the `bg` backdrop layer (SPEC-104).** A surface can now carry **both** an animated backdrop **and** a positioned subject media — the visualiser is the `bg`, the image/code/embed stays an in-flow media guest, so they stop competing for the single media zone.

- `bg` gains an optional body holding one bare `sandbox`: it's transformed normally (the real rune runs, with file resolution + sanitisation), tagged `data-bg-guest`, and the engine relocates it into the bg layer (a sibling of `bg-video`, above the boot frame, below overlay/scrim). A chromed guest (`video`/`audio`/`figure`) is rejected with a build warning.
- A new **backdrop posture** (`data-guest-posture="backdrop"`): the guest is mounted and running but pointer-inert; the sandbox is forced to `height="fill"` + eager activation, **not** mounted under `prefers-reduced-motion` (the boot frame stands in), and suspended off-screen / on a hidden tab.
- A **named `sandbox` bg preset** (`BgPresetDefinition.sandbox`, project-level `backgrounds` config) applies a reusable scene by name (`bg="midnight-waves"`) like any other preset, resolved at transform time and memoised per scene.
