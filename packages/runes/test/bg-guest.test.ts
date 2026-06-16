import { describe, it, expect, vi, afterEach } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

function parse(src: string) {
	return Markdoc.transform(Markdoc.parse(src), {
		tags, nodes, variables: { generatedIds: new Set<string>(), path: '/t.md' },
	} as never);
}

function find(node: any, pred: (t: InstanceType<typeof Markdoc.Tag>) => boolean): any {
	if (!node || typeof node !== 'object') return undefined;
	if (Markdoc.Tag.isTag(node as never) && pred(node as never)) return node;
	for (const child of (node.children ?? [])) {
		const f = find(child, pred);
		if (f) return f;
	}
	return undefined;
}

const cardWithBgBody = (guest: string) => [
	'{% card %}',
	'{% bg %}',
	guest,
	'{% /bg %}',
	'# Card title',
	'',
	'body text',
	'{% /card %}',
].join('\n');

afterEach(() => vi.restoreAllMocks());

// SPEC-104 / WORK-428 — a `{% bg %}` body holds one bare guest (a sandbox). It is
// transformed, tagged `data-bg-guest`, postured, and hoisted to the host.
describe('bg sandbox guest body (SPEC-104)', () => {
	it('hoists the body sandbox as a tagged, postured backdrop guest', () => {
		const out = parse(cardWithBgBody('{% sandbox framework="three" %}\n```js\n// scene\n```\n{% /sandbox %}'));
		const guest = find(out, t => t.attributes?.['data-bg-guest'] !== undefined);
		expect(guest, 'a data-bg-guest element should be hoisted to the host').toBeDefined();
		expect(guest.name).toBe('rf-sandbox');
		expect(guest.attributes['data-guest-posture']).toBe('backdrop');
		expect(guest.attributes['data-height']).toBe('fill');
		expect(guest.attributes['data-activation']).toBe('eager');
	});

	it('still emits the bg-* metas alongside the guest (gradient boot frame)', () => {
		const out = parse([
			'{% card %}',
			'{% bg gradient="to-b" from="primary" to="surface" %}',
			'{% sandbox framework="three" %}\n```js\n// s\n```\n{% /sandbox %}',
			'{% /bg %}',
			'# T',
			'{% /card %}',
		].join('\n'));
		const gradientMeta = find(out, t => t.name === 'meta' && t.attributes['data-field'] === 'bg-gradient');
		const guest = find(out, t => t.attributes?.['data-bg-guest'] !== undefined);
		expect(gradientMeta).toBeDefined();
		expect(guest).toBeDefined();
	});

	it('rejects a chromed guest (figure) with a build warning and no tagging', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const out = parse(cardWithBgBody('{% figure %}\n![alt](/x.png)\n{% /figure %}'));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('bg backdrop guest must be presentational'));
		// the chromed guest is not promoted to a backdrop
		expect(find(out, t => t.attributes?.['data-bg-guest'] !== undefined)).toBeUndefined();
	});
});
