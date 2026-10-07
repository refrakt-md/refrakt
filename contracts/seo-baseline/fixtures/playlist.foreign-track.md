---
rune: playlist
title: A track the author nested in unrelated content
role: edge-case
notes: >
  SPEC-146 Problem 1 / WORK-609. The `{% track %}` inside the `{% hint %}` is
  the author's own rune, not one of the playlist's tracks. `playlist`'s schema
  row names its children `track`, which is also a rune name, so before WORK-609
  `findChildren` matched it through the hint and published it as a third track
  of the album — in the JSON-LD graph, with readable values. The playlist should
  publish exactly its own two tracks.
---
{% playlist type="album" artist="Pink Floyd" %}
# The Dark Side of the Moon

- **Speak to Me** (1:13)
- **Breathe** (2:43)

{% hint type="note" %}
Not on the album, but worth hearing alongside it:

{% track artist="Pink Floyd" %}
Echoes
{% /track %}
{% /hint %}
{% /playlist %}
