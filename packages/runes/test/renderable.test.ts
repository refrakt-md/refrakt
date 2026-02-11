import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { RenderableNodeCursor } from '../src/lib/renderable.js';

function makeTags() {
  const span1 = new Tag('span', {}, ['hello']);
  const span2 = new Tag('span', {}, ['world']);
  const p = new Tag('p', { typeof: 'Paragraph' }, [span1, ' ', span2]);
  const h1 = new Tag('h1', {}, ['Title']);
  const h2 = new Tag('h2', {}, ['Subtitle']);
  const div = new Tag('div', {}, [h1, p, h2]);
  return { span1, span2, p, h1, h2, div };
}

describe('RenderableNodeCursor', () => {
  it('tag() filters by tag name', () => {
    const { div, h1, p, h2 } = makeTags();
    const cursor = new RenderableNodeCursor([h1, p, h2]);

    expect(cursor.tag('p').count()).toBe(1);
    expect(cursor.tag('p').nodes[0]).toBe(p);
    expect(cursor.tag('h1').count()).toBe(1);
    expect(cursor.tag('h3').count()).toBe(0);
  });

  it('tags() filters by multiple tag names', () => {
    const { h1, p, h2 } = makeTags();
    const cursor = new RenderableNodeCursor([h1, p, h2]);

    expect(cursor.tags('h1', 'h2').count()).toBe(2);
  });

  it('headings() returns all heading tags', () => {
    const { h1, p, h2 } = makeTags();
    const cursor = new RenderableNodeCursor([h1, p, h2]);

    expect(cursor.headings().count()).toBe(2);
  });

  it('typeof() filters by typeof attribute', () => {
    const { h1, p, h2 } = makeTags();
    const cursor = new RenderableNodeCursor([h1, p, h2]);

    expect(cursor.typeof('Paragraph').count()).toBe(1);
    expect(cursor.typeof('Paragraph').nodes[0]).toBe(p);
  });

  it('wrap() wraps nodes in a new tag', () => {
    const { h1 } = makeTags();
    const cursor = new RenderableNodeCursor([h1]);
    const wrapped = cursor.wrap('header');

    expect(wrapped.count()).toBe(1);
    expect(wrapped.nodes[0].name).toBe('header');
    expect(wrapped.nodes[0].children[0]).toBe(h1);
  });

  it('concat() combines cursors', () => {
    const { h1, p } = makeTags();
    const a = new RenderableNodeCursor([h1]);
    const b = new RenderableNodeCursor([p]);

    expect(a.concat(b).count()).toBe(2);
  });

  it('flatten() yields all descendants without duplicates', () => {
    const { div, h1, p, h2, span1, span2 } = makeTags();
    const cursor = new RenderableNodeCursor([div]);
    const flat = cursor.flatten();

    // Count how many times each tag appears
    const tagNames = flat.nodes.filter(n => Tag.isTag(n)).map(n => (n as Tag).name);

    // Each tag should appear exactly once
    const divCount = tagNames.filter(n => n === 'div').length;
    const h1Count = tagNames.filter(n => n === 'h1').length;
    const pCount = tagNames.filter(n => n === 'p').length;
    const spanCount = tagNames.filter(n => n === 'span').length;

    expect(divCount).toBe(1);
    expect(h1Count).toBe(1);
    expect(pCount).toBe(1);
    expect(spanCount).toBe(2);
  });

  it('limit() restricts to N nodes', () => {
    const { h1, p, h2 } = makeTags();
    const cursor = new RenderableNodeCursor([h1, p, h2]);

    expect(cursor.limit(2).count()).toBe(2);
    expect(cursor.limit(0).count()).toBe(0);
  });

  it('slice() returns a subset', () => {
    const { h1, p, h2 } = makeTags();
    const cursor = new RenderableNodeCursor([h1, p, h2]);

    expect(cursor.slice(1).count()).toBe(2);
    expect(cursor.slice(1, 2).count()).toBe(1);
    expect(cursor.slice(1, 2).nodes[0]).toBe(p);
  });

  it('next() returns nodes sequentially', () => {
    const { h1, p, h2 } = makeTags();
    const cursor = new RenderableNodeCursor([h1, p, h2]);

    expect(cursor.next()).toBe(h1);
    expect(cursor.next()).toBe(p);
    expect(cursor.next()).toBe(h2);
  });

  it('toArray() returns the underlying nodes', () => {
    const { h1, p } = makeTags();
    const cursor = new RenderableNodeCursor([h1, p]);

    expect(cursor.toArray()).toEqual([h1, p]);
  });
});
