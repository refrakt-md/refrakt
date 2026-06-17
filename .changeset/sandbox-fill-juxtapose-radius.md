---
"@refrakt-md/skeleton": patch
"@refrakt-md/lumina": patch
---

**Fix `height="fill"` on sandbox; bump juxtapose container radius to `lg` for consistency.**

- **`sandbox height="fill"` now actually fills the host.** The behaviour set the iframe to `height: 100%`, but the `.rf-sandbox` host itself was auto-height, so the iframe's 100% resolved against an undefined containing block and collapsed to the 150px fallback. This only worked in cover media (`media-position="cover"`) where the host was positioned absolutely with `inset: 0`. Any other context — a card with `frame-aspect`, a hero with a media zone, a parent that owns its height some other way — silently produced a 150px iframe. Skeleton now sets `.rf-sandbox[data-height="fill"] { height: 100% }` so the host claims its container's height and the iframe's `100%` means what it says.
- **`juxtapose` panels container radius `md` → `lg`.** A standalone juxtapose now matches the container-radius tier used by card / hero / bento-cell (`--rf-radius-lg`). The existing media-zone-guest override (`--rf-radius-media`) still wins when a juxtapose is dropped into a card's media well, so it never out-rounds its host.
