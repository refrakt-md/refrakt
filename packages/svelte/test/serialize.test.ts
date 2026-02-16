import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { serialize, serializeTree } from '../src/serialize.js';

describe('serialize', () => {
  it('should pass through null', () => {
    expect(serialize(null)).toBeNull();
  });

  it('should pass through undefined', () => {
    expect(serialize(undefined as any)).toBeUndefined();
  });

  it('should pass through strings', () => {
    expect(serialize('hello')).toBe('hello');
  });

  it('should pass through numbers', () => {
    expect(serialize(42 as any)).toBe(42);
  });

  it('should convert a Tag to a plain object with $$mdtype marker', () => {
    const tag = new Tag('div', { class: 'test' }, ['content']);
    const result = serialize(tag) as any;

    expect(result.$$mdtype).toBe('Tag');
    expect(result.name).toBe('div');
    expect(result.attributes).toEqual({ class: 'test' });
    expect(result.children).toEqual(['content']);
  });

  it('should recursively serialize nested Tags', () => {
    const child = new Tag('span', {}, ['text']);
    const parent = new Tag('div', {}, [child]);
    const result = serialize(parent) as any;

    expect(result.children[0].$$mdtype).toBe('Tag');
    expect(result.children[0].name).toBe('span');
    expect(result.children[0].children).toEqual(['text']);
  });
});

describe('serializeTree', () => {
  it('should serialize an array of nodes', () => {
    const nodes = [
      new Tag('p', {}, ['first']),
      'text between',
      new Tag('p', {}, ['second']),
    ];
    const result = serializeTree(nodes) as any[];

    expect(result).toHaveLength(3);
    expect(result[0].$$mdtype).toBe('Tag');
    expect(result[1]).toBe('text between');
    expect(result[2].$$mdtype).toBe('Tag');
  });

  it('should serialize a single node', () => {
    const tag = new Tag('section', {}, []);
    const result = serializeTree(tag) as any;

    expect(result.$$mdtype).toBe('Tag');
    expect(result.name).toBe('section');
  });
});
