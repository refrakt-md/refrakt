---
"@refrakt-md/runes": minor
"@refrakt-md/behaviors": minor
"@refrakt-md/lumina": minor
---

**Deferred sandbox activation** (WORK-381) — keep heavy sandboxes off the critical path. `{% sandbox %}` gains `activation` (`eager` default | `visible` | `click`) and a `poster` image URL. A non-eager sandbox shows the poster and an explicit **Run** control in the iframe's place and defers iframe creation *and* every dependency download until activated — `visible` mounts on scroll-in (`IntersectionObserver`), `click` mounts on user action. Under `prefers-reduced-motion` a non-eager sandbox never auto-activates: the poster and control stay so motion-sensitive visitors opt in. Eager sandboxes are unchanged (no markup or behaviour regression). The site's 3D star-map sitemap now loads only when scrolled into view.
