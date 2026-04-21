{% work id="WORK-016" status="pending" priority="low" tags="runes, media" source="SPEC-008" %}

# Build `album` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/media`

## Summary

Grouped release — a music album, podcast season, video season, lecture series. Higher-level grouping than playlist. Schema.org varies by type: `MusicAlbum`, `PodcastSeason`, `TVSeason`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `type` | String | `'music'` | No | `music`, `podcast`, `video`, `lectures` |
| `artist` | String | — | No | Primary creator |
| `year` | Number | — | No | Release year |
| `label` | String | — | No | Record label, network, or publisher |
| `genre` | String | — | No | Genre or category |

## Content Model

- Header group: heading (album title), paragraph (description), image (cover art)
- Body: `{% playlist %}` or `{% track %}` children, or list items for tracks
- Headings in body → disc/side/part separators

## Transform Output

- typeof: `Album`
- Tag: `<article>` with `property: 'contentSection'`
- Properties: `eyebrow`, `headline`, `image`, `blurb`, `artist` (span), `year` (span), `label` (span), `genre` (span), `type`
- Refs: `tracklist` (ol or grouped ols)

## Implementation Tasks

1. Create schema in `runes/media/src/tags/album.ts`
2. Add RuneConfig entry in `runes/media/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/album.css`
4. Import CSS in `packages/lumina/index.css`
5. Add SEO extractors for `MusicAlbum`, `PodcastSeason`, etc.
6. Write tests in `runes/media/test/tags/album.test.ts`
7. Create inspector fixture

## Dependencies

- Requires `track` and `playlist` runes ({% ref "WORK-015" /%}) to exist as child content

{% /work %}
