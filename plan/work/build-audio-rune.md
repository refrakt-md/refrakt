{% work id="WORK-019" status="done" priority="medium" tags="runes, media" %}

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

## Status

Already implemented. Full schema, config, CSS, and tests exist:

- Schema: `runes/media/src/tags/audio.ts` (98 lines)
- Config: `runes/media/src/config.ts` (`Audio`)
- CSS: `packages/lumina/styles/runes/audio.css` (195 lines)
- Type: `runes/media/src/schema/audio.ts` (`Audio` class)
- Tests: `runes/media/test/audio.test.ts`
- Supports: src, playlist linking, title, artist, waveform, inline chapters, `rf-audio` web component

{% /work %}
