import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../src/frontmatter.js';

describe('parseFrontmatter', () => {
  it('should parse yaml frontmatter', () => {
    const { frontmatter, content } = parseFrontmatter(`---
title: Hello
description: A test page
---

# Hello`);

    expect(frontmatter.title).toBe('Hello');
    expect(frontmatter.description).toBe('A test page');
    expect(content.trim()).toBe('# Hello');
  });

  it('should return empty frontmatter when none present', () => {
    const { frontmatter, content } = parseFrontmatter('# No frontmatter');

    expect(frontmatter).toEqual({});
    expect(content).toBe('# No frontmatter');
  });

  it('should parse slug override', () => {
    const { frontmatter } = parseFrontmatter(`---
slug: /custom-path
---

Content.`);

    expect(frontmatter.slug).toBe('/custom-path');
  });

  it('should parse draft flag', () => {
    const { frontmatter } = parseFrontmatter(`---
draft: true
---

Draft content.`);

    expect(frontmatter.draft).toBe(true);
  });

  it('should parse order', () => {
    const { frontmatter } = parseFrontmatter(`---
order: 5
---

Ordered content.`);

    expect(frontmatter.order).toBe(5);
  });

  it('should handle empty frontmatter block', () => {
    const { frontmatter, content } = parseFrontmatter(`---
---

Content.`);

    expect(frontmatter).toEqual({});
    expect(content.trim()).toBe('Content.');
  });
});
