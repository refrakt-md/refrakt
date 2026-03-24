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

/** Count checkbox items ([ ] and [x]) in a renderable tree's text content */
function countCheckboxes(tag: InstanceType<typeof Tag>): { checked: number; total: number } {
	const text = extractTextContent(tag);
	const unchecked = (text.match(/\[ \]/g) || []).length;
	const checked = (text.match(/\[x\]/gi) || []).length;
	return { checked, total: checked + unchecked };
}

/** Pattern matching entity ID references in content */
const ID_REF_PATTERN = /\b(WORK|SPEC|BUG|ADR)-(\d+)\b/g;
const ID_PREFIX_TO_TYPE: Record<string, string> = {
	WORK: 'work',
	SPEC: 'spec',
	BUG: 'bug',
	ADR: 'decision',
};

/** Extract all entity ID references from a tag's text content */
function extractIdReferences(tag: InstanceType<typeof Tag>): Array<{ id: string; type: string }> {
	const text = extractTextContent(tag);
	const refs: Array<{ id: string; type: string }> = [];
	const seen = new Set<string>();
	let match: RegExpExecArray | null;
	ID_REF_PATTERN.lastIndex = 0;
	while ((match = ID_REF_PATTERN.exec(text)) !== null) {
		const id = match[0]; // e.g. "WORK-048"
		const type = ID_PREFIX_TO_TYPE[match[1]];
		if (type && !seen.has(id)) {
			seen.add(id);
			refs.push({ id, type });
		}
	}
	return refs;
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

	// Add checklist progress if available
	const checkedCount = Number(entity.data.checkedCount ?? 0);
	const totalCount = Number(entity.data.totalCount ?? 0);
	if (totalCount > 0) {
		badges.push(new Tag('span', {
			'data-name': 'progress-badge',
			class: 'rf-backlog__card-progress',
			'data-checked': String(checkedCount),
			'data-total': String(totalCount),
		}, [`${checkedCount}/${totalCount}`]));
	}

	const header = new Tag('div', { class: 'rf-backlog__card-header' }, badges);
	const titleEl = new Tag('div', { class: 'rf-backlog__card-title' }, [title]);

	const children: any[] = entity.sourceUrl
		? [new Tag('a', { class: 'rf-backlog__card-link', href: entity.sourceUrl }, [header, titleEl])]
		: [header, titleEl];

	return new Tag('article', {
		class: 'rf-backlog__card',
		'data-type': type,
		'data-status': status,
		'data-id': id,
	}, children);
}

/** Build a decision log entry Tag */
function buildDecisionEntry(entity: EntityRegistration): InstanceType<typeof Tag> {
	const id = String(entity.data.id ?? entity.id);
	const title = String(entity.data.title ?? '');
	const status = String(entity.data.status ?? '');
	const date = String(entity.data.date ?? '');

	const innerChildren: any[] = [];
	if (date) innerChildren.push(new Tag('time', { class: 'rf-decision-log__date' }, [date]));
	innerChildren.push(new Tag('span', { class: 'rf-decision-log__status' }, [status]));
	innerChildren.push(new Tag('span', { class: 'rf-decision-log__id' }, [id]));
	innerChildren.push(new Tag('span', { class: 'rf-decision-log__title' }, [title]));

	const children: any[] = entity.sourceUrl
		? [new Tag('a', { class: 'rf-decision-log__link', href: entity.sourceUrl }, innerChildren)]
		: innerChildren;

	return new Tag('li', {
		class: 'rf-decision-log__entry',
		'data-status': status,
		'data-id': id,
	}, children);
}

/** A directed reference from one entity to another */
export interface EntityRelationship {
	/** The entity that contains the reference */
	fromId: string;
	fromType: string;
	/** The entity being referenced */
	toId: string;
	toType: string;
	/** Relationship kind */
	kind: 'blocks' | 'blocked-by' | 'related';
}

