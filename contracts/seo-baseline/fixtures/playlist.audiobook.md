---
rune: playlist
title: Audiobook playlist
role: edge-case
notes: >
  One of the three branch switches (WORK-569): `Audiobook` with `hasPart`
  chapters rather than `MusicPlaylist` with music recordings. `Chapter` is a
  curated judgement with nothing to check it (D5) — schema.org has `Chapter` as a
  CreativeWork part, which is what an audiobook's sections are. The artist is
  deliberately unmapped here: `byArtist` is a MusicRecording property, and
  `Audiobook` carries `author` and `readBy`, which are different claims.
---
{% playlist type="audiobook" artist="Ursula K. Le Guin" %}
# A Wizard of Earthsea

- **Warriors in the Mist** (41:12)
- **The Shadow** (38:44)
{% /playlist %}
