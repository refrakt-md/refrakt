{% work id="WORK-017" status="pending" priority="low" tags="runes, media" source="SPEC-008" %}

# Build `artist` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/media`

## Summary

Creator profile — musician, podcaster, narrator, filmmaker, speaker. Structured biography with discography/body of work. Schema.org: `MusicGroup` or `Person`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `name` | String | — | Yes | Artist/creator name |
| `genre` | String | — | No | Primary genre or field |
| `active` | String | — | No | Active years (e.g., `"2015–present"`) |
| `origin` | String | — | No | Location/origin |

## Content Model

- Header group: heading (name, auto-extracted), image (photo/avatar), paragraphs (bio)
- `## Discography` or `## Works` heading → list of works (links to album/playlist pages)
- `## Links` heading → external links (streaming profiles, website, social)
- Other headings → additional bio sections

## Transform Output

- typeof: `Artist`
- Tag: `<article>` with `property: 'contentSection'`
- Properties: `eyebrow`, `headline`, `image`, `blurb`, `name`, `genre` (span), `active` (span), `origin` (span)
- Refs: `works` (ul), `links` (ul), `bio` (div)

## Implementation Tasks

1. Create schema in `runes/media/src/tags/artist.ts`
2. Add RuneConfig entry in `runes/media/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/artist.css`
4. Import CSS in `packages/lumina/index.css`
5. Add SEO extractor for `MusicGroup`/`Person`
6. Write tests in `runes/media/test/tags/artist.test.ts`
7. Create inspector fixture

## Dependencies

None — standalone rune, though it references album/playlist pages via links.

{% /work %}
