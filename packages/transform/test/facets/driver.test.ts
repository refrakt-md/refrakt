import { describe, it, expect, vi } from 'vitest';
import { orderFacets, runFacets, runPostAssemble, WarningCollector } from '../../src/facets/driver.js';
import { makeTag } from '../../src/helpers.js';
import type { Facet, FacetInput } from '../../src/facets/types.js';

const input = (): FacetInput => ({
	tag: makeTag('div', { 'data-rune': 'card' }, []),
	config: { block: 'card' },
	block: 'rf-card',
	rune: 'card',
	fields: {},
	theme: { tints: {}, backgrounds: {}, frames: {} },
});

/** A facet that records nothing but its own name into an axis. */
const stub = (name: string, after?: string[]): Facet => ({
	name,
	after,
	resolve: () => ({ axes: { [name]: 'on' } }),
});

describe('orderFacets', () => {
	it('keeps registration order for independent facets', () => {
		const ordered = orderFacets([stub('a'), stub('b'), stub('c')]);
		expect(ordered.map(f => f.name)).toEqual(['a', 'b', 'c']);
	});

	it('places a facet after the one it declares', () => {
		// registered in the wrong order on purpose
		const ordered = orderFacets([stub('dropcap', ['reading']), stub('reading')]);
		expect(ordered.map(f => f.name)).toEqual(['reading', 'dropcap']);
	});

	it('resolves a transitive chain', () => {
		const ordered = orderFacets([stub('c', ['b']), stub('b', ['a']), stub('a')]);
		expect(ordered.map(f => f.name)).toEqual(['a', 'b', 'c']);
	});

	it('is deterministic across equivalent orderings', () => {
		const names = () => orderFacets([stub('x'), stub('y', ['x']), stub('z')]).map(f => f.name);
		expect(names()).toEqual(names());
	});

	// The failure modes below have no counterpart in the inline implementation —
	// ordering was previously implied by physical line order, so it could not be
	// stated incorrectly. They are new surface introduced by the registry.
	it('throws on a dependency cycle, naming the trail', () => {
		expect(() => orderFacets([stub('a', ['b']), stub('b', ['a'])]))
			.toThrow(/facet dependency cycle: a → b → a/);
	});

	it('throws on a self-referential facet', () => {
		expect(() => orderFacets([stub('a', ['a'])])).toThrow(/facet dependency cycle/);
	});

	it('throws when `after` names an unregistered facet', () => {
		expect(() => orderFacets([stub('bg', ['media-position'])]))
			.toThrow(/facet "bg" declares after: "media-position", which is not a registered facet/);
	});

	it('throws on a duplicate facet name', () => {
		expect(() => orderFacets([stub('a'), stub('a')])).toThrow(/duplicate facet "a"/);
	});
});

