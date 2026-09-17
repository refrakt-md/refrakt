---
rune: track
title: Audiobook chapter
role: edge-case
notes: >
  WORK-569 — `track`'s own five-value enum, one row per kind. `Chapter` has no
  `byArtist`, so the narrator attribute is not carried across; see
  `playlist.audiobook` for the same judgement at container level.
---
{% track type="chapter" duration="41:12" number=4 %}
# Warriors in the Mist
{% /track %}
