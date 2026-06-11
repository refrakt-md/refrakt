---
"@refrakt-md/runes": patch
"@refrakt-md/cli": minor
---

**`reference list` / `reference dump` are now site-aware** (`--site <name>`) — they resolve a multi-site config's per-site `plugins` (and `runes`) instead of only reading the flat single-site shape, so the rune reference for a multi-site project includes its plugin runes, not just core.

**xref no longer warns on same-destination name collisions.** With SPEC-092's typed page entities, a `/runes/<x>` doc page is registered as both a `page` and a `rune` of the same name — an `{% xref %}` by that name matched both and warned, even though both resolve to the *same URL*. The resolver now only warns when the candidates' destinations actually diverge.
