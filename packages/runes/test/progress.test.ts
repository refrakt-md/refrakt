import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

function render(src: string) {
	return Markdoc.transform(Markdoc.parse(src), { tags, nodes, variables: {} } as never);
}

function find(node: unknown, pred: (t: InstanceType<typeof Markdoc.Tag>) => boolean) {
	let found: InstanceType<typeof Markdoc.Tag> | undefined;
	const walk = (n: unknown) => {
		if (found) return;
		if (Array.isArray(n)) return n.forEach(walk);
		if (!Markdoc.Tag.isTag(n as never)) return;
		const t = n as InstanceType<typeof Markdoc.Tag>;
		if (pred(t)) { found = t; return; }
		(t.children ?? []).forEach(walk);
	};
	walk(node);
	return found;
}

const root = (t: unknown) => find(t, (x) => x.attributes['data-rune'] === 'progress')!;
const part = (t: unknown, name: string) => find(t, (x) => x.attributes['data-name'] === name);

describe('progress rune', () => {
	it('value/max → percent fill, fraction readout, value/max aria', () => {
		const out = render('{% progress value=3 max=4 /%}');
		const r = root(out);
		expect(r.attributes.role).toBe('progressbar');
		expect(r.attributes.style).toBe('--rf-progress: 75%');
		expect(r.attributes['aria-valuenow']).toBe('3');
		expect(r.attributes['aria-valuemax']).toBe('4');
		expect(JSON.stringify(part(out, 'value'))).toContain('3/4');
	});

	it('percent input renders a percent readout and 0–100 aria', () => {
		const out = render('{% progress percent=60 /%}');
		const r = root(out);
		expect(r.attributes.style).toBe('--rf-progress: 60%');
		expect(r.attributes['aria-valuenow']).toBe('60');
		expect(r.attributes['aria-valuemax']).toBe('100');
		expect(JSON.stringify(part(out, 'value'))).toContain('60%');
	});

	it('display=none hides the readout; display=percent overrides fraction', () => {
		expect(part(render('{% progress value=1 max=2 display="none" /%}'), 'value')).toBeUndefined();
		expect(JSON.stringify(part(render('{% progress value=1 max=2 display="percent" /%}'), 'value'))).toContain('50%');
	});

	it('clamps and degrades: max=0 → 0%, value>max → 100%', () => {
		expect(root(render('{% progress value=5 max=0 /%}')).attributes.style).toBe('--rf-progress: 0%');
		expect(root(render('{% progress value=9 max=4 /%}')).attributes.style).toBe('--rf-progress: 100%');
	});

	it('body becomes the label + accessible name', () => {
		const out = render('{% progress value=1 max=4 %}Acceptance criteria{% /progress %}');
		expect(JSON.stringify(part(out, 'label'))).toContain('Acceptance criteria');
		expect(root(out).attributes['aria-label']).toBe('Acceptance criteria');
	});

	it('always emits a track and fill', () => {
		const out = render('{% progress percent=10 /%}');
		expect(part(out, 'track')).toBeDefined();
		expect(part(out, 'fill')).toBeDefined();
	});

	it('emits a sentiment meta only when set', () => {
		const sentimentMeta = (t: unknown) => find(t, (x) => x.attributes['data-field'] === 'sentiment');
		const withIt = render('{% progress percent=40 sentiment="caution" /%}');
		expect(sentimentMeta(withIt)?.attributes.content).toBe('caution');
		expect(sentimentMeta(render('{% progress percent=40 /%}'))).toBeUndefined();
	});
});
