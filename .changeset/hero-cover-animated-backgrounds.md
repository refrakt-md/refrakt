---
"@refrakt-md/marketing": minor
"@refrakt-md/runes": minor
"@refrakt-md/transform": minor
"@refrakt-md/behaviors": minor
"@refrakt-md/lumina": minor
---

**Hero cover layout + animated sandbox backgrounds** (SPEC-101). `hero` is now a first-class `media-position="cover"` host: the media well fills the section interior and the headline/blurb/actions overlay it, with the cover knobs (`content-place`, `height`, `aspect`), a band-appropriate height authority (a viewport-relative floor instead of the 3/4 tile default), root padding rerouted to the overlay, and a centred-band overlay default with an even scrim. Any non-`img`/`video` media guest now fills a cover well; `sandbox` gains `height="fill"` (iframe pinned to 100%, auto-resize negotiation disabled), applied automatically when a sandbox is a cover backdrop — so a live three.js scene drops into a hero as a full-bleed, inert animated background. A non-eager (`activation="visible"|"click"`) sandbox under cover warns at build time (the Run affordance is unreachable on an inert backdrop). Ships with the wireframe-waves showcase (`site/examples/wireframe-waves/`) — a displaced wireframe terrain whose crests pick up the niwaki palette. Also fixes nested-density title sizing: `[data-section="title"]` now sizes via `--rf-title-size` (set per density root), so a full-density rune inside a compact host (a hero in a `preview`) keeps its real title size.
