import Markdoc from '@markdoc/markdoc';
import type { PackagePipelineHooks, EntityRegistration } from '@refrakt-md/types';
import { BACKLOG_SENTINEL } from './tags/backlog.js';
import { DECISION_LOG_SENTINEL } from './tags/decision-log.js';
import { PLAN_PROGRESS_SENTINEL } from './tags/plan-progress.js';
import { PLAN_ACTIVITY_SENTINEL } from './tags/plan-activity.js';
import { parseFilter, matchesFilter, sortEntities, groupEntities } from './filter.js';

const { Tag } = Markdoc;

const PLAN_RUNE_TYPES = new Set(['spec', 'work', 'bug', 'decision', 'milestone']);

/** Fields to extract from each rune type's property meta tags */
const RUNE_FIELDS: Record<string, string[]> = {
	spec: ['id', 'status', 'version', 'supersedes', 'tags'],
	work: ['id', 'status', 'priority', 'complexity', 'assignee', 'milestone', 'tags'],
	bug: ['id', 'status', 'severity', 'assignee', 'milestone', 'tags'],
	decision: ['id', 'status', 'date', 'supersedes', 'tags'],
	milestone: ['name', 'status', 'target'],
};

function walkTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => void): void {
	if (Markdoc.Tag.isTag(node)) {
		fn(node);
		for (const child of node.children) walkTags(child, fn);
	} else if (Array.isArray(node)) {
		node.forEach(n => walkTags(n, fn));
	}
}

function mapTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => unknown): unknown {
	if (Markdoc.Tag.isTag(node)) {
		const mapped = fn(node);
		if (mapped !== node) return mapped;
		const newChildren = node.children.map(c => mapTags(c, fn));
		const changed = newChildren.some((c, i) => c !== node.children[i]);
		return changed ? new Tag(node.name, node.attributes, newChildren as any[]) : node;
	}
	if (Array.isArray(node)) return node.map(n => mapTags(n, fn));
	return node;
}

