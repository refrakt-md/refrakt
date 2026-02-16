import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('music-playlist tag', () => {
  it('should create a MusicPlaylist component', () => {
    const result = parse(`{% music-playlist %}
# My Playlist

A collection of great tracks.

- Track One — Artist A
- Track Two — Artist B
{% /music-playlist %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'MusicPlaylist');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should create MusicRecording children from list items', () => {
    const result = parse(`{% music-playlist %}
# Playlist

- Song One — Band A
- Song Two — Band B
- Song Three — Band C
{% /music-playlist %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'MusicPlaylist');
    const tracks = findAllTags(tag!, t => t.attributes.typeof === 'MusicRecording');
    expect(tracks.length).toBe(3);
  });

  it('should extract header from heading and paragraph', () => {
    const result = parse(`{% music-playlist %}
# Summer Vibes

The best summer tunes.

- Track One — Artist
{% /music-playlist %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'MusicPlaylist');
    expect(tag).toBeDefined();

    const heading = findTag(tag!, t => t.name === 'h1');
    expect(heading).toBeDefined();
  });
});
