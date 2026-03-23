import Markdoc from '@markdoc/markdoc';
import type { PackagePipelineHooks, EntityRegistration } from '@refrakt-md/types';
import { BACKLOG_SENTINEL } from './tags/backlog.js';
import { DECISION_LOG_SENTINEL } from './tags/decision-log.js';
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
