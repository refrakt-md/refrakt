---
"@refrakt-md/transform": patch
"@refrakt-md/marketing": patch
"@refrakt-md/lumina": patch
---

Add a `contentMeasure` axis so page sections keep their content readable when bled to the `wide` track. Previously `width="wide"` widened both a section's background *and* its content, while `width="full"` widened only the background (content stayed anchored to the text measure) — an inconsistency for runes like `hero` and `feature`.

`RuneConfig.contentMeasure: 'anchored' | 'fill'` (default `fill`) is emitted as `data-content-measure`. `anchored` runes (hero, cta, feature) keep their content at the text measure at `width="wide"` so only the surface/gradient bleeds, matching `width="full"`. `fill` runes (card, table, bento) keep the "break gently out of the text column" behavior. `width="full"` still anchors content into a band for every rune, so composing any rune into a hero (`elevation="flush" width="full"`) is unchanged.
