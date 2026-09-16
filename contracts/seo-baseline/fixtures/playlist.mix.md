---
rune: playlist
title: Mix playlist
role: edge-case
notes: >
  The one playlist kind WORK-569 leaves alone. `MusicPlaylist` is the right type
  for a mix — there is no narrower one — so this row is the control: if a change
  to the table moves it, the change reached further than intended.
---
{% playlist type="mix" artist="Various" %}
# Late Night Drive

- **Nightcall** (4:18)
- **Midnight City** (4:03)
{% /playlist %}
