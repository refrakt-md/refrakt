import { describe, it, expect } from 'vitest';
import { runes, tags } from '../src/index.js';

describe('Rune abstraction', () => {
  it('all runes have a name matching their key or a valid name', () => {
    for (const [key, rune] of Object.entries(runes)) {
      expect(rune.name).toBe(key);
      expect(rune.name.length).toBeGreaterThan(0);
    }
  });

  it('all runes have a schema', () => {
    for (const rune of Object.values(runes)) {
      expect(rune.schema).toBeDefined();
    }
  });

  it('all runes have a description', () => {
    for (const rune of Object.values(runes)) {
      expect(rune.description.length).toBeGreaterThan(0);
    }
  });

  it('rune.names includes primary name and aliases', () => {
    const ctaRune = runes.cta;
    expect(ctaRune.names).toContain('cta');
    expect(ctaRune.names).toContain('call-to-action');

    const hintRune = runes.hint;
    expect(hintRune.names).toContain('hint');
    expect(hintRune.names).toContain('callout');
    expect(hintRune.names).toContain('alert');

    const gridRune = runes.grid;
    expect(gridRune.names).toContain('grid');
    expect(gridRune.names).toContain('columns');
  });

  it('tags map includes all rune names and aliases', () => {
    for (const rune of Object.values(runes)) {
      for (const name of rune.names) {
        expect(tags[name]).toBeDefined();
        expect(tags[name]).toBe(rune.schema);
      }
    }
  });

  it('runes with reinterprets describe their markdown reinterpretation', () => {
    const stepsRune = runes.steps;
    expect(stepsRune.reinterprets.heading).toBe('step name');

    const ctaRune = runes.cta;
    expect(ctaRune.reinterprets.fence).toBe('command');
  });

  it('runes with seoType declare their schema.org type', () => {
    expect(runes.pricing.seoType).toBe('Product');
    expect(runes.tier.seoType).toBe('Offer');
    expect(runes['music-playlist'].seoType).toBe('MusicPlaylist');
    expect(runes['music-recording'].seoType).toBe('MusicRecording');
  });

  it('runes without seoType have undefined', () => {
    expect(runes.hint.seoType).toBeUndefined();
    expect(runes.tabs.seoType).toBeUndefined();
  });
});
