import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { BREADCRUMB_AUTO_SENTINEL } from '../src/tags/breadcrumb.js';

describe('breadcrumb auto mode', () => {
	it('emits a placeholder with sentinel meta when auto=true', () => {
		const result = parse(`{% breadcrumb auto=true /%}`);
		const breadcrumb = findTag(result as any, t => t.attributes['data-rune'] === 'Breadcrumb');

		expect(breadcrumb).toBeDefined();

		// Should have the sentinel meta tag as a direct child
		const sentinel = breadcrumb!.children.find(
			(c: any) => c?.name === 'meta' && c?.attributes?.property === BREADCRUMB_AUTO_SENTINEL
		);
		expect(sentinel).toBeDefined();
	});

	it('sentinel has the correct property name constant', () => {
		expect(BREADCRUMB_AUTO_SENTINEL).toBe('__breadcrumb-auto');
	});

	it('auto mode emits an empty items list (no BreadcrumbItems)', () => {
		const result = parse(`{% breadcrumb auto=true /%}`);
		const breadcrumb = findTag(result as any, t => t.attributes['data-rune'] === 'Breadcrumb');

		const items = findAllTags(breadcrumb!, t => t.attributes['data-rune'] === 'BreadcrumbItem');
		expect(items).toHaveLength(0);
	});

	it('static mode (no auto) does not emit a sentinel', () => {
		const result = parse(`{% breadcrumb %}
- [Home](/)
- [Docs](/docs)
- Current
{% /breadcrumb %}`);

		const breadcrumb = findTag(result as any, t => t.attributes['data-rune'] === 'Breadcrumb');
		expect(breadcrumb).toBeDefined();

		const sentinel = breadcrumb!.children.find(
			(c: any) => c?.name === 'meta' && c?.attributes?.property === BREADCRUMB_AUTO_SENTINEL
		);
		expect(sentinel).toBeUndefined();
	});

	it('static mode still produces breadcrumb items', () => {
		const result = parse(`{% breadcrumb %}
- [Home](/)
- [Docs](/docs)
- Current
{% /breadcrumb %}`);

		const breadcrumb = findTag(result as any, t => t.attributes['data-rune'] === 'Breadcrumb');
		const items = findAllTags(breadcrumb!, t => t.attributes['data-rune'] === 'BreadcrumbItem');
		expect(items).toHaveLength(3);
	});
});
