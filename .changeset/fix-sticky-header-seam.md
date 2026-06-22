---
"@refrakt-md/skeleton": patch
---

**Fixed the gap that could appear between a sticky header and the bar below it while scrolling.** Layout headers (`.rf-header`, `.rf-docs-header`, `.rf-blog-header`) now pin their height to `--rf-header-height` instead of being content-driven, so the sticky offsets that dock below them — the docs mobile toolbar and the mobile nav panel — line up exactly with the header bottom. Previously a header that rendered shorter than the assumed `3.5rem` left a strip where page content scrolled through between the two bars (and a taller one overlapped). The docs toolbar also hard-coded the `3.5rem` literal rather than reading the token, so layout overrides like the blog layout's `4.25rem` never reached it; all offsets now derive from `--rf-header-height`. Sites whose header needs to be taller should set `--rf-header-height` on their layout root.
