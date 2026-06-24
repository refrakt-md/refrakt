---
"@refrakt-md/skeleton": patch
"@refrakt-md/lumina": patch
---

Fix steps rune forcing `display: block` on every `<strong>`. The title rule was scoped to `.rf-step strong`, which caught all inline bold in step body text and broke it onto its own line. It now targets only the leading title bold (`.rf-step__content > p:first-child > strong:first-child`), so inline bold renders inline.
