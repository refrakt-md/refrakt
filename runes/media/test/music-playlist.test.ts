import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('music-playlist legacy tag', () => {
  it('should create a Playlist component via legacy name', () => {
    const result = parse(`{% music-playlist %}
# My Playlist

A collection of great tracks.

- **Track One** (3:00)
- **Track Two** (4:00)
{% /music-playlist %}`);

    // Legacy name produces data-rune='playlist' (schema name)
    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should extract tracks from bold-formatted list items', () => {
    const result = parse(`{% music-playlist %}
# Playlist

- **Song One** (3:00)
- **Song Two** (4:00)
- **Song Three** (5:00)
{% /music-playlist %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
    const trackNames = findAllTags(tag!, t => t.attributes['data-name'] === 'track-name');
    expect(trackNames.length).toBe(3);
  });

  it('should extract header from heading and paragraph', () => {
    const result = parse(`{% music-playlist %}
# Summer Vibes

The best summer tunes.

- **Track One** (3:00)
{% /music-playlist %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
    expect(tag).toBeDefined();

    const header = findTag(tag!, t => t.attributes['data-name'] === 'header');
    expect(header).toBeDefined();
  });
});
