{% work id="WORK-015" status="done" priority="medium" tags="runes, media" %}

# Build `track` and `playlist` Runes

> Ref: SPEC-008 (Unbuilt Runes), SPEC-006 (Media Runes) — Package: `@refrakt-md/media`

## Summary

`track` is a single media item (song, podcast episode, audiobook chapter, talk, or video). `playlist` is an ordered collection of tracks (album tracklist, podcast feed, video series, audiobook TOC). These replace the existing `music-recording` and `music-playlist` runes with a type-polymorphic design.

These two runes are tightly coupled — playlist defines a compact Markdown-native format that parses into tracks — so they're built together.

## Migration from Existing Runes

| Existing | New | Attribute changes |
|----------|-----|-------------------|
| `music-recording` | `track` with `type="song"` | `byArtist` → `artist`, `copyrightYear` → `year` |
| `music-playlist` | `playlist` with `type="album"` | Remove `trackFields`, `split`, `mirror`. Add `artist`. |

Existing runes continue as aliases during transition.

## Track Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `type` | String | `'song'` | No | `song`, `episode`, `chapter`, `talk`, `video` |
| `artist` | String | — | No | Creator/performer name |
| `album` | String | — | No | Parent collection |
| `duration` | String | — | No | ISO 8601 duration (formatted to `3:45` display) |
| `year` | Number | — | No | Release year |
| `number` | Number | — | No | Track/episode/chapter number |
| `url` | String | — | No | Link to the media |
| `date` | String | — | No | Publication date (ISO 8601, for episodes/series) |
| `listItem` | Boolean | `false` | No | Render as `<li>` instead of `<div>` |

## Playlist Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `type` | String | `'album'` | No | `album`, `podcast`, `audiobook`, `series`, `mix` |
| `artist` | String | — | No | Default artist inherited by all child tracks |
| `audio` | String | — | No | Audio file URL for embedded playback |

## Compact Track Format (Markdown-native)

Per SPEC-006, track metadata uses Markdown formatting constructs instead of pipe-delimited strings:

| Markdown construct | Track field | Example |
|---|---|---|
| **Bold text** | Track name | `**Bohemian Rhapsody**` |
| Link wrapping the name | Audio source (`src`) | `[**Breathe**](/audio/breathe.mp3)` |
| *Italic text* | Artist | `*Queen*` |
| `(duration)` | Duration | `(5:55)` |
| Text after em-dash | Date or context | `— 2024-01-15` |

When `artist` is set on the playlist, parsed list-item tracks inherit it as their default artist.

## Transform Output

**Track:**
- typeof: `Track`
- Tag: `<div>` or `<li>`
- Properties: `name` (h-element), `artist` (span), `album` (span), `duration` (span, formatted), `year` (span), `number` (span), `url` (a), `date` (span), `type`

**Playlist:**
- typeof: `Playlist`
- Tag: `<section>`
- Properties: `eyebrow`, `headline`, `image`, `blurb`, `type`, `artist` (span)
- Refs: `tracks` (ol of track items)

## Status

Already implemented. Both runes have full schemas, configs, CSS, tests, and legacy aliases:

- Track schema: `runes/media/src/tags/track.ts` (129 lines)
- Playlist schema: `runes/media/src/tags/playlist.ts` (323 lines)
- Config: `runes/media/src/config.ts` (`Track`, `Playlist`, `MusicRecording`, `MusicPlaylist`)
- CSS: `packages/lumina/styles/runes/track.css` + `playlist.css`
- Tests: `runes/media/test/track.test.ts`, `playlist.test.ts`, `music-playlist.test.ts`
- Legacy aliases: `music-recording` → `Track`, `music-playlist` → `Playlist` (with deprecation notices)
- Duration utilities: `runes/media/src/duration.ts`
- SEO tests: `runes/media/test/seo.test.ts`

{% /work %}
