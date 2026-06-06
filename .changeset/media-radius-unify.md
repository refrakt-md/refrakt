---
"@refrakt-md/lumina": patch
---

Unify the media-zone corner radius with the card radius. Media slots
(`[data-section="media"]`, shared by card, recipe, bento cell, feature, hero,
realm, faction) rounded at `--rf-radius-lg` while their containers round at
`--rf-radius-md`, so images looked more rounded than the card holding them.
The media zone now uses `--rf-radius-md`, and recipe's redundant `lg` image
override is removed (figure was already `md`).
