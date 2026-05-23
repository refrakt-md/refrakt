import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { applyOutlineScopeWalkers } from '../src/outline-scope.js';
import { findTag, findAllTags } from './helpers.js';

/** Build a heading tag at a given level with the given text + id. */
function h(level: 1 | 2 | 3 | 4 | 5 | 6, text: string, id: string): InstanceType<typeof Tag> {
	return new Tag(`h${level}`, { id }, [text]);
}

/** Wrap children in an outline-scope element. The wrapper is a generic
 *  `<section>` to make clear the walker doesn't look for any specific
 *  rune name — `data-outline-scope` is the only marker that matters. */
function scoped(value: string, ...children: unknown[]): InstanceType<typeof Tag> {
	return new Tag('section', { 'data-outline-scope': value }, children);
}

function toc(...items: InstanceType<typeof Tag>[]): InstanceType<typeof Tag> {
	const ul = new Tag('ul', {}, items);
	return new Tag('nav', { 'data-rune': 'table-of-contents' }, [ul]);
}

function tocItem(href: string, label: string): InstanceType<typeof Tag> {
	return new Tag('li', {}, [new Tag('a', { href }, [label])]);
}

describe('applyOutlineScopeWalkers (SPEC-066)', () => {
	describe('heading-ID walker', () => {
		it('prefixes heading IDs inside a data-outline-scope subtree', () => {
			const heading = h(2, 'Auth system', 'auth-system');
			const tree = new Tag('article', {}, [
				scoped('SPEC-023', heading),
			]);
			applyOutlineScopeWalkers(tree);
			expect(heading.attributes.id).toBe('SPEC-023--auth-system');
		});

		it('leaves heading IDs alone when no outline-scope ancestor exists', () => {
			const heading = h(2, 'Plain', 'plain');
			const tree = new Tag('article', {}, [heading]);
			applyOutlineScopeWalkers(tree);
			expect(heading.attributes.id).toBe('plain');
		});

		it('uses the innermost scope value when scopes are nested', () => {
			const heading = h(3, 'Deep', 'deep');
			const tree = new Tag('article', {}, [
				scoped('OUTER', scoped('INNER', heading)),
			]);
			applyOutlineScopeWalkers(tree);
			expect(heading.attributes.id).toBe('INNER--deep');
		});

		it('skips headings that are already prefixed (idempotent)', () => {
			const heading = h(2, 'Auth', 'SPEC-023--auth');
			const tree = new Tag('article', {}, [
				scoped('SPEC-023', heading),
			]);
			applyOutlineScopeWalkers(tree);
			expect(heading.attributes.id).toBe('SPEC-023--auth');
		});

		it('is a no-op when no data-outline-scope attribute is present anywhere', () => {
			const tree = new Tag('article', {}, [
				h(1, 'One', 'one'),
				h(2, 'Two', 'two'),
				h(3, 'Three', 'three'),
			]);
			applyOutlineScopeWalkers(tree);
			const ids = findAllTags(tree, t => /^h[1-6]$/.test(t.name)).map(t => t.attributes.id);
			expect(ids).toEqual(['one', 'two', 'three']);
		});

		it('works on the standard expand-style shape (data-outline-scope on the wrapper)', () => {
			const heading = h(1, 'Auth system', 'auth-system');
			const tree = new Tag('article', {}, [
				new Tag('section', {
					'data-rune': 'expand',
					'data-entity-id': 'SPEC-023',
					'data-outline-scope': 'SPEC-023',
				}, [
					new Tag('section', { 'data-rune': 'spec' }, [heading]),
				]),
			]);
			applyOutlineScopeWalkers(tree);
			expect(heading.attributes.id).toBe('SPEC-023--auth-system');
		});
	});

	describe('TOC walker', () => {
		it('removes list items pointing at headings that became scoped', () => {
			const heading = h(2, 'Auth system', 'auth-system');
			const tocNav = toc(
				tocItem('#intro', 'Intro'),
				tocItem('#auth-system', 'Auth system'),
				tocItem('#outro', 'Outro'),
			);
			const tree = new Tag('article', {}, [
				tocNav,
				h(2, 'Intro', 'intro'),
				scoped('SPEC-023', heading),
				h(2, 'Outro', 'outro'),
			]);
			applyOutlineScopeWalkers(tree);
			const lis = findAllTags(tocNav, t => t.name === 'li');
			const labels = lis.map(li => {
				const a = findTag(li, t => t.name === 'a');
				return a?.children[0];
			});
			expect(labels).toEqual(['Intro', 'Outro']);
		});

		it('leaves the TOC unchanged when no headings were scoped', () => {
			const tocNav = toc(
				tocItem('#intro', 'Intro'),
				tocItem('#body', 'Body'),
			);
			const tree = new Tag('article', {}, [
				tocNav,
				h(2, 'Intro', 'intro'),
				h(2, 'Body', 'body'),
			]);
			applyOutlineScopeWalkers(tree);
			expect(findAllTags(tocNav, t => t.name === 'li')).toHaveLength(2);
		});

		it('does not touch list items whose anchors point at non-scoped headings', () => {
			const tocNav = toc(
				tocItem('#kept', 'Kept'),
				tocItem('#dropped', 'Dropped'),
			);
			const tree = new Tag('article', {}, [
				tocNav,
				h(2, 'Kept', 'kept'),
				scoped('S', h(2, 'Dropped', 'dropped')),
			]);
			applyOutlineScopeWalkers(tree);
			const lis = findAllTags(tocNav, t => t.name === 'li');
			expect(lis).toHaveLength(1);
			const a = findTag(lis[0], t => t.name === 'a');
			expect(a?.attributes.href).toBe('#kept');
		});
	});

	describe('genericity', () => {
		it('reacts to data-outline-scope regardless of element name or data-rune value', () => {
			const heading = h(2, 'In a div', 'in-a-div');
			const tree = new Tag('article', {}, [
				new Tag('div', { 'data-outline-scope': 'CUSTOM', 'data-rune': 'something-else' }, [heading]),
			]);
			applyOutlineScopeWalkers(tree);
			expect(heading.attributes.id).toBe('CUSTOM--in-a-div');
		});
	});
});
