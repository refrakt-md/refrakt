import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import * as path from 'node:path';
import { collectRuneTypes, analyzeRuneUsage } from '../src/analyze.js';
import { loadContent } from '../src/site.js';

describe('collectRuneTypes', () => {
  it('should collect typeof from a single tag', () => {
    const tag = new Tag('section', { 'data-rune': 'accordion' }, []);
    expect(collectRuneTypes(tag)).toEqual(new Set(['accordion']));
  });

  it('should collect typeof from nested tags', () => {
    const inner = new Tag('div', { 'data-rune':'accordionitem' }, ['content']);
    const outer = new Tag('section', { 'data-rune':'accordion' }, [inner]);
    expect(collectRuneTypes(outer)).toEqual(new Set(['accordion', 'accordionitem']));
  });

  it('should handle string nodes', () => {
    const tag = new Tag('section', { 'data-rune':'hint' }, ['just a string']);
    expect(collectRuneTypes(tag)).toEqual(new Set(['hint']));
  });

  it('should handle null nodes', () => {
    expect(collectRuneTypes(null)).toEqual(new Set());
  });

  it('should handle arrays of nodes', () => {
    const a = new Tag('div', { 'data-rune':'tabs' }, []);
    const b = new Tag('div', { 'data-rune':'steps' }, []);
    expect(collectRuneTypes([a, b])).toEqual(new Set(['tabs', 'steps']));
  });

  it('should ignore tags without typeof', () => {
    const tag = new Tag('div', { class: 'foo' }, []);
    expect(collectRuneTypes(tag)).toEqual(new Set());
  });

  it('should handle deeply nested trees', () => {
    const deep = new Tag('span', { 'data-rune':'diff' }, []);
    const mid = new Tag('div', {}, [deep]);
    const top = new Tag('section', { 'data-rune':'compare' }, [mid]);
    expect(collectRuneTypes(top)).toEqual(new Set(['compare', 'diff']));
  });
});

describe('analyzeRuneUsage', () => {
  it('should return empty report for empty pages', () => {
    const report = analyzeRuneUsage([]);
    expect(report.allTypes.size).toBe(0);
    expect(report.perPage.size).toBe(0);
  });

  it('should analyze page renderables', () => {
    const renderable = new Tag('article', {}, [
      new Tag('section', { 'data-rune':'hint' }, ['note']),
      new Tag('section', { 'data-rune':'steps' }, []),
    ]);

    const page = {
      route: { url: '/test' },
      renderable,
      layout: { chain: [], regions: new Map() },
    } as any;

    const report = analyzeRuneUsage([page]);
    expect(report.allTypes).toEqual(new Set(['hint', 'steps']));
    expect(report.perPage.get('/test')).toEqual(new Set(['hint', 'steps']));
  });

  it('should include layout region types', () => {
    const renderable = new Tag('article', {}, [
      new Tag('section', { 'data-rune':'hero' }, []),
    ]);

    const navTag = new Tag('nav', { 'data-rune':'nav' }, []);

    const regions = new Map([
      ['sidebar', { name: 'sidebar', mode: 'replace' as const, content: [navTag] }],
    ]);

    const page = {
      route: { url: '/test' },
      renderable,
      layout: { chain: [], regions },
    } as any;

    const report = analyzeRuneUsage([page]);
    expect(report.allTypes).toEqual(new Set(['hero', 'nav']));
    expect(report.perPage.get('/test')).toEqual(new Set(['hero', 'nav']));
  });

  it('should aggregate types across multiple pages', () => {
    const page1 = {
      route: { url: '/a' },
      renderable: new Tag('div', {}, [new Tag('section', { 'data-rune':'tabs' }, [])]),
      layout: { chain: [], regions: new Map() },
    } as any;

    const page2 = {
      route: { url: '/b' },
      renderable: new Tag('div', {}, [new Tag('section', { 'data-rune':'accordion' }, [])]),
      layout: { chain: [], regions: new Map() },
    } as any;

    const report = analyzeRuneUsage([page1, page2]);
    expect(report.allTypes).toEqual(new Set(['tabs', 'accordion']));
    expect(report.perPage.get('/a')).toEqual(new Set(['tabs']));
    expect(report.perPage.get('/b')).toEqual(new Set(['accordion']));
  });

  const fixtureDir = path.resolve(import.meta.dirname, 'fixtures/site');

  it('should work with real loaded content', async () => {
    const site = await loadContent(fixtureDir);
    const report = analyzeRuneUsage(site.pages);

    expect(report.allTypes).toBeInstanceOf(Set);
    expect(report.perPage).toBeInstanceOf(Map);
    expect(report.perPage.size).toBe(site.pages.length);
  });
});