describe('runFacets', () => {
	it('exposes earlier axes to later facets via ctx.axis()', () => {
		let seen: string | undefined = 'unset';
		const reader: Facet = {
			name: 'reader',
			after: ['writer'],
			resolve: (ctx) => { seen = ctx.axis('writer'); return null; },
		};
		const writer: Facet = { name: 'writer', resolve: () => ({ axes: { writer: 'prose' } }) };

		runFacets(orderFacets([reader, writer]), input(), new WarningCollector());
		expect(seen).toBe('prose');
	});

	it('returns undefined for an axis no facet set', () => {
		let seen: string | undefined = 'unset';
		const probe: Facet = { name: 'probe', resolve: (ctx) => { seen = ctx.axis('nope'); return null; } };
		runFacets([probe], input(), new WarningCollector());
		expect(seen).toBeUndefined();
	});

	it('skips resolve entirely when appliesTo is false', () => {
		const resolve = vi.fn(() => null);
		const facet: Facet = { name: 'gated', appliesTo: () => false, resolve };
		runFacets([facet], input(), new WarningCollector());
		expect(resolve).not.toHaveBeenCalled();
	});

	it('merges every result channel', () => {
		const facet: Facet = {
			name: 'kitchen-sink',
			resolve: () => ({
				axes: { a: '1' },
				state: { s: 'internal' },
				classes: ['rf-card--x'],
				dataAttrs: { 'data-x': '' },
				styles: [['--x', '2px']],
				consumes: ['x-meta'],
			}),
		};
		const result = runFacets([facet], input(), new WarningCollector());
		expect(result).toMatchObject({
			axes: { a: '1' },
			state: { s: 'internal' },
			classes: ['rf-card--x'],
			dataAttrs: { 'data-x': '' },
			styles: [['--x', '2px']],
			consumes: ['x-meta'],
		});
	});

	// Ordered pairs, not a keyed map: `cover` deliberately re-declares
	// `--cover-scrim-dir` after `content-place` set it, relying on CSS
	// last-wins. A Record would collapse the two into one declaration.
	it('preserves duplicate style declarations in order', () => {
		const first: Facet = { name: 'first', resolve: () => ({ styles: [['--dir', 'to bottom']] }) };
		const second: Facet = { name: 'second', after: ['first'], resolve: () => ({ styles: [['--dir', 'to top']] }) };
		const result = runFacets(orderFacets([first, second]), input(), new WarningCollector());
		expect(result.styles).toEqual([['--dir', 'to bottom'], ['--dir', 'to top']]);
	});

	it('exposes non-emitted state through ctx.axis()', () => {
		let seen: string | undefined = 'unset';
		const producer: Facet = { name: 'producer', resolve: () => ({ state: { cover: 'true' } }) };
		const consumer: Facet = {
			name: 'consumer',
			after: ['producer'],
			resolve: (ctx) => { seen = ctx.axis('cover'); return null; },
		};
		const result = runFacets(orderFacets([producer, consumer]), input(), new WarningCollector());
		expect(seen).toBe('true');
		expect(result.axes.cover).toBeUndefined();  // state never reaches the output
	});

});

describe('runPostAssemble', () => {
	it('runs only facets that declare the hook, in registry order', () => {
		const calls: string[] = [];
		const a: Facet = { name: 'a', resolve: () => null, postAssemble: () => { calls.push('a'); } };
		const b: Facet = { name: 'b', resolve: () => null };
		const c: Facet = { name: 'c', after: ['a'], resolve: () => null, postAssemble: () => { calls.push('c'); } };

		const ordered = orderFacets([a, b, c]);
		const resolution = runFacets(ordered, input(), new WarningCollector());
		runPostAssemble(ordered, input(), resolution, [], new WarningCollector());
		expect(calls).toEqual(['a', 'c']);
	});

	it('respects appliesTo', () => {
		const postAssemble = vi.fn();
		const facet: Facet = { name: 'gated', appliesTo: () => false, resolve: () => null, postAssemble };
		runPostAssemble([facet], input(), runFacets([], input(), new WarningCollector()), [], new WarningCollector());
		expect(postAssemble).not.toHaveBeenCalled();
	});

	it('mutates the assembled children in place', () => {
		const facet: Facet = {
			name: 'mutator',
			resolve: () => null,
			postAssemble: (_ctx, children) => {
				const target = children[0] as any;
				target.attributes = { ...target.attributes, 'data-touched': '' };
			},
		};
		const children = [makeTag('div', { 'data-name': 'content' }, [])];
		runPostAssemble([facet], input(), runFacets([], input(), new WarningCollector()), children, new WarningCollector());
		expect((children[0] as any).attributes['data-touched']).toBe('');
	});

	it('sees state resolved during the first phase', () => {
		let seen: string | undefined = 'unset';
		const facet: Facet = {
			name: 'two-phase',
			resolve: () => ({ state: { cover: 'true' } }),
			postAssemble: (ctx) => { seen = ctx.axis('cover'); },
		};
		const resolution = runFacets([facet], input(), new WarningCollector());
		runPostAssemble([facet], input(), resolution, [], new WarningCollector());
		expect(seen).toBe('true');
	});

	// `carry` is the channel a two-phase facet uses for resolved work that is
	// neither emitted nor expressible as a string — `frame` resolves its chrome
	// bundle and target once, rather than re-resolving in the second phase.
	it('hands a facet its own carry from resolve', () => {
		let seen: unknown = 'unset';
		const facet: Facet = {
			name: 'carrier',
			resolve: () => ({ carry: { chrome: 'bundle' } }),
			postAssemble: (_ctx, _children, carry) => { seen = carry; },
		};
		const resolution = runFacets([facet], input(), new WarningCollector());
		runPostAssemble([facet], input(), resolution, [], new WarningCollector());
		expect(seen).toEqual({ chrome: 'bundle' });
	});

	it('keeps carry private to the facet that produced it', () => {
		let seen: unknown = 'unset';
		const carrier: Facet = { name: 'carrier', resolve: () => ({ carry: 'mine' }) };
		const other: Facet = {
			name: 'other',
			after: ['carrier'],
			resolve: () => null,
			postAssemble: (_ctx, _children, carry) => { seen = carry; },
		};
		const ordered = orderFacets([carrier, other]);
		const resolution = runFacets(ordered, input(), new WarningCollector());
		runPostAssemble(ordered, input(), resolution, [], new WarningCollector());
		expect(seen).toBeUndefined();
	});

	it('emits and records warnings returned from the second phase', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const facet: Facet = {
			name: 'late',
			resolve: () => null,
			postAssemble: () => [{ code: 'late-problem', message: '[refrakt] late problem' }],
		};
		const resolution = runFacets([facet], input(), new WarningCollector());
		runPostAssemble([facet], input(), resolution, [], new WarningCollector());

		expect(warn).toHaveBeenCalledWith('[refrakt] late problem');
		expect(resolution.warnings.map(w => w.code)).toContain('late-problem');
		warn.mockRestore();
	});

	it('ignores a facet that returns null', () => {
		const result = runFacets([{ name: 'quiet', resolve: () => null }], input(), new WarningCollector());
		expect(result.axes).toEqual({});
		expect(result.warnings).toEqual([]);
	});

	it('lets a later facet overwrite an earlier axis of the same name', () => {
		const first: Facet = { name: 'first', resolve: () => ({ axes: { shared: 'a' } }) };
		const second: Facet = { name: 'second', after: ['first'], resolve: () => ({ axes: { shared: 'b' } }) };
		const result = runFacets(orderFacets([first, second]), input(), new WarningCollector());
		expect(result.axes.shared).toBe('b');
	});
});

