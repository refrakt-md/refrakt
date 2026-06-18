---
"@refrakt-md/lumina": patch
---

Round the corners of a `sandbox` like other rich media guests. The iframe canvas is opaque (the behaviour writes `color-scheme` onto the srcdoc, so the browser paints a solid backdrop that `background: transparent` can't see through), so a rounded shape can only come from the embedding element clipping the iframe — but the sandbox owned no radius, so it rendered square (most visibly in a bleed host like a `hero`, where the slot no longer imposes its radius on guests).

The sandbox now owns a `border-radius` and lets the iframe inherit it, so skeleton's `overflow: hidden` clips the iframe to the rounded shape. It mirrors `codegroup`: `radius-container` standalone (and in a bleed host, keeping its own chrome), the smaller media tier when merged into a clip-host well (card/bento), and flush in a full-bleed cover/backdrop.
