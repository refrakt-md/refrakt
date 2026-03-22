{% work id="WORK-019" status="pending" priority="medium" tags="runes, media" %}

# Build `audio` Rune

> Ref: SPEC-008 (Unbuilt Runes) — Package: `@refrakt-md/media`

## Summary

Self-hosted audio player with waveform visualization, chapters, and transcript. For podcasts, music, audiobooks, and sound design hosted on your own server. Schema.org: `AudioObject`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `src` | String | — | Yes | Audio file URL |
| `title` | String | — | No | Track title |
| `artist` | String | — | No | Artist/speaker name |
| `duration` | String | — | No | ISO 8601 duration |
| `waveform` | Boolean | `true` | No | Show waveform visualization |
| `chapters` | String | — | No | WebVTT chapters file URL |

## Content Model

- Paragraph → description/show notes
- Ordered list → chapter markers (if no WebVTT file): `1. 00:00 — Introduction`
- Blockquotes → transcript excerpts

## Transform Output

- typeof: `Audio`
- Tag: `<figure>`
- Properties: `src`, `title`, `artist` (span), `duration` (span, formatted), `waveform`, `chapters`
- Refs: `player` (audio element), `chapterList` (ol), `transcript` (div), `caption` (figcaption)

## Implementation Tasks

1. Create schema in `runes/media/src/tags/audio.ts`
2. Add RuneConfig entry in `runes/media/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/audio.css`
4. Import CSS in `packages/lumina/index.css`
5. Implement web component (`rf-audio`) for playback controls, chapter sync, and waveform visualization
6. Waveform: either pre-computed waveform data file or client-side Web Audio API analysis
7. Add SEO extractor for `AudioObject`
8. Write tests in `runes/media/test/tags/audio.test.ts`
9. Create inspector fixture

## Dependencies

None — standalone web component, though waveform visualization adds complexity.

{% /work %}
