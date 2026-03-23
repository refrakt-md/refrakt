import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { planPipelineHooks } from '../src/pipeline.js';
import type { TransformedPage, EntityRegistration, EntityRegistry, PipelineContext } from '@refrakt-md/types';

function makePage(url: string, content: string): TransformedPage {
	const renderable = parse(content);
	return { url, title: '', headings: [], frontmatter: {}, renderable } as TransformedPage;
}

function makeRegistry() {
	const entries: EntityRegistration[] = [];
	return {
		entries,
		registry: {
			register(e: EntityRegistration) { entries.push(e); },
			getAll(type: string) { return entries.filter(e => e.type === type); },
			getById(type: string, id: string) { return entries.find(e => e.type === type && e.id === id); },
			getByUrl(type: string, url: string) { return entries.filter(e => e.type === type && e.sourceUrl === url); },
			getTypes() { return [...new Set(entries.map(e => e.type))]; },
		} as EntityRegistry,
	};
}

const ctx: PipelineContext = { info: () => {}, warn: () => {}, error: () => {} };

describe('decision-log rune', () => {
	it('transforms to a section with sentinel meta', () => {
		const result = parse(`{% decision-log sort="date" /%}`);
		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'decision-log');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');

		const sentinel = findTag(tag!, t => t.attributes['data-field'] === '__decision-log-sentinel');
		expect(sentinel).toBeDefined();
	});
});

describe('decision-log aggregate + postProcess', () => {
	it('populates with decision entries sorted by date', () => {
		const { registry } = makeRegistry();
		const pages = [
			makePage('/plan/d1', `{% decision id="ADR-001" status="accepted" date="2026-01-15" %}
# First Decision
## Context
Why.
## Decision
What.
{% /decision %}`),
			makePage('/plan/d2', `{% decision id="ADR-002" status="proposed" date="2026-03-01" %}
# Second Decision
## Context
Why.
## Decision
What.
{% /decision %}`),
			makePage('/plan/d3', `{% decision id="ADR-003" status="accepted" date="2026-02-10" %}
# Third Decision
## Context
Why.
## Decision
What.
{% /decision %}`),
		];
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry, ctx) };

		const logPage = makePage('/plan/dashboard', `{% decision-log sort="date" /%}`);
		const processed = planPipelineHooks.postProcess!(logPage, aggregated, ctx);

		const logTag = findTag(processed.renderable as any, t => t.attributes['data-rune'] === 'decision-log');
		expect(logTag).toBeDefined();

		const entries = findAllTags(logTag!, t =>
			typeof t.attributes.class === 'string' && t.attributes.class.includes('rf-decision-log__entry'),
		);
		expect(entries).toHaveLength(3);

		// Should be reverse chronological: Mar, Feb, Jan
		expect(entries[0].attributes['data-id']).toBe('ADR-002');
		expect(entries[1].attributes['data-id']).toBe('ADR-003');
		expect(entries[2].attributes['data-id']).toBe('ADR-001');
	});

	it('filters by status', () => {
		const { registry } = makeRegistry();
		const pages = [
			makePage('/plan/d1', `{% decision id="ADR-001" status="accepted" date="2026-01-15" %}
# Accepted
## Context
C.
## Decision
D.
{% /decision %}`),
			makePage('/plan/d2', `{% decision id="ADR-002" status="proposed" date="2026-03-01" %}
# Proposed
## Context
C.
## Decision
D.
{% /decision %}`),
		];
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry, ctx) };

		const logPage = makePage('/plan/dashboard', `{% decision-log filter="status:accepted" /%}`);
		const processed = planPipelineHooks.postProcess!(logPage, aggregated, ctx);

		const entries = findAllTags(processed.renderable as any, t =>
			typeof t.attributes.class === 'string' && t.attributes.class.includes('rf-decision-log__entry'),
		);
		expect(entries).toHaveLength(1);
		expect(entries[0].attributes['data-id']).toBe('ADR-001');
	});
});