describe('WarningCollector', () => {
	it('emits an undeduped warning every time', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const collector = new WarningCollector();
		const facet: Facet = {
			name: 'noisy',
			resolve: () => ({ warnings: [{ code: 'noisy', message: '[refrakt] noisy' }] }),
		};
		runFacets([facet], input(), collector);
		runFacets([facet], input(), collector);
		expect(warn).toHaveBeenCalledTimes(2);
		warn.mockRestore();
	});

	it('emits a keyed warning once, then suppresses it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const collector = new WarningCollector();
		const facet: Facet = {
			name: 'once',
			resolve: () => ({ warnings: [{ code: 'once', message: '[refrakt] once', dedupeKey: 'once:card' }] }),
		};
		runFacets([facet], input(), collector);
		runFacets([facet], input(), collector);
		expect(warn).toHaveBeenCalledTimes(1);
		warn.mockRestore();
	});

	it('dedupes per key, not globally', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const collector = new WarningCollector();
		for (const rune of ['card', 'hero', 'card']) {
			collector.emit({ code: 'k', message: `[refrakt] ${rune}`, dedupeKey: `k:${rune}` });
		}
		expect(warn).toHaveBeenCalledTimes(2);
		warn.mockRestore();
	});

	// This is the assertion that is impossible today: the `*_WARNED` sets are
	// module-level, so a suppressed warning leaves no trace a test can inspect.
	it('records suppressed warnings in the resolution even when not emitted', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const collector = new WarningCollector();
		const facet: Facet = {
			name: 'once',
			resolve: () => ({ warnings: [{ code: 'once', message: '[refrakt] once', dedupeKey: 'k' }] }),
		};
		runFacets([facet], input(), collector);
		const second = runFacets([facet], input(), collector);

		expect(warn).toHaveBeenCalledTimes(1);           // console saw it once
		expect(second.warnings).toHaveLength(1);          // the facet still decided it
		expect(second.warnings[0].code).toBe('once');
		warn.mockRestore();
	});

	it('reset() restores warn-once behaviour', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const collector = new WarningCollector();
		const w = { code: 'k', message: '[refrakt] k', dedupeKey: 'k' };
		collector.emit(w);
		collector.emit(w);
		collector.reset();
		collector.emit(w);
		expect(warn).toHaveBeenCalledTimes(2);
		warn.mockRestore();
	});
});
