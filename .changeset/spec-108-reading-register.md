---
"@refrakt-md/transform": minor
"@refrakt-md/runes": minor
"@refrakt-md/lumina": minor
"@refrakt-md/skeleton": minor
"@refrakt-md/storytelling": minor
"@refrakt-md/cli": minor
"@refrakt-md/editor": minor
---

**Reading register: editorial body text via a `reading` axis (`fine` / `ui` / `prose`).** A new body-text classification refines `data-section="body"` as `data-reading`, resolved author `reading=` ▸ rune `defaultReading` ▸ layout/region default ▸ `ui` (the engine emits it, suppressed at the `ui` default so unmarked content stays byte-identical). Lumina interprets `prose` with a theme-owned editorial treatment — capped measure (independent of `width`), paragraph rhythm, and running-text niceties — keyed on `[data-reading]`, not rune-name lists. `dropcap` is generalised to a universal, prose-gated opt-in (honoured only where the body reads as `prose`), with the block editor surfacing its toggle by deriving it from the resolved register via the shared `resolveReading()` + `READING_CAPABILITIES`. The `blog-article` body and editorial runes (`pullquote`, `textblock`, `lore`) default to `prose`; the gallery grows a reading subject guarding the treatment in light + dark.
