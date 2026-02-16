import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { getRune, getAllRunes, getAllNames, findSimilar } from '../src/registry/loader.js';

describe('registry loader', () => {
  it('loads all runes', () => {
    const runes = getAllRunes();
    expect(runes.length).toBeGreaterThan(40);
  });

  it('resolves primary name', () => {
    const hint = getRune('hint');
    expect(hint).toBeDefined();
    expect(hint!.name).toBe('hint');
    expect(hint!.description).toContain('Callout');
  });

  it('resolves alias to same rune info', () => {
    const callout = getRune('callout');
    const hint = getRune('hint');
    expect(callout).toBe(hint);
  });

  it('returns undefined for unknown rune', () => {
    expect(getRune('nonexistent-rune')).toBeUndefined();
  });

  it('allNames includes both primary and aliases', () => {
    const names = getAllNames();
    expect(names.has('hint')).toBe(true);
    expect(names.has('callout')).toBe(true);
    expect(names.has('alert')).toBe(true);
    expect(names.has('faq')).toBe(true); // alias for accordion
  });

  it('provides attribute metadata', () => {
    const hint = getRune('hint');
    expect(hint).toBeDefined();
    expect(hint!.attributes).toBeDefined();
    expect(hint!.attributes.type).toBeDefined();
    expect(hint!.attributes.type.type).toBe(String);
    expect(hint!.attributes.type.matches).toContain('note');
    expect(hint!.attributes.type.matches).toContain('warning');
  });

  it('provides reinterprets metadata', () => {
    const hero = getRune('hero');
    expect(hero).toBeDefined();
    expect(hero!.reinterprets.heading).toBeDefined();
    expect(hero!.reinterprets.image).toBeDefined();
  });

  it('provides seoType when available', () => {
    const recipe = getRune('recipe');
    expect(recipe!.seoType).toBe('Recipe');
  });
});

describe('findSimilar', () => {
  it('suggests correct names for typos', () => {
    const results = findSimilar('hnt');
    expect(results).toContain('hint');
  });

  it('suggests aliases too', () => {
    const results = findSimilar('alrt');
    expect(results).toContain('alert');
  });

  it('returns empty for completely unrelated names', () => {
    const results = findSimilar('xyzzy', 1);
    expect(results).toHaveLength(0);
  });

  it('sorts by distance', () => {
    const results = findSimilar('tab');
    // 'tab' itself won't be returned (distance 0), but 'tabs' (distance 1) should be first
    expect(results[0]).toBe('tabs');
  });
});
