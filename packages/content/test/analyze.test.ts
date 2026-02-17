import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import * as path from 'node:path';
import { collectRuneTypes, analyzeRuneUsage } from '../src/analyze.js';
import { loadContent } from '../src/site.js';

describe('collectRuneTypes', () => {
  it('should collect typeof from a single tag', () => {
    const tag = new Tag('section', { typeof: 'Accordion' }, []);
    expect(collectRuneTypes(tag)).toEqual(new Set(['Accordion']));
  });

  it('should collect typeof from nested tags', () => {
    const inner = new Tag('div', { typeof: 'AccordionItem' }, ['content']);
    const outer = new Tag('section', { typeof: 'Accordion' }, [inner]);
    expect(collectRuneTypes(outer)).toEqual(new Set(['Accordion', 'AccordionItem']));
  });

  it('should handle string nodes', () => {
    const tag = new Tag('section', { typeof: 'Hint' }, ['just a string']);
    expect(collectRuneTypes(tag)).toEqual(new Set(['Hint']));
  });

  it('should handle null nodes', () => {
    expect(collectRuneTypes(null)).toEqual(new Set());
  });

  it('should handle arrays of nodes', () => {
    const a = new Tag('div', { typeof: 'Tabs' }, []);
    const b = new Tag('div', { typeof: 'Steps' }, []);
    expect(collectRuneTypes([a, b])).toEqual(new Set(['Tabs', 'Steps']));
  });

  it('should ignore tags without typeof', () => {
    const tag = new Tag('div', { class: 'foo' }, []);
    expect(collectRuneTypes(tag)).toEqual(new Set());
  });

  it('should handle deeply nested trees', () => {
    const deep = new Tag('span', { typeof: 'Diff' }, []);
    const mid = new Tag('div', {}, [deep]);
    const top = new Tag('section', { typeof: 'Compare' }, [mid]);
    expect(collectRuneTypes(top)).toEqual(new Set(['Compare', 'Diff']));
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
      new Tag('section', { typeof: 'Hint' }, ['note']),
      new Tag('section', { typeof: 'Steps' }, []),
    ]);

    const page = {
      route: { url: '/test' },
      renderable,
      layout: { chain: [], regions: new Map() },
    } as any;

    const report = analyzeRuneUsage([page]);
    expect(report.allTypes).toEqual(new Set(['Hint', 'Steps']));
    expect(report.perPage.get('/test')).toEqual(new Set(['Hint', 'Steps']));
  });

  it('should include layout region types', () => {
    const renderable = new Tag('article', {}, [
      new Tag('section', { typeof: 'Hero' }, []),
    ]);

    const navTag = new Tag('nav', { typeof: 'Nav' }, []);

    const regions = new Map([
      ['sidebar', { name: 'sidebar', mode: 'replace' as const, content: [navTag] }],
    ]);

    const page = {
      route: { url: '/test' },
      renderable,
      layout: { chain: [], regions },
    } as any;

    const report = analyzeRuneUsage([page]);
    expect(report.allTypes).toEqual(new Set(['Hero', 'Nav']));
    expect(report.perPage.get('/test')).toEqual(new Set(['Hero', 'Nav']));
  });

  it('should aggregate types across multiple pages', () => {
    const page1 = {
      route: { url: '/a' },
      renderable: new Tag('div', {}, [new Tag('section', { typeof: 'Tabs' }, [])]),
      layout: { chain: [], regions: new Map() },
    } as any;

    const page2 = {
      route: { url: '/b' },
      renderable: new Tag('div', {}, [new Tag('section', { typeof: 'Accordion' }, [])]),
      layout: { chain: [], regions: new Map() },
    } as any;

    const report = analyzeRuneUsage([page1, page2]);
    expect(report.allTypes).toEqual(new Set(['Tabs', 'Accordion']));
    expect(report.perPage.get('/a')).toEqual(new Set(['Tabs']));
    expect(report.perPage.get('/b')).toEqual(new Set(['Accordion']));
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
