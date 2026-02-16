import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { generateIdIfMissing, extractHeadings, headingsToList, walkTag } from '../src/util.js';

describe('generateIdIfMissing', () => {
  it('should generate an id for tag nodes without one', () => {
    const node = new Ast.Node('tag', {}, [], 'hint');
    const config = { variables: { generatedIds: new Set<string>() } } as any;

    generateIdIfMissing(node, config);
    expect(node.attributes.id).toBe('hint-0');
  });

  it('should not overwrite an existing id', () => {
    const node = new Ast.Node('tag', { id: 'custom-id' }, [], 'hint');
    const config = { variables: { generatedIds: new Set<string>() } } as any;

    generateIdIfMissing(node, config);
    expect(node.attributes.id).toBe('custom-id');
  });

  it('should increment index to avoid collisions', () => {
    const node1 = new Ast.Node('tag', {}, [], 'hint');
    const node2 = new Ast.Node('tag', {}, [], 'hint');
    const config = { variables: { generatedIds: new Set<string>() } } as any;

    generateIdIfMissing(node1, config);
    generateIdIfMissing(node2, config);
    expect(node1.attributes.id).toBe('hint-0');
    expect(node2.attributes.id).toBe('hint-1');
  });

  it('should initialize generatedIds set if missing', () => {
    const node = new Ast.Node('tag', {}, [], 'hero');
    const config = { variables: {} } as any;

    generateIdIfMissing(node, config);
    expect(config.variables.generatedIds).toBeInstanceOf(Set);
    expect(node.attributes.id).toBe('hero-0');
  });
});

describe('extractHeadings', () => {
  it('should extract headings with level, text, and id', () => {
    const ast = Markdoc.parse('# Hello World');
    const headings = extractHeadings(ast);

    expect(headings).toHaveLength(1);
    expect(headings[0].level).toBe(1);
    expect(headings[0].text).toBe('Hello World');
    expect(headings[0].id).toBe('hello-world');
  });

  it('should extract multiple headings at different levels', () => {
    const ast = Markdoc.parse('# Title\n\n## Subtitle\n\n### Detail');
    const headings = extractHeadings(ast);

    expect(headings).toHaveLength(3);
    expect(headings[0].level).toBe(1);
    expect(headings[1].level).toBe(2);
    expect(headings[2].level).toBe(3);
  });

  it('should use existing id attribute if present', () => {
    const ast = Markdoc.parse('# Hello {% #custom-id %}');
    const headings = extractHeadings(ast);

    expect(headings[0].id).toBe('custom-id');
  });

  it('should strip question marks from generated ids', () => {
    const ast = Markdoc.parse('# What is this?');
    const headings = extractHeadings(ast);

    expect(headings[0].id).toBe('what-is-this');
  });

  it('should return empty array for documents with no headings', () => {
    const ast = Markdoc.parse('Just a paragraph.');
    const headings = extractHeadings(ast);

    expect(headings).toEqual([]);
  });
});

describe('headingsToList', () => {
  it('should convert h1 headings to list items by default', () => {
    const ast = Markdoc.parse('# First\n\nContent 1\n\n# Second\n\nContent 2');
    const result = headingsToList()(ast.children);

    const listNode = result.find(n => n.type === 'list');
    expect(listNode).toBeDefined();
    expect(listNode!.children).toHaveLength(2);
  });

  it('should target custom heading level', () => {
    const ast = Markdoc.parse('## First\n\nContent 1\n\n## Second\n\nContent 2');
    const result = headingsToList({ level: 2 })(ast.children);

    const listNode = result.find(n => n.type === 'list');
    expect(listNode).toBeDefined();
    expect(listNode!.children).toHaveLength(2);
  });

  it('should return original nodes when no headings match', () => {
    const ast = Markdoc.parse('Just a paragraph.\n\nAnother paragraph.');
    const original = ast.children;
    const result = headingsToList()(original);

    expect(result).toBe(original);
  });

  it('should preserve content before first heading', () => {
    const ast = Markdoc.parse('Intro text\n\n# First\n\nContent');
    const result = headingsToList()(ast.children);

    expect(result[0].type).toBe('paragraph');
    expect(result[1].type).toBe('list');
  });
});

describe('walkTag', () => {
  it('should yield the tag itself first', () => {
    const tag = new Tag('div', {}, ['text']);
    const nodes = [...walkTag(tag)];

    expect(nodes[0]).toBe(tag);
  });

  it('should yield child tags recursively', () => {
    const child = new Tag('span', {}, ['inner']);
    const parent = new Tag('div', {}, [child]);
    const nodes = [...walkTag(parent)];

    expect(nodes).toHaveLength(3); // parent, child, 'inner'
    expect(nodes[0]).toBe(parent);
    expect(nodes[1]).toBe(child);
    expect(nodes[2]).toBe('inner');
  });

  it('should yield string children', () => {
    const tag = new Tag('p', {}, ['hello', 'world']);
    const nodes = [...walkTag(tag)];

    expect(nodes).toContain('hello');
    expect(nodes).toContain('world');
  });
});
