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
    const hintRune = runes.hint;
    expect(hintRune.names).toContain('hint');
    expect(hintRune.names).toContain('callout');
    expect(hintRune.names).toContain('alert');

    const gridRune = runes.grid;
    expect(gridRune.names).toContain('grid');
    expect(gridRune.names).toContain('columns');

    const accordionRune = runes.accordion;
    expect(accordionRune.names).toContain('accordion');
    expect(accordionRune.names).toContain('faq');
  });

  it('tags map includes all rune names and aliases', () => {
    for (const rune of Object.values(runes)) {
      for (const name of rune.names) {
        expect(tags[name]).toBeDefined();
        expect(tags[name]).toBe(rune.schema);
      }
    }
  });

  it('runes with seoType declare their schema.org type', () => {
    expect(runes.accordion.seoType).toBe('FAQPage');
    expect(runes.datatable.seoType).toBe('Dataset');
    expect(runes.embed.seoType).toBe('VideoObject');
    expect(runes.breadcrumb.seoType).toBe('BreadcrumbList');
  });

  it('runes without seoType have undefined', () => {
    expect(runes.hint.seoType).toBeUndefined();
    expect(runes.tabs.seoType).toBeUndefined();
  });
});
