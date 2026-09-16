---
rune: track
title: Standalone podcast episode
role: edge-case
notes: >
  BUG-013's second half, recorded as it stands: `track` validates `type="episode"`
  against its own five-value enum and then emits MusicRecording regardless, exactly
  as `playlist` ignores its own `type`. WORK-569 covers both runes.
---
{% track type="episode" artist="Tech Weekly" duration="42:30" date="March 2025" %}
# Shipping Design Systems

A conversation about rollout strategy.
{% /track %}
