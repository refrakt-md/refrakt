import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('toc tag', () => {
	it('should generate links from document headings', () => {
		const result = parse(`{% toc %}{% /toc %}

## Introduction

Some text.

## Getting Started

More text.

### Installation

Install steps.`);

		const nav = findTag(result as any, t => t.attributes.typeof === 'TableOfContents');
		expect(nav).toBeDefined();
		expect(nav!.name).toBe('nav');

		const links = findAllTags(nav!, t => t.name === 'a');
		expect(links.length).toBe(3);
		expect(links[0].attributes.href).toBe('#introduction');
		expect(links[0].children).toContain('Introduction');
		expect(links[1].attributes.href).toBe('#getting-started');
		expect(links[2].attributes.href).toBe('#installation');
	});

	it('should respect depth attribute', () => {
		const result = parse(`{% toc depth=2 %}{% /toc %}

## Level 2

### Level 3

#### Level 4`);

		const nav = findTag(result as any, t => t.attributes.typeof === 'TableOfContents');
		const links = findAllTags(nav!, t => t.name === 'a');
		// depth=2 means h2 and h3 only (h2..h{2+1})
		expect(links.length).toBe(2);
	});

	it('should support ordered flag via meta property', () => {
		const result = parse(`{% toc ordered=true %}{% /toc %}

## First

## Second`);

		const nav = findTag(result as any, t => t.attributes.typeof === 'TableOfContents');
		const orderedMeta = findTag(nav!, t => t.name === 'meta' && t.attributes.property === 'ordered');
		expect(orderedMeta).toBeDefined();
		expect(orderedMeta!.attributes.content).toBe(true);
	});

	it('should return empty list when no headings', () => {
		const result = parse(`{% toc %}{% /toc %}

Just a paragraph.`);

		const nav = findTag(result as any, t => t.attributes.typeof === 'TableOfContents');
		expect(nav).toBeDefined();

		const links = findAllTags(nav!, t => t.name === 'a');
		expect(links.length).toBe(0);
	});
});
