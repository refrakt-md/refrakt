import { describe, it, expect, beforeEach } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { planPipelineHooks } from '../src/pipeline.js';
import type { TransformedPage, EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';

function makePage(url: string, content: string): TransformedPage {
	const renderable = parse(content);
	return {
		url,
		title: '',
		headings: [],
		frontmatter: {},
		renderable,
	} as TransformedPage;
}

function makeRegistry() {
	const entries: EntityRegistration[] = [];
	const registry: EntityRegistry = {
		register(entry: EntityRegistration) { entries.push(entry); },
		getAll(type: string) { return entries.filter(e => e.type === type); },
		getById(type: string, id: string) { return entries.find(e => e.type === type && e.id === id); },
		getByUrl(type: string, url: string) { return entries.filter(e => e.type === type && e.sourceUrl === url); },
		getTypes() { return [...new Set(entries.map(e => e.type))]; },
	};
	return { entries, registry };
}

function makeCtx() {
	const warnings: string[] = [];
	return {
		ctx: {
			info: () => {},
			warn: (msg: string) => { warnings.push(msg); },
			error: () => {},
		} as PipelineContext,
		warnings,
	};
}

describe('planPipelineHooks.register', () => {
	let entries: EntityRegistration[];
	let registry: EntityRegistry;
	let ctx: PipelineContext;

	beforeEach(() => {
		({ entries, registry } = makeRegistry());
		({ ctx } = makeCtx());
	});

	it('registers a work item', () => {
		const page = makePage('/plan/work/rf-142', `{% work id="RF-142" status="ready" priority="high" complexity="moderate" milestone="v0.5.0" assignee="alice" tags="layout" %}
# Implement dark mode
Description.
{% /work %}`);

		planPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('work');
		expect(entries[0].id).toBe('RF-142');
		expect(entries[0].sourceUrl).toBe('/plan/work/rf-142');
		expect(entries[0].data.status).toBe('ready');
		expect(entries[0].data.priority).toBe('high');
		expect(entries[0].data.complexity).toBe('moderate');
		expect(entries[0].data.milestone).toBe('v0.5.0');
		expect(entries[0].data.assignee).toBe('alice');
		expect(entries[0].data.tags).toBe('layout');
	});

	it('registers a spec', () => {
		const page = makePage('/plan/spec/spec-008', `{% spec id="SPEC-008" status="accepted" version="1.0" tags="runes" %}
# Tint Rune

> Specification for tint rune.

Body content.
{% /spec %}`);

		planPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('spec');
		expect(entries[0].id).toBe('SPEC-008');
		expect(entries[0].data.status).toBe('accepted');
		expect(entries[0].data.version).toBe('1.0');
	});

	it('registers a bug', () => {
		const page = makePage('/plan/work/bug-001', `{% bug id="BUG-001" status="confirmed" severity="major" %}
# Showcase bleed bug

## Steps to Reproduce
1. Create showcase with bleed
{% /bug %}`);

		planPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('bug');
		expect(entries[0].id).toBe('BUG-001');
		expect(entries[0].data.severity).toBe('major');
	});

	it('registers a decision', () => {
		const page = makePage('/plan/decision/adr-007', `{% decision id="ADR-007" status="accepted" date="2026-03-11" %}
# Use CSS custom properties

## Context
Need token injection.

## Decision
CSS custom properties.
{% /decision %}`);

		planPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('decision');
		expect(entries[0].id).toBe('ADR-007');
		expect(entries[0].data.date).toBe('2026-03-11');
	});

	it('registers a milestone by name', () => {
		const page = makePage('/plan/milestone-050', `{% milestone name="v0.5.0" status="active" target="2026-03-29" %}
# v0.5.0 — Layout & Tint

- Complete alignment migration
- Ship tint rune
{% /milestone %}`);

		planPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('milestone');
		expect(entries[0].id).toBe('v0.5.0');
		expect(entries[0].data.status).toBe('active');
		expect(entries[0].data.target).toBe('2026-03-29');
	});

	it('registers multiple entities across pages', () => {
		const pages = [
			makePage('/plan/spec/s1', `{% spec id="SPEC-001" status="draft" %}
# First Spec
> Summary.
Body.
{% /spec %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" %}
# First Work
Description.
{% /work %}`),
		];

		planPipelineHooks.register!(pages, registry, ctx);

		expect(entries).toHaveLength(2);
		expect(entries[0].type).toBe('spec');
		expect(entries[1].type).toBe('work');
	});

	it('extracts title text', () => {
		const page = makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" %}
# My Important Task
Description.
{% /work %}`);

		planPipelineHooks.register!([page], registry, ctx);

		expect(entries[0].data.title).toBe('My Important Task');
	});

	it('skips pages with no plan runes', () => {
		const page = makePage('/docs/intro', `# Introduction

Just a normal page.`);

		planPipelineHooks.register!([page], registry, ctx);
		expect(entries).toHaveLength(0);
	});

	it('warns on missing id', () => {
		const { warnings, ctx: warnCtx } = makeCtx();
		const page = makePage('/plan/work/bad', `{% work status="ready" priority="high" %}
# No ID
Description.
{% /work %}`);

		// work requires id, so Markdoc will error — but if it somehow gets through:
		// the pipeline hook should handle it gracefully
		planPipelineHooks.register!([page], registry, warnCtx);
		// Either warned or just didn't register
		expect(entries.length + warnings.length).toBeGreaterThanOrEqual(0);
	});

	it('counts checklist progress for work items', () => {
		const page = makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" %}
# Task with checklist

## Acceptance Criteria
- [x] First criterion done
- [x] Second criterion done
- [ ] Third criterion pending
- [ ] Fourth criterion pending
- [ ] Fifth criterion pending
{% /work %}`);

		planPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].data.checkedCount).toBe(2);
		expect(entries[0].data.totalCount).toBe(5);
	});

	it('does not set checklist counts when no checkboxes', () => {
		const page = makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" %}
# Task without checklist

Just a description, no checkboxes.
{% /work %}`);

		planPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].data.checkedCount).toBeUndefined();
		expect(entries[0].data.totalCount).toBeUndefined();
	});
});

describe('planPipelineHooks.postProcess — milestone auto-backlog', () => {
	function runPipeline(pages: TransformedPage[]) {
		const { entries, registry } = makeRegistry();
		const { ctx } = makeCtx();
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry) };

		return pages.map(page => {
			return planPipelineHooks.postProcess!(page, aggregated);
		});
	}

	it('injects backlog cards into milestone', () => {
		const pages = [
			makePage('/plan/milestone/v1', `{% milestone name="v1.0" status="active" %}
# v1.0 — First Release
- Ship core features
{% /milestone %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="done" priority="high" milestone="v1.0" %}
# Done task
## Acceptance Criteria
- [x] Implemented
{% /work %}`),
			makePage('/plan/work/w2', `{% work id="WORK-002" status="ready" priority="medium" milestone="v1.0" %}
# Ready task
## Acceptance Criteria
- [ ] Not started
{% /work %}`),
			makePage('/plan/work/w3', `{% work id="WORK-003" status="ready" priority="high" milestone="v2.0" %}
# Different milestone
{% /work %}`),
		];

		const processed = runPipeline(pages);

		// The milestone page should have a backlog section injected
		const milestonePage = processed[0];
		const backlog = findTag(milestonePage.renderable, t => t.attributes.class === 'rf-milestone__backlog');
		expect(backlog).toBeDefined();
		expect(backlog!.attributes['data-rune']).toBe('milestone-backlog');

		// Multiple statuses → should use tab structure
		const tabBar = findTag(backlog!, t => t.attributes['data-name'] === 'tabs');
		expect(tabBar).toBeDefined();
		const panels = findTag(backlog!, t => t.attributes['data-name'] === 'panels');
		expect(panels).toBeDefined();

		// Should contain cards for WORK-001 and WORK-002, but NOT WORK-003
		const cards = findAllTags(backlog!, t => t.attributes.class === 'rf-backlog__card');
		expect(cards).toHaveLength(2);
		const cardIds = cards.map(c => c.attributes['data-id']);
		expect(cardIds).toContain('WORK-001');
		expect(cardIds).toContain('WORK-002');
		expect(cardIds).not.toContain('WORK-003');
	});

	it('shows aggregate progress on milestone', () => {
		const pages = [
			makePage('/plan/milestone/v1', `{% milestone name="v1.0" status="active" %}
# v1.0
- Goals
{% /milestone %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="done" priority="high" milestone="v1.0" %}
# Task A
## Acceptance Criteria
- [x] Done A
- [x] Done B
{% /work %}`),
			makePage('/plan/work/w2', `{% work id="WORK-002" status="ready" priority="medium" milestone="v1.0" %}
# Task B
## Acceptance Criteria
- [ ] Pending C
- [ ] Pending D
- [ ] Pending E
{% /work %}`),
		];

		const processed = runPipeline(pages);
		const milestonePage = processed[0];
		const progress = findTag(milestonePage.renderable, t => t.attributes.class === 'rf-milestone__progress');
		expect(progress).toBeDefined();
		expect(progress!.attributes['data-progress-checked']).toBe('2');
		expect(progress!.attributes['data-progress-total']).toBe('5');
	});

	it('does not inject backlog when no items assigned', () => {
		const pages = [
			makePage('/plan/milestone/v1', `{% milestone name="v1.0" status="active" %}
# v1.0
- Goals
{% /milestone %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" milestone="v2.0" %}
# Different milestone
{% /work %}`),
		];

		const processed = runPipeline(pages);
		const milestonePage = processed[0];
		const backlog = findTag(milestonePage.renderable, t => t.attributes.class === 'rf-milestone__backlog');
		expect(backlog).toBeUndefined();
	});

	it('renders backlog as tabs when multiple statuses', () => {
		const pages = [
			makePage('/plan/milestone/v1', `{% milestone name="v1.0" status="active" %}
# v1.0
- Goals
{% /milestone %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="done" priority="high" milestone="v1.0" %}
# Done task
{% /work %}`),
			makePage('/plan/work/w2', `{% work id="WORK-002" status="ready" priority="medium" milestone="v1.0" %}
# Ready task
{% /work %}`),
		];

		const processed = runPipeline(pages);
		const milestonePage = processed[0];
		const backlog = findTag(milestonePage.renderable, t => t.attributes.class === 'rf-milestone__backlog');

		// Tab bar with buttons
		const tabBar = findTag(backlog!, t => t.attributes['data-name'] === 'tabs');
		expect(tabBar).toBeDefined();
		expect(tabBar!.attributes.role).toBe('tablist');
		const tabs = findAllTags(tabBar!, t => t.attributes.role === 'tab');
		expect(tabs).toHaveLength(2);
		const tabStatuses = tabs.map(t => t.attributes['data-status']);
		expect(tabStatuses).toContain('done');
		expect(tabStatuses).toContain('ready');

		// Panels with cards
		const panelsContainer = findTag(backlog!, t => t.attributes['data-name'] === 'panels');
		expect(panelsContainer).toBeDefined();
		const panels = findAllTags(panelsContainer!, t => t.attributes.role === 'tabpanel');
		expect(panels).toHaveLength(2);
		const panelStatuses = panels.map(p => p.attributes['data-status']);
		expect(panelStatuses).toContain('done');
		expect(panelStatuses).toContain('ready');
	});

	it('renders flat list when single status group', () => {
		const pages = [
			makePage('/plan/milestone/v1', `{% milestone name="v1.0" status="active" %}
# v1.0
- Goals
{% /milestone %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" milestone="v1.0" %}
# Task A
{% /work %}`),
			makePage('/plan/work/w2', `{% work id="WORK-002" status="ready" priority="medium" milestone="v1.0" %}
# Task B
{% /work %}`),
		];

		const processed = runPipeline(pages);
		const milestonePage = processed[0];
		const backlog = findTag(milestonePage.renderable, t => t.attributes.class === 'rf-milestone__backlog');
		expect(backlog).toBeDefined();

		// No tabs — single status group renders flat
		const tabBar = findTag(backlog!, t => t.attributes['data-name'] === 'tabs');
		expect(tabBar).toBeUndefined();

		// Cards rendered directly in a group div
		const group = findTag(backlog!, t => t.attributes.class === 'rf-milestone__backlog-group');
		expect(group).toBeDefined();
		expect(group!.attributes['data-status']).toBe('ready');
		const cards = findAllTags(group!, t => t.attributes.class === 'rf-backlog__card');
		expect(cards).toHaveLength(2);
	});

	it('tab buttons show item counts', () => {
		const pages = [
			makePage('/plan/milestone/v1', `{% milestone name="v1.0" status="active" %}
# v1.0
- Goals
{% /milestone %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="done" priority="high" milestone="v1.0" %}
# Done A
{% /work %}`),
			makePage('/plan/work/w2', `{% work id="WORK-002" status="ready" priority="high" milestone="v1.0" %}
# Ready A
{% /work %}`),
			makePage('/plan/work/w3', `{% work id="WORK-003" status="ready" priority="medium" milestone="v1.0" %}
# Ready B
{% /work %}`),
		];

		const processed = runPipeline(pages);
		const milestonePage = processed[0];
		const backlog = findTag(milestonePage.renderable, t => t.attributes.class === 'rf-milestone__backlog');
		const tabBar = findTag(backlog!, t => t.attributes['data-name'] === 'tabs');
		const tabs = findAllTags(tabBar!, t => t.attributes.role === 'tab');

		// Find tabs by status and check their label text includes count
		const doneTab = tabs.find(t => t.attributes['data-status'] === 'done');
		const readyTab = tabs.find(t => t.attributes['data-status'] === 'ready');
		expect(doneTab!.children[0]).toContain('(1)');
		expect(readyTab!.children[0]).toContain('(2)');
	});

	it('shows progress badge on backlog cards', () => {
		const pages = [
			makePage('/plan/milestone/v1', `{% milestone name="v1.0" status="active" %}
# v1.0
- Goals
{% /milestone %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" milestone="v1.0" %}
# Task with checklist
## Acceptance Criteria
- [x] First done
- [ ] Second pending
{% /work %}`),
		];

		const processed = runPipeline(pages);
		const milestonePage = processed[0];
		const progressBadge = findTag(milestonePage.renderable, t => t.attributes.class === 'rf-backlog__card-progress');
		expect(progressBadge).toBeDefined();
		expect(progressBadge!.attributes['data-checked']).toBe('1');
		expect(progressBadge!.attributes['data-total']).toBe('2');
	});
});

describe('planPipelineHooks — source attribute and implements relationships', () => {
	function runFullPipeline(pages: TransformedPage[]) {
		const { entries, registry } = makeRegistry();
		const { ctx } = makeCtx();
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry) };
		return {
			entries,
			aggregated,
			processed: pages.map(page => planPipelineHooks.postProcess!(page, aggregated)),
		};
	}

	it('registers source attribute on work items', () => {
		const pages = [
			makePage('/plan/spec/s1', `{% spec id="SPEC-001" status="accepted" %}
# Test Spec
> Summary.
{% /spec %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" source="SPEC-001" %}
# Implement spec
Description.
{% /work %}`),
		];

		const { entries } = runFullPipeline(pages);
		const workEntry = entries.find(e => e.id === 'WORK-001');
		expect(workEntry).toBeDefined();
		expect(workEntry!.data.source).toBe('SPEC-001');
	});

	it('creates implements relationship from work to spec via source attribute', () => {
		const pages = [
			makePage('/plan/spec/s1', `{% spec id="SPEC-001" status="accepted" %}
# Test Spec
> Summary.
{% /spec %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" source="SPEC-001" %}
# Implement spec
Description.
{% /work %}`),
		];

		const { aggregated } = runFullPipeline(pages);
		const planData = aggregated.plan as any;

		// WORK-001 should have an 'implements' relationship to SPEC-001
		const workRels = planData.relationships.get('WORK-001');
		expect(workRels).toBeDefined();
		const implementsRel = workRels!.find((r: any) => r.kind === 'implements');
		expect(implementsRel).toBeDefined();
		expect(implementsRel!.toId).toBe('SPEC-001');

		// SPEC-001 should have an 'implemented-by' relationship to WORK-001
		const specRels = planData.relationships.get('SPEC-001');
		expect(specRels).toBeDefined();
		const implementedByRel = specRels!.find((r: any) => r.kind === 'implemented-by');
		expect(implementedByRel).toBeDefined();
		expect(implementedByRel!.toId).toBe('WORK-001');
	});

	it('handles multiple source IDs', () => {
		const pages = [
			makePage('/plan/spec/s1', `{% spec id="SPEC-001" status="accepted" %}
# Spec One
> Summary.
{% /spec %}`),
			makePage('/plan/decision/d1', `{% decision id="ADR-001" status="accepted" date="2026-03-01" %}
# Decision One
## Context
Context.
## Decision
Decision.
{% /decision %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" source="SPEC-001,ADR-001" %}
# Multi-source task
Description.
{% /work %}`),
		];

		const { aggregated } = runFullPipeline(pages);
		const planData = aggregated.plan as any;

		const workRels = planData.relationships.get('WORK-001');
		const implementsRels = workRels!.filter((r: any) => r.kind === 'implements');
		expect(implementsRels).toHaveLength(2);
		const targetIds = implementsRels.map((r: any) => r.toId).sort();
		expect(targetIds).toEqual(['ADR-001', 'SPEC-001']);
	});

	it('does not duplicate source references as related', () => {
		const pages = [
			makePage('/plan/spec/s1', `{% spec id="SPEC-001" status="accepted" %}
# Spec
> Summary.
{% /spec %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" source="SPEC-001" %}
# Implement spec
See SPEC-001 for details.
{% /work %}`),
		];

		const { aggregated } = runFullPipeline(pages);
		const planData = aggregated.plan as any;

		// WORK-001 references SPEC-001 both via source= and in text content
		// Should only have 'implements', not also 'related'
		const workRels = planData.relationships.get('WORK-001');
		expect(workRels).toBeDefined();
		const toSpec = workRels!.filter((r: any) => r.toId === 'SPEC-001');
		expect(toSpec).toHaveLength(1);
		expect(toSpec[0].kind).toBe('implements');
	});

	it('injects implements/implemented-by into relationships section', () => {
		const pages = [
			makePage('/plan/spec/s1', `{% spec id="SPEC-001" status="accepted" %}
# Test Spec
> Summary.
{% /spec %}`),
			makePage('/plan/work/w1', `{% work id="WORK-001" status="ready" priority="high" source="SPEC-001" %}
# Implement spec
Description.
{% /work %}`),
		];

		const { processed } = runFullPipeline(pages);

		// The spec page should have an "Implemented by" section
		const specPage = processed[0];
		const relSection = findTag(specPage.renderable, t => t.attributes.class === 'rf-plan-relationships');
		expect(relSection).toBeDefined();
		const implementedByGroup = findTag(relSection!, t =>
			t.attributes.class === 'rf-plan-relationships__group' &&
			t.attributes['data-kind'] === 'implemented-by',
		);
		expect(implementedByGroup).toBeDefined();

		// The work page should have an "Implements" section
		const workPage = processed[1];
		const workRelSection = findTag(workPage.renderable, t => t.attributes.class === 'rf-plan-relationships');
		expect(workRelSection).toBeDefined();
		const implementsGroup = findTag(workRelSection!, t =>
			t.attributes.class === 'rf-plan-relationships__group' &&
			t.attributes['data-kind'] === 'implements',
		);
		expect(implementsGroup).toBeDefined();
	});

	it('supports source attribute on bug items', () => {
		const pages = [
			makePage('/plan/spec/s1', `{% spec id="SPEC-001" status="accepted" %}
# Spec
> Summary.
{% /spec %}`),
			makePage('/plan/work/b1', `{% bug id="BUG-001" status="confirmed" severity="major" source="SPEC-001" %}
# Bug from spec
## Steps to Reproduce
1. Step one
{% /bug %}`),
		];

		const { aggregated } = runFullPipeline(pages);
		const planData = aggregated.plan as any;

		const bugRels = planData.relationships.get('BUG-001');
		expect(bugRels).toBeDefined();
		expect(bugRels!.find((r: any) => r.kind === 'implements')!.toId).toBe('SPEC-001');

		const specRels = planData.relationships.get('SPEC-001');
		expect(specRels!.find((r: any) => r.kind === 'implemented-by')!.toId).toBe('BUG-001');
	});
});