function readField(tag: InstanceType<typeof Tag>, field: string): string {
	const meta = tag.children.find(
		(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-field'] === field,
	);
	return Markdoc.Tag.isTag(meta) ? (meta.attributes.content as string) ?? '' : '';
}

function hasSentinel(tag: InstanceType<typeof Tag>, sentinel: string): boolean {
	return tag.children.some(
		(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-field'] === sentinel,
	);
}

function extractTitle(tag: InstanceType<typeof Tag>): string {
	for (const child of tag.children) {
		if (!Markdoc.Tag.isTag(child)) continue;
		if (child.attributes['data-name'] === 'title' || child.name === 'header') {
			return extractTextContent(child);
		}
	}
	return '';
}

function extractTextContent(node: unknown): string {
	if (typeof node === 'string') return node;
	if (!Markdoc.Tag.isTag(node)) return '';
	return node.children.map(c => extractTextContent(c)).join('');
}

/** Build a compact summary card Tag for a work/bug entity */
function buildEntityCard(entity: EntityRegistration): InstanceType<typeof Tag> {
	const id = String(entity.data.id ?? entity.id);
	const title = String(entity.data.title ?? '');
	const status = String(entity.data.status ?? '');
	const type = entity.type;

	const badges: any[] = [
		new Tag('span', { 'data-name': 'id-badge', class: `rf-backlog__card-id` }, [id]),
		new Tag('span', { 'data-name': 'status-badge', class: `rf-backlog__card-status` }, [status]),
	];

	if (type === 'work') {
		const priority = String(entity.data.priority ?? '');
		const complexity = String(entity.data.complexity ?? '');
		if (priority) badges.push(new Tag('span', { 'data-name': 'priority-badge', class: `rf-backlog__card-priority` }, [priority]));
		if (complexity && complexity !== 'unknown') badges.push(new Tag('span', { 'data-name': 'complexity-badge', class: `rf-backlog__card-complexity` }, [complexity]));
	} else if (type === 'bug') {
		const severity = String(entity.data.severity ?? '');
		if (severity) badges.push(new Tag('span', { 'data-name': 'severity-badge', class: `rf-backlog__card-severity` }, [severity]));
	}

	const milestone = String(entity.data.milestone ?? '');
	if (milestone) badges.push(new Tag('span', { 'data-name': 'milestone-badge', class: `rf-backlog__card-milestone` }, [milestone]));

	const header = new Tag('div', { class: 'rf-backlog__card-header' }, badges);
	const titleEl = new Tag('div', { class: 'rf-backlog__card-title' }, [title]);

	return new Tag('article', {
		class: 'rf-backlog__card',
		'data-type': type,
		'data-status': status,
		'data-id': id,
	}, [header, titleEl]);
}

/** Build a decision log entry Tag */
function buildDecisionEntry(entity: EntityRegistration): InstanceType<typeof Tag> {
	const id = String(entity.data.id ?? entity.id);
	const title = String(entity.data.title ?? '');
	const status = String(entity.data.status ?? '');
	const date = String(entity.data.date ?? '');

	const children: any[] = [];
	if (date) children.push(new Tag('time', { class: 'rf-decision-log__date' }, [date]));
	children.push(new Tag('span', { class: 'rf-decision-log__status' }, [status]));
	children.push(new Tag('span', { class: 'rf-decision-log__id' }, [id]));
	children.push(new Tag('span', { class: 'rf-decision-log__title' }, [title]));

	return new Tag('li', {
		class: 'rf-decision-log__entry',
		'data-status': status,
		'data-id': id,
	}, children);
}

export interface PlanAggregatedData {
	workEntities: EntityRegistration[];
	bugEntities: EntityRegistration[];
	decisionEntities: EntityRegistration[];
	specEntities: EntityRegistration[];
	milestoneEntities: EntityRegistration[];
}

export const planPipelineHooks: PackagePipelineHooks = {
	register(pages, registry, ctx) {
		for (const page of pages) {
			walkTags(page.renderable, (tag) => {
				const runeType = tag.attributes['data-rune'] as string;
				if (!PLAN_RUNE_TYPES.has(runeType)) return;

				const fields = RUNE_FIELDS[runeType];
				if (!fields) return;

				const data: Record<string, unknown> = {};
				for (const field of fields) {
					data[field] = readField(tag, field);
				}

				const entityId = runeType === 'milestone'
					? (data.name as string)
					: (data.id as string);

				if (!entityId) {
					ctx.warn(`Plan ${runeType} missing ${runeType === 'milestone' ? 'name' : 'id'} attribute`, page.url);
					return;
				}

				const title = extractTitle(tag);
				data.title = title;

				registry.register({
					type: runeType,
					id: entityId,
					sourceUrl: page.url,
					data,
				});
			});
		}
	},

	aggregate(registry) {
		return {
			workEntities: registry.getAll('work'),
			bugEntities: registry.getAll('bug'),
			decisionEntities: registry.getAll('decision'),
			specEntities: registry.getAll('spec'),
			milestoneEntities: registry.getAll('milestone'),
		} satisfies PlanAggregatedData;
	},

	postProcess(page, aggregated) {
		const planData = aggregated['plan'] as PlanAggregatedData | undefined;
		if (!planData) return page;

		let modified = false;
		const newRenderable = mapTags(page.renderable, (tag) => {
			// Handle backlog sentinel
			if (tag.attributes['data-rune'] === 'backlog' && hasSentinel(tag, BACKLOG_SENTINEL)) {
				modified = true;
				return resolveBacklog(tag, planData);
			}
			// Handle decision-log sentinel
			if (tag.attributes['data-rune'] === 'decision-log' && hasSentinel(tag, DECISION_LOG_SENTINEL)) {
				modified = true;
				return resolveDecisionLog(tag, planData);
			}
			// Handle plan-progress sentinel
			if (tag.attributes['data-rune'] === 'plan-progress' && hasSentinel(tag, PLAN_PROGRESS_SENTINEL)) {
				modified = true;
				return resolvePlanProgress(tag, planData);
			}
			// Handle plan-activity sentinel
			if (tag.attributes['data-rune'] === 'plan-activity' && hasSentinel(tag, PLAN_ACTIVITY_SENTINEL)) {
				modified = true;
				return resolvePlanActivity(tag, planData);
			}
			return tag;
		});

		if (!modified) return page;
		return { ...page, renderable: newRenderable as typeof page.renderable };
	},
};

function resolveBacklog(tag: InstanceType<typeof Tag>, data: PlanAggregatedData): InstanceType<typeof Tag> {
	const filterExpr = readField(tag, 'filter');
	const sortField = readField(tag, 'sort') || 'priority';
	const groupField = readField(tag, 'group');
	const show = readField(tag, 'show') || 'all';

	// Collect entities by type
	let entities: EntityRegistration[] = [];
	if (show === 'all' || show === 'work') entities.push(...data.workEntities);
	if (show === 'all' || show === 'bug') entities.push(...data.bugEntities);

	// Apply filter
	const filter = parseFilter(filterExpr);
	entities = entities.filter(e => matchesFilter(e, filter));

	// Sort
	entities = sortEntities(entities, sortField);

	// Build output
	let children: any[];
	if (groupField) {
		const groups = groupEntities(entities, groupField);
		children = [];
		for (const [groupName, groupEntities_] of groups) {
			const groupTitle = new Tag('h3', { class: 'rf-backlog__group-title' }, [groupName]);
			const cards = groupEntities_.map(e => buildEntityCard(e));
			const groupDiv = new Tag('div', { class: 'rf-backlog__group', 'data-group': groupName }, [groupTitle, ...cards]);
			children.push(groupDiv);
		}
	} else {
		children = entities.map(e => buildEntityCard(e));
	}

	const itemsDiv = new Tag('div', { 'data-name': 'items' }, children);

	// Rebuild tag, replacing the sentinel and placeholder with resolved content
	const newChildren = tag.children.filter(
		(c: unknown) => !(Markdoc.Tag.isTag(c) && (
			c.attributes['data-field'] === BACKLOG_SENTINEL ||
			c.attributes['data-name'] === 'items'
		)),
	);
	newChildren.push(itemsDiv);

	return new Tag(tag.name, tag.attributes, newChildren as any[]);
}

function resolveDecisionLog(tag: InstanceType<typeof Tag>, data: PlanAggregatedData): InstanceType<typeof Tag> {
	const filterExpr = readField(tag, 'filter');
	const sortField = readField(tag, 'sort') || 'date';

	let entities = [...data.decisionEntities];

	// Apply filter
	const filter = parseFilter(filterExpr);
	entities = entities.filter(e => matchesFilter(e, filter));

	// Sort
	entities = sortEntities(entities, sortField);

	const entries = entities.map(e => buildDecisionEntry(e));
	const list = new Tag('ol', { 'data-name': 'items', class: 'rf-decision-log__list' }, entries);

	// Rebuild tag
	const newChildren = tag.children.filter(
		(c: unknown) => !(Markdoc.Tag.isTag(c) && (
			c.attributes['data-field'] === DECISION_LOG_SENTINEL ||
			c.attributes['data-name'] === 'items'
		)),
	);
	newChildren.push(list);

	return new Tag(tag.name, tag.attributes, newChildren as any[]);
}

// --- Status labels for display ---
const STATUS_LABELS: Record<string, string[]> = {
	work: ['done', 'in-progress', 'review', 'ready', 'blocked', 'draft', 'pending'],
	bug: ['fixed', 'in-progress', 'confirmed', 'reported', 'wontfix', 'duplicate'],
	spec: ['accepted', 'review', 'draft', 'superseded', 'deprecated'],
	decision: ['accepted', 'proposed', 'superseded', 'deprecated'],
};

const TYPE_LABELS: Record<string, string> = {
	work: 'work items',
	bug: 'bugs',
	spec: 'specs',
	decision: 'decisions',
};

function resolvePlanProgress(tag: InstanceType<typeof Tag>, data: PlanAggregatedData): InstanceType<typeof Tag> {
	const show = readField(tag, 'show') || 'all';

	const typeMap: Record<string, EntityRegistration[]> = {
		work: data.workEntities,
		bug: data.bugEntities,
		spec: data.specEntities,
		decision: data.decisionEntities,
	};

	const types = show === 'all' ? Object.keys(typeMap) : show.split(',').map(s => s.trim());
	const rows: any[] = [];

	for (const type of types) {
		const entities = typeMap[type];
		if (!entities || entities.length === 0) continue;

		const statusCounts = new Map<string, number>();
		for (const e of entities) {
			const status = String(e.data.status ?? 'unknown');
			statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
		}

		// Build status count spans in canonical order
		const statusOrder = STATUS_LABELS[type] ?? [];
		const countSpans: any[] = [];
		for (const status of statusOrder) {
			const count = statusCounts.get(status);
			if (!count) continue;
			countSpans.push(new Tag('span', {
				class: 'rf-plan-progress__count',
				'data-status': status,
			}, [`${count} ${status}`]));
		}
		// Include any statuses not in the canonical list
		for (const [status, count] of statusCounts) {
			if (statusOrder.includes(status)) continue;
			countSpans.push(new Tag('span', {
				class: 'rf-plan-progress__count',
				'data-status': status,
			}, [`${count} ${status}`]));
		}

		const label = TYPE_LABELS[type] ?? type;
		const row = new Tag('div', {
			class: 'rf-plan-progress__row',
			'data-type': type,
		}, [
			new Tag('span', { class: 'rf-plan-progress__label' }, [`${entities.length} ${label}`]),
			new Tag('span', { class: 'rf-plan-progress__counts' }, countSpans),
		]);
		rows.push(row);
	}

	const itemsDiv = new Tag('div', { 'data-name': 'items' }, rows);

	const newChildren = tag.children.filter(
		(c: unknown) => !(Markdoc.Tag.isTag(c) && (
			c.attributes['data-field'] === PLAN_PROGRESS_SENTINEL ||
			c.attributes['data-name'] === 'items'
		)),
	);
	newChildren.push(itemsDiv);

	return new Tag(tag.name, tag.attributes, newChildren as any[]);
}

function resolvePlanActivity(tag: InstanceType<typeof Tag>, data: PlanAggregatedData): InstanceType<typeof Tag> {
	const limit = parseInt(readField(tag, 'limit') || '10', 10);

	// Collect all entities with mtime from their source URL registration data
	const allEntities = [
		...data.workEntities,
		...data.bugEntities,
		...data.decisionEntities,
		...data.specEntities,
	];

	// Sort by mtime descending (entities with mtime data)
	const withMtime = allEntities
		.filter(e => e.data.mtime != null && Number(e.data.mtime) > 0)
		.sort((a, b) => Number(b.data.mtime) - Number(a.data.mtime))
		.slice(0, limit);

	const entries = withMtime.map(e => {
		const id = String(e.data.id ?? e.id);
		const title = String(e.data.title ?? '');
		const status = String(e.data.status ?? '');
		const type = e.type;
		const mtime = Number(e.data.mtime);
		const dateStr = new Date(mtime).toISOString().slice(0, 10);

		return new Tag('li', {
			class: 'rf-plan-activity__entry',
			'data-type': type,
			'data-status': status,
		}, [
			new Tag('time', { class: 'rf-plan-activity__date' }, [dateStr]),
			new Tag('span', { class: 'rf-plan-activity__type' }, [type]),
			new Tag('span', { class: 'rf-plan-activity__id' }, [id]),
			new Tag('span', { class: 'rf-plan-activity__status', 'data-status': status }, [status]),
			new Tag('span', { class: 'rf-plan-activity__title' }, [title]),
		]);
	});

	const list = new Tag('ol', { 'data-name': 'items', class: 'rf-plan-activity__list' }, entries);

	const newChildren = tag.children.filter(
		(c: unknown) => !(Markdoc.Tag.isTag(c) && (
			c.attributes['data-field'] === PLAN_ACTIVITY_SENTINEL ||
			c.attributes['data-name'] === 'items'
		)),
	);
	newChildren.push(list);

	return new Tag(tag.name, tag.attributes, newChildren as any[]);
}
