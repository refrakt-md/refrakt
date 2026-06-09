---
"@refrakt-md/runes": patch
---

`card` now recognizes its title as the first *heading* in the body rather than
only the first child, so a composed header (e.g. a `{% bar %}` strip before the
title) no longer leaves the title carrying a prose-sized top margin. Fixes the
gap between a bar header and the title in `backlog` cards.
