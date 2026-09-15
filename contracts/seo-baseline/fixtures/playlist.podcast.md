---
rune: playlist
title: Podcast playlist
role: edge-case
notes: >
  BUG-013, recorded as it stands: `type="podcast"` validates against the rune's
  five-value enum and then emits MusicPlaylist with MusicRecording episodes
  unconditionally. Should be PodcastSeries / PodcastEpisode. WORK-569 fixes it,
  and the fix must show as a diff here.
---
{% playlist type="podcast" %}
# Design Systems Weekly

A podcast about building and scaling design systems.

- **Component Libraries at Scale** (45:30) — March 2025
- **Token Architecture** (38:15) — February 2025
{% /playlist %}
