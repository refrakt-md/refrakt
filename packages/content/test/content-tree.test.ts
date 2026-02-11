import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { ContentTree } from '../src/content-tree.js';

const fixtureDir = path.resolve(import.meta.dirname, 'fixtures/site');

describe('ContentTree', () => {
  it('should read a content directory', async () => {
    const tree = await ContentTree.fromDirectory(fixtureDir);

    expect(tree.root).toBeDefined();
    expect(tree.root.name).toBe('site');
  });

  it('should find regular pages', async () => {
    const tree = await ContentTree.fromDirectory(fixtureDir);
    const pages = [...tree.pages()];

    const paths = pages.map(p => p.relativePath);
    expect(paths).toContain('index.md');
    expect(paths).toContain(path.join('blog', 'draft-post.md'));
    expect(paths).toContain(path.join('blog', 'first-post.md'));
    expect(paths).toContain(path.join('docs', '01-getting-started.md'));
    expect(paths).toContain(path.join('docs', '02-installation.md'));
  });

  it('should identify layout files separately', async () => {
    const tree = await ContentTree.fromDirectory(fixtureDir);
    const layouts = [...tree.layouts()];

    expect(layouts.length).toBe(2);

    // Root layout and docs layout
    const paths = layouts.map(l => l.relativePath);
    expect(paths).toContain('_layout.md');
    expect(paths).toContain(path.join('docs', '_layout.md'));
  });

  it('should not include layout files in pages', async () => {
    const tree = await ContentTree.fromDirectory(fixtureDir);
    const pages = [...tree.pages()];
    const paths = pages.map(p => p.relativePath);

    expect(paths).not.toContain('_layout.md');
    expect(paths).not.toContain(path.join('docs', '_layout.md'));
  });

  it('should read raw file content', async () => {
    const tree = await ContentTree.fromDirectory(fixtureDir);
    const pages = [...tree.pages()];
    const home = pages.find(p => p.relativePath === 'index.md');

    expect(home).toBeDefined();
    expect(home!.raw).toContain('title: Home');
    expect(home!.raw).toContain('# Welcome');
  });

  it('should have nested directory structure', async () => {
    const tree = await ContentTree.fromDirectory(fixtureDir);

    const childNames = tree.root.children.map(c => c.name);
    expect(childNames).toContain('blog');
    expect(childNames).toContain('docs');
  });
});
