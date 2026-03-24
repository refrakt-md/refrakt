{% work id="WORK-018" status="pending" priority="medium" tags="runes, media" milestone="v1.0.0" %}

# Build `video` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/media`

## Summary

Self-hosted video player with poster image, captions, subtitles, and responsive sizing. For video that you host yourself — use `embed` for YouTube/Vimeo. Schema.org: `VideoObject`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `src` | String | — | Yes | Video file URL |
| `poster` | String | — | No | Poster/thumbnail image URL |
| `captions` | String | — | No | WebVTT captions file URL |
| `subtitles` | String | — | No | WebVTT subtitles file URL |
| `aspect` | String | `'16:9'` | No | Aspect ratio: `16:9`, `4:3`, `1:1`, `9:16` (vertical) |
| `autoplay` | Boolean | `false` | No | Autoplay (muted) |
| `loop` | Boolean | `false` | No | Loop playback |
| `title` | String | — | No | Video title |
| `duration` | String | — | No | ISO 8601 duration |

## Content Model

- Paragraph → video description/caption
- Self-closing is common: `{% video src="/video.mp4" poster="/thumb.jpg" /%}`

## Transform Output

- typeof: `Video`
- Tag: `<figure>`
- Properties: `src`, `poster`, `captions`, `subtitles`, `aspect`, `autoplay`, `loop`, `title`, `duration`
- Refs: `player` (video element), `caption` (figcaption)

## Implementation Tasks

1. Create schema in `runes/media/src/tags/video.ts`
2. Add RuneConfig entry in `runes/media/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/video.css`
4. Import CSS in `packages/lumina/index.css`
5. Implement web component (`rf-video`) for play controls, caption track loading, responsive sizing — follows Diagram/Sandbox/Map pattern
6. Add SEO extractor for `VideoObject`
7. Write tests in `runes/media/test/tags/video.test.ts`
8. Create inspector fixture

## Dependencies

None — standalone web component.

{% /work %}