export interface PlanAggregatedData {
	workEntities: EntityRegistration[];
	bugEntities: EntityRegistration[];
	decisionEntities: EntityRegistration[];
	specEntities: EntityRegistration[];
	milestoneEntities: EntityRegistration[];
	/** Bidirectional relationship index: entityId → relationships */
	relationships: Map<string, EntityRelationship[]>;
}

/**
 * Module-level store for ID references found during registration.
 * Maps entityId → array of referenced entity IDs (with type).
 * Populated by register(), consumed by aggregate().
 */
const _idReferences = new Map<string, Array<{ id: string; type: string }>>();

export const planPipelineHooks: PackagePipelineHooks = {
	register(pages, registry, ctx) {
		_idReferences.clear();

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

				// Count checklist progress for work and bug items
				if (runeType === 'work' || runeType === 'bug') {
					const { checked, total } = countCheckboxes(tag);
					if (total > 0) {
						data.checkedCount = checked;
						data.totalCount = total;
					}
				}

				// Scan content for ID references
				const refs = extractIdReferences(tag).filter(r => r.id !== entityId);
				if (refs.length > 0) {
					_idReferences.set(entityId, refs);
				}

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
		// Build bidirectional relationship index from ID references
		const relationships = new Map<string, EntityRelationship[]>();

		function addRel(id: string, rel: EntityRelationship) {
			if (!relationships.has(id)) relationships.set(id, []);
			relationships.get(id)!.push(rel);
		}

		// Build a lookup of all registered entities for validation
		const allEntities = new Map<string, EntityRegistration>();
		for (const type of registry.getTypes()) {
			for (const entity of registry.getAll(type)) {
				allEntities.set(entity.id, entity);
			}
		}

		for (const [fromId, refs] of _idReferences) {
			const fromEntity = allEntities.get(fromId);
			if (!fromEntity) continue;

			for (const ref of refs) {
				const toEntity = allEntities.get(ref.id);
				if (!toEntity) continue; // Reference to unknown entity — skip

				// Determine relationship kind
				// If entity A has status "blocked" and references entity B, A is "blocked-by" B
				const fromStatus = String(fromEntity.data.status ?? '');
				const isBlockedBy = fromStatus === 'blocked';

				if (isBlockedBy) {
					// A is blocked by B
					addRel(fromId, {
						fromId, fromType: fromEntity.type,
						toId: ref.id, toType: toEntity.type,
						kind: 'blocked-by',
					});
					// B blocks A
					addRel(ref.id, {
						fromId: ref.id, fromType: toEntity.type,
						toId: fromId, toType: fromEntity.type,
						kind: 'blocks',
					});
				} else {
					// General related reference (bidirectional)
					addRel(fromId, {
						fromId, fromType: fromEntity.type,
						toId: ref.id, toType: toEntity.type,
						kind: 'related',
					});
					addRel(ref.id, {
						fromId: ref.id, fromType: toEntity.type,
						toId: fromId, toType: fromEntity.type,
						kind: 'related',
					});
				}
			}
		}

		return {
			workEntities: registry.getAll('work'),
			bugEntities: registry.getAll('bug'),
			decisionEntities: registry.getAll('decision'),
			specEntities: registry.getAll('spec'),
			milestoneEntities: registry.getAll('milestone'),
			relationships,
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

			// Inject auto-backlog into milestone rune tags
			if (tag.attributes['data-rune'] === 'milestone') {
				const milestoneName = readField(tag, 'name');
				if (milestoneName) {
					const backlog = buildMilestoneBacklog(milestoneName, planData);
					if (backlog) {
						modified = true;
						tag = new Tag(tag.name, tag.attributes, [...tag.children, backlog]) as typeof tag;
					}
				}
			}

			// Inject relationships section into entity rune tags
			if (PLAN_RUNE_TYPES.has(tag.attributes['data-rune'] as string)) {
				const runeType = tag.attributes['data-rune'] as string;
				const entityId = runeType === 'milestone'
					? readField(tag, 'name')
					: readField(tag, 'id');
				if (entityId) {
					const rels = planData.relationships.get(entityId);
					if (rels && rels.length > 0) {
						const section = buildRelationshipsSection(rels, planData);
						if (section) {
							modified = true;
							return new Tag(tag.name, tag.attributes, [...tag.children, section]);
						}
					}
				}
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
	// "all" defaults to work+bug for backward compatibility; other types must be explicit
	let entities: EntityRegistration[] = [];
	if (show === 'all' || show === 'work') entities.push(...data.workEntities);
	if (show === 'all' || show === 'bug') entities.push(...data.bugEntities);
	if (show === 'spec') entities.push(...data.specEntities);
	if (show === 'decision') entities.push(...data.decisionEntities);
	if (show === 'milestone') entities.push(...data.milestoneEntities);

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

/** Build auto-backlog section for a milestone, showing assigned work/bug items grouped by status */
function buildMilestoneBacklog(milestoneName: string, data: PlanAggregatedData): InstanceType<typeof Tag> | null {
	// Collect work and bug entities assigned to this milestone
	let entities = [
		...data.workEntities,
		...data.bugEntities,
	].filter(e => String(e.data.milestone ?? '') === milestoneName);

	if (entities.length === 0) return null;

	// Sort by priority within each group
	entities = sortEntities(entities, 'priority');

	// Group by status
	const groups = groupEntities(entities, 'status');

	// Calculate aggregate progress from checklist counts
	let totalChecked = 0;
	let totalCheckboxes = 0;
	for (const e of entities) {
		const checked = Number(e.data.checkedCount ?? 0);
		const total = Number(e.data.totalCount ?? 0);
		if (total > 0) {
			totalChecked += checked;
			totalCheckboxes += total;
		}
	}

	const children: any[] = [];

	// Add aggregate progress if any items have checklists
	if (totalCheckboxes > 0) {
		const fraction = `${totalChecked}/${totalCheckboxes}`;
		const pct = Math.round((totalChecked / totalCheckboxes) * 100);
		children.push(new Tag('div', {
			class: 'rf-milestone__progress',
			'data-checked': String(totalChecked),
			'data-total': String(totalCheckboxes),
			'data-percent': String(pct),
		}, [
			new Tag('span', { class: 'rf-milestone__progress-label' }, [`Progress: ${fraction} criteria`]),
			new Tag('span', { class: 'rf-milestone__progress-bar', style: `--rf-progress: ${pct}%` }, []),
		]));
	}

	// Add status-grouped cards
	for (const [groupName, groupItems] of groups) {
		const groupTitle = new Tag('h3', { class: 'rf-milestone__backlog-group-label' }, [groupName]);
		const cards = groupItems.map(e => buildEntityCard(e));
		children.push(new Tag('div', {
			class: 'rf-milestone__backlog-group',
			'data-status': groupName,
		}, [groupTitle, ...cards]));
	}

	return new Tag('div', { class: 'rf-milestone__backlog', 'data-name': 'backlog' }, children);
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
	milestone: ['complete', 'active', 'planning'],
};

const TYPE_LABELS: Record<string, string> = {
	work: 'work items',
	bug: 'bugs',
	spec: 'specs',
	decision: 'decisions',
	milestone: 'milestones',
};

function resolvePlanProgress(tag: InstanceType<typeof Tag>, data: PlanAggregatedData): InstanceType<typeof Tag> {
	const show = readField(tag, 'show') || 'all';

	const typeMap: Record<string, EntityRegistration[]> = {
		work: data.workEntities,
		bug: data.bugEntities,
		spec: data.specEntities,
		decision: data.decisionEntities,
		milestone: data.milestoneEntities,
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
		...data.milestoneEntities,
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

		const innerChildren = [
			new Tag('time', { class: 'rf-plan-activity__date' }, [dateStr]),
			new Tag('span', { class: 'rf-plan-activity__type' }, [type]),
			new Tag('span', { class: 'rf-plan-activity__id' }, [id]),
			new Tag('span', { class: 'rf-plan-activity__status', 'data-status': status }, [status]),
			new Tag('span', { class: 'rf-plan-activity__title' }, [title]),
		];

		const children: any[] = e.sourceUrl
			? [new Tag('a', { class: 'rf-plan-activity__link', href: e.sourceUrl }, innerChildren)]
			: innerChildren;

		return new Tag('li', {
			class: 'rf-plan-activity__entry',
			'data-type': type,
			'data-status': status,
		}, children);
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

const KIND_ORDER: Record<string, number> = { 'blocked-by': 0, 'blocks': 1, 'related': 2 };
const KIND_LABELS: Record<string, string> = { 'blocked-by': 'Blocked by', 'blocks': 'Blocks', 'related': 'Related' };

/** Look up an entity across all aggregated type arrays */
function findEntity(id: string, data: PlanAggregatedData): EntityRegistration | undefined {
	const allArrays = [data.workEntities, data.bugEntities, data.decisionEntities, data.specEntities, data.milestoneEntities];
	for (const arr of allArrays) {
		const found = arr.find(e => e.id === id);
		if (found) return found;
	}
	return undefined;
}

function buildRelationshipsSection(
	rels: EntityRelationship[],
	data: PlanAggregatedData,
): InstanceType<typeof Tag> | null {
	// Group by kind
	const byKind = new Map<string, EntityRelationship[]>();
	for (const rel of rels) {
		const kind = rel.kind;
		if (!byKind.has(kind)) byKind.set(kind, []);
		byKind.get(kind)!.push(rel);
	}

	// Deduplicate: same target ID within a kind group
	for (const [kind, kindRels] of byKind) {
		const seen = new Set<string>();
		byKind.set(kind, kindRels.filter(r => {
			const key = r.toId;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		}));
	}

	const groups: any[] = [];
	const sortedKinds = [...byKind.keys()].sort((a, b) => (KIND_ORDER[a] ?? 9) - (KIND_ORDER[b] ?? 9));

	for (const kind of sortedKinds) {
		const kindRels = byKind.get(kind)!;
		const label = KIND_LABELS[kind] || kind;

		const items: any[] = [];
		for (const rel of kindRels) {
			const targetId = rel.toId;
			const target = findEntity(targetId, data);
			const title = target ? String(target.data.title ?? '') : '';
			const status = target ? String(target.data.status ?? '') : '';
			const type = target ? target.type : rel.toType;

			const innerChildren = [
				new Tag('span', { class: 'rf-plan-relationships__id' }, [targetId]),
				new Tag('span', {
					class: 'rf-plan-relationships__status',
					'data-status': status,
				}, [status]),
				new Tag('span', { class: 'rf-plan-relationships__type' }, [type]),
				...(title ? [new Tag('span', { class: 'rf-plan-relationships__title' }, [title])] : []),
			];

			const children: any[] = target?.sourceUrl
				? [new Tag('a', { class: 'rf-plan-relationships__link', href: target.sourceUrl }, innerChildren)]
				: innerChildren;

			items.push(new Tag('li', {
				class: 'rf-plan-relationships__item',
				'data-kind': kind,
			}, children));
		}

		groups.push(new Tag('div', {
			class: 'rf-plan-relationships__group',
			'data-kind': kind,
		}, [
			new Tag('h3', { class: 'rf-plan-relationships__group-title' }, [label]),
			new Tag('ul', { class: 'rf-plan-relationships__list' }, items),
		]));
	}

	if (groups.length === 0) return null;

	return new Tag('section', {
		class: 'rf-plan-relationships',
		'data-name': 'relationships',
	}, [
		new Tag('h2', { class: 'rf-plan-relationships__heading' }, ['Relationships']),
		...groups,
	]);
}
