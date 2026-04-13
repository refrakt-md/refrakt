import Markdoc from '@markdoc/markdoc';
import type { PackagePipelineHooks, EntityRegistration } from '@refrakt-md/types';
import { BACKLOG_SENTINEL } from './tags/backlog.js';
import { DECISION_LOG_SENTINEL } from './tags/decision-log.js';
import { PLAN_PROGRESS_SENTINEL } from './tags/plan-progress.js';
import { PLAN_ACTIVITY_SENTINEL } from './tags/plan-activity.js';
import { PLAN_HISTORY_SENTINEL } from './tags/plan-history.js';
import { parseFilter, matchesFilter, sortEntities, groupEntities } from './filter.js';
import { execSync } from 'node:child_process';
import {
	extractBatchHistory,
	readHistoryCache,
	writeHistoryCache,
	type HistoryEvent,
	type HistoryCache,
} from './history.js';

const { Tag } = Markdoc;

const PLAN_RUNE_TYPES = new Set(['spec', 'work', 'bug', 'decision', 'milestone']);

/** Fields to extract from each rune type's property meta tags */
const RUNE_FIELDS: Record<string, string[]> = {
	spec: ['id', 'status', 'version', 'supersedes', 'tags', 'modified'],
	work: ['id', 'status', 'priority', 'complexity', 'assignee', 'milestone', 'source', 'tags', 'modified'],
	bug: ['id', 'status', 'severity', 'assignee', 'milestone', 'source', 'tags', 'modified'],
	decision: ['id', 'status', 'date', 'supersedes', 'source', 'tags', 'modified'],
	milestone: ['name', 'status', 'target', 'modified'],
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

/** Parse a modified date value (ISO string or numeric timestamp) to a sortable number */
function parseModifiedDate(value: unknown): number {
	if (value == null) return 0;
	if (typeof value === 'number') return value;
	const str = String(value);
	const parsed = Date.parse(str);
	return isNaN(parsed) ? 0 : parsed;
}

/** Format a modified date value to an ISO date string */
function formatModifiedDate(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
	const ts = typeof value === 'number' ? value : Date.parse(String(value));
	if (isNaN(ts)) return '';
	return new Date(ts).toISOString().slice(0, 10);
}

// ─── Sentiment maps (matching rune configs in config.ts) ───

const WORK_STATUS_SENTIMENT: Record<string, string> = {
	draft: 'neutral', ready: 'neutral', 'in-progress': 'neutral',
	review: 'caution', done: 'positive', blocked: 'negative',
};
const BUG_STATUS_SENTIMENT: Record<string, string> = {
	reported: 'neutral', confirmed: 'caution', 'in-progress': 'neutral',
	fixed: 'positive', wontfix: 'neutral', duplicate: 'neutral',
};
const PRIORITY_SENTIMENT: Record<string, string> = {
	critical: 'negative', high: 'caution', medium: 'neutral', low: 'neutral',
};
const SEVERITY_SENTIMENT: Record<string, string> = {
	critical: 'negative', major: 'caution', minor: 'neutral', trivial: 'neutral',
};
const SPEC_STATUS_SENTIMENT: Record<string, string> = {
	draft: 'neutral', review: 'caution', accepted: 'positive', superseded: 'caution', deprecated: 'negative',
};
const DECISION_STATUS_SENTIMENT: Record<string, string> = {
	proposed: 'neutral', accepted: 'positive', superseded: 'caution', deprecated: 'negative',
};
const MILESTONE_STATUS_SENTIMENT: Record<string, string> = {
	planning: 'neutral', active: 'positive', complete: 'positive',
};

/** Build a metadata badge matching the dimension system output */
function buildMetaBadge(label: string, value: string, opts: {
	metaType: string; metaRank: string; sentiment?: string; labelHidden?: boolean;
}): InstanceType<typeof Tag> {
	const labelAttrs: Record<string, string> = { 'data-meta-label': '' };
	if (opts.labelHidden) labelAttrs['data-meta-label-hidden'] = '';
	const labelEl = new Tag('span', labelAttrs, [label]);
	const valueEl = new Tag('span', { 'data-meta-value': '' }, [value]);
	const attrs: Record<string, string> = {
		'data-meta-type': opts.metaType,
		'data-meta-rank': opts.metaRank,
	};
	if (opts.sentiment) attrs['data-meta-sentiment'] = opts.sentiment;
	return new Tag('span', attrs, [labelEl, valueEl]);
}

/** Build a compact summary card Tag for any plan entity */
function buildEntityCard(entity: EntityRegistration): InstanceType<typeof Tag> {
	const type = entity.type;
	const id = String(type === 'milestone' ? (entity.data.name ?? entity.id) : (entity.data.id ?? entity.id));
	const title = String(entity.data.title ?? '');
	const status = String(entity.data.status ?? '');

	// Header: ID on the left, status + progress on the right
	const headerLeft: any[] = [
		buildMetaBadge('ID:', id, { metaType: 'id', metaRank: 'primary', labelHidden: true }),
	];

	const headerRight: any[] = [];
	const statusSentiment = type === 'work' ? WORK_STATUS_SENTIMENT[status]
		: type === 'bug' ? BUG_STATUS_SENTIMENT[status]
		: type === 'spec' ? SPEC_STATUS_SENTIMENT[status]
		: type === 'decision' ? DECISION_STATUS_SENTIMENT[status]
		: type === 'milestone' ? MILESTONE_STATUS_SENTIMENT[status]
		: undefined;
	headerRight.push(buildMetaBadge('Status:', status, { metaType: 'status', metaRank: 'primary', sentiment: statusSentiment, labelHidden: true }));

	// Progress in header (no circle indicator)
	const checkedCount = Number(entity.data.checkedCount ?? 0);
	const totalCount = Number(entity.data.totalCount ?? 0);
	if (totalCount > 0) {
		headerRight.push(new Tag('span', {
			class: 'rf-backlog__card-progress',
			'data-checked': String(checkedCount),
			'data-total': String(totalCount),
		}, [`${checkedCount}/${totalCount}`]));
	}

	const header = new Tag('div', { 'data-section': 'header' }, [
		new Tag('span', { class: 'rf-backlog__card-header-left' }, headerLeft),
		new Tag('span', { class: 'rf-backlog__card-header-right' }, headerRight),
	]);

	// Body: title
	const titleEl = new Tag('div', { 'data-section': 'title' }, [title]);

	// Footer: secondary metadata pills
	const footerBadges: any[] = [];
	if (type === 'work') {
		const priority = String(entity.data.priority ?? '');
		const complexity = String(entity.data.complexity ?? '');
		if (priority) footerBadges.push(buildMetaBadge('Priority:', priority, { metaType: 'category', metaRank: 'secondary', sentiment: PRIORITY_SENTIMENT[priority] }));
		if (complexity && complexity !== 'unknown') footerBadges.push(buildMetaBadge('Complexity:', complexity, { metaType: 'quantity', metaRank: 'secondary' }));
	} else if (type === 'bug') {
		const severity = String(entity.data.severity ?? '');
		if (severity) footerBadges.push(buildMetaBadge('Severity:', severity, { metaType: 'category', metaRank: 'secondary', sentiment: SEVERITY_SENTIMENT[severity] }));
	} else if (type === 'spec') {
		const version = String(entity.data.version ?? '');
		if (version) footerBadges.push(buildMetaBadge('Version:', version, { metaType: 'quantity', metaRank: 'secondary' }));
	} else if (type === 'decision') {
		const date = String(entity.data.date ?? '');
		if (date) footerBadges.push(buildMetaBadge('Date:', date, { metaType: 'temporal', metaRank: 'secondary' }));
	} else if (type === 'milestone') {
		const target = String(entity.data.target ?? '');
		if (target) footerBadges.push(buildMetaBadge('Target:', target, { metaType: 'temporal', metaRank: 'secondary' }));
	}

	const milestone = String(entity.data.milestone ?? '');
	if (milestone) footerBadges.push(buildMetaBadge('Milestone:', milestone, { metaType: 'tag', metaRank: 'secondary', labelHidden: true }));

	const sections: any[] = [header, titleEl];
	if (footerBadges.length > 0) {
		sections.push(new Tag('div', { 'data-section': 'footer' }, footerBadges));
	}

	const children: any[] = entity.sourceUrl
		? [new Tag('a', { class: 'rf-backlog__card-link', href: entity.sourceUrl }, sections)]
		: sections;

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

	const badges: any[] = [
		buildMetaBadge('ID:', id, { metaType: 'id', metaRank: 'primary', labelHidden: true }),
		buildMetaBadge('Status:', status, { metaType: 'status', metaRank: 'primary', sentiment: DECISION_STATUS_SENTIMENT[status], labelHidden: true }),
	];
	if (date) badges.push(buildMetaBadge('Date:', date, { metaType: 'temporal', metaRank: 'secondary' }));

	const header = new Tag('div', { 'data-section': 'header' }, badges);
	const titleEl = new Tag('div', { 'data-section': 'title' }, [title]);

	const innerChildren = [header, titleEl];
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
	kind: 'blocks' | 'blocked-by' | 'depends-on' | 'dependency-of' | 'implements' | 'implemented-by' | 'informs' | 'informed-by' | 'related';
}

/**
 * Module-level store for dependency refs extracted from ## Dependencies sections.
 * Maps entityId → array of dependency entity IDs.
 * Set by render-pipeline.ts from scanner data before register() runs.
 */
const _scannerDependencies = new Map<string, string[]>();

/** Set scanner dependency data for the pipeline's aggregate() hook to consume */
export function setScannerDependencies(deps: Map<string, string[]>): void {
	_scannerDependencies.clear();
	for (const [k, v] of deps) _scannerDependencies.set(k, v);
}

/**
 * Module-level store for the plan directory path.
 * Set by render-pipeline.ts before aggregate() runs.
 */
let _planDir: string | undefined;

/** Set the plan directory path for the pipeline's aggregate() hook to consume */
export function setPlanDir(dir: string): void {
	_planDir = dir;
}

export interface PlanAggregatedData {
	workEntities: EntityRegistration[];
	bugEntities: EntityRegistration[];
	decisionEntities: EntityRegistration[];
	specEntities: EntityRegistration[];
	milestoneEntities: EntityRegistration[];
	/** Bidirectional relationship index: entityId → relationships */
	relationships: Map<string, EntityRelationship[]>;
	/** Git-derived history events per entity file path */
	history: Map<string, HistoryEvent[]>;
	/** Repository URL for commit links (parsed from git remote or config) */
	repositoryUrl?: string;
}

/** Parse a comma-separated `source` attribute into typed ID references */
function parseSourceIds(source: string): Array<{ id: string; type: string }> {
	if (!source) return [];
	const refs: Array<{ id: string; type: string }> = [];
	for (const raw of source.split(',')) {
		const id = raw.trim();
		if (!id) continue;
		const match = id.match(/^(WORK|SPEC|BUG|ADR)-\d+$/);
		if (match) {
			const type = ID_PREFIX_TO_TYPE[match[1]];
			if (type) refs.push({ id, type });
		}
	}
	return refs;
}

/**
 * Module-level store for ID references found during registration.
 * Maps entityId → array of referenced entity IDs (with type).
 * Populated by register(), consumed by aggregate().
 */
const _idReferences = new Map<string, Array<{ id: string; type: string }>>();

/**
 * Module-level store for structured source references (from source= attribute).
 * Maps entityId → array of source entity IDs (with type).
 * These produce 'implements' / 'implemented-by' relationships.
 */
const _sourceReferences = new Map<string, Array<{ id: string; type: string }>>();

export const planPipelineHooks: PackagePipelineHooks = {
	register(pages, registry, ctx) {
		_idReferences.clear();
		_sourceReferences.clear();

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

				// Extract structured source references from source= attribute
				const sourceVal = String(data.source ?? '');
				const sourceRefs = parseSourceIds(sourceVal).filter(r => r.id !== entityId);
				if (sourceRefs.length > 0) {
					_sourceReferences.set(entityId, sourceRefs);
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

	aggregate(registry, ctx) {
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

		// Track IDs already linked via source= to avoid duplicate 'related' edges
		const sourceLinked = new Set<string>();

		// Process structured source= references → implements / implemented-by (or informs / informed-by for decisions)
		for (const [fromId, refs] of _sourceReferences) {
			const fromEntity = allEntities.get(fromId);
			if (!fromEntity) continue;

			// Decisions use informs/informed-by; work/bug use implements/implemented-by
			const isDecision = fromEntity.type === 'decision';
			const forwardKind: EntityRelationship['kind'] = isDecision ? 'informs' : 'implements';
			const reverseKind: EntityRelationship['kind'] = isDecision ? 'informed-by' : 'implemented-by';

			for (const ref of refs) {
				const toEntity = allEntities.get(ref.id);
				if (!toEntity) continue;

				sourceLinked.add(`${fromId}→${ref.id}`);

				// A implements/informs B
				addRel(fromId, {
					fromId, fromType: fromEntity.type,
					toId: ref.id, toType: toEntity.type,
					kind: forwardKind,
				});
				// B is implemented-by/informed-by A
				addRel(ref.id, {
					fromId: ref.id, fromType: toEntity.type,
					toId: fromId, toType: fromEntity.type,
					kind: reverseKind,
				});
			}
		}

		// Track IDs already linked via depends-on to avoid duplicate 'related' edges
		const depLinked = new Set<string>();

		// Process scanner dependency data → depends-on / dependency-of
		for (const [fromId, depIds] of _scannerDependencies) {
			const fromEntity = allEntities.get(fromId);
			if (!fromEntity) continue;

			for (const depId of depIds) {
				const toEntity = allEntities.get(depId);
				if (!toEntity) continue;

				depLinked.add(`${fromId}→${depId}`);

				// A depends-on B
				addRel(fromId, {
					fromId, fromType: fromEntity.type,
					toId: depId, toType: toEntity.type,
					kind: 'depends-on',
				});
				// B is dependency-of A
				addRel(depId, {
					fromId: depId, fromType: toEntity.type,
					toId: fromId, toType: fromEntity.type,
					kind: 'dependency-of',
				});
			}
		}

		// Process text-based ID references → blocks / blocked-by / related
		for (const [fromId, refs] of _idReferences) {
			const fromEntity = allEntities.get(fromId);
			if (!fromEntity) continue;

			for (const ref of refs) {
				const toEntity = allEntities.get(ref.id);
				if (!toEntity) continue; // Reference to unknown entity — skip

				// Skip if already linked via source= attribute or dependency
				if (sourceLinked.has(`${fromId}→${ref.id}`)) continue;
				if (depLinked.has(`${fromId}→${ref.id}`)) continue;

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

		// Extract git history for all entities
		let history = new Map<string, HistoryEvent[]>();
		let repositoryUrl: string | undefined;
		try {
			const planDir = _planDir ?? 'plan';
			const cache = readHistoryCache(planDir);
			history = extractBatchHistory(planDir, '.', { cache });
			writeHistoryCache(planDir, cache);

			// Parse repository URL from git remote
			try {
				const remoteUrl = execSync('git remote get-url origin', {
					encoding: 'utf-8',
					stdio: ['pipe', 'pipe', 'pipe'],
				}).trim();
				// Convert SSH URLs to HTTPS
				const sshMatch = remoteUrl.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
				if (sshMatch) {
					repositoryUrl = `https://${sshMatch[1]}/${sshMatch[2]}`;
				} else if (remoteUrl.startsWith('https://')) {
					repositoryUrl = remoteUrl.replace(/\.git$/, '');
				}
			} catch {
				// No remote configured
			}
		} catch (err) {
			// Git not available or not a git repo — history will be empty
			ctx.warn(`Could not extract git history: ${err instanceof Error ? err.message : String(err)}`);
		}

		return {
			workEntities: registry.getAll('work'),
			bugEntities: registry.getAll('bug'),
			decisionEntities: registry.getAll('decision'),
			specEntities: registry.getAll('spec'),
			milestoneEntities: registry.getAll('milestone'),
			relationships,
			history,
			repositoryUrl,
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
			// Handle plan-history sentinel
			if (tag.attributes['data-rune'] === 'plan-history' && hasSentinel(tag, PLAN_HISTORY_SENTINEL)) {
				modified = true;
				return resolvePlanHistory(tag, planData);
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

			// Wrap entity content in tab-group with Overview / Relationships / History panels
			if (PLAN_RUNE_TYPES.has(tag.attributes['data-rune'] as string)) {
				const runeType = tag.attributes['data-rune'] as string;
				const entityId = runeType === 'milestone'
					? readField(tag, 'name')
					: readField(tag, 'id');
				if (entityId) {
					const rels = planData.relationships.get(entityId);
					const relationshipsSection = (rels && rels.length > 0)
						? buildRelationshipsSection(rels, planData)
						: null;
					const historySection = buildAutoHistorySection(entityId, planData);

					// Only add tabs if there is content for at least one extra panel
					if (relationshipsSection || historySection) {
						modified = true;

						// Partition children: structural (headers, preamble, meta fields) stay at top;
						// body content goes into the Overview tab panel
						const STRUCTURAL_SECTIONS = new Set(['header', 'preamble']);
						const structural: any[] = [];
						const bodyContent: any[] = [];
						for (const child of tag.children) {
							if (Markdoc.Tag.isTag(child) && (
								child.attributes['data-field'] != null ||
								STRUCTURAL_SECTIONS.has(child.attributes['data-section'])
							)) {
								structural.push(child);
							} else {
								bodyContent.push(child);
							}
						}

						const tabWrapper = buildEntityTabGroup(
							bodyContent,
							relationshipsSection,
							historySection,
						);
						return new Tag(tag.name, tag.attributes, [...structural, tabWrapper]);
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
			'data-progress-checked': String(totalChecked),
			'data-progress-total': String(totalCheckboxes),
			'data-percent': String(pct),
		}, [
			new Tag('div', { class: 'rf-milestone__progress-header' }, [
				new Tag('span', { class: 'rf-milestone__progress-label' }, ['Progress']),
				new Tag('span', { class: 'rf-milestone__progress-count' }, [`${fraction} criteria`]),
			]),
			new Tag('span', { class: 'rf-milestone__progress-bar', style: `--rf-progress: ${pct}%` }, []),
		]));
	}

	// Build status-grouped cards as tabs (or flat list for single group)
	const groupEntries = [...groups.entries()];

	if (groupEntries.length === 1) {
		// Single status — no tabs needed, render flat
		const [groupName, groupItems] = groupEntries[0];
		const cards = groupItems.map(e => buildEntityCard(e));
		children.push(new Tag('div', {
			class: 'rf-milestone__backlog-group',
			'data-status': groupName,
		}, [new Tag('h3', { class: 'rf-milestone__backlog-group-label' }, [groupName]), ...cards]));
	} else {
		// Multiple statuses — render as tabs
		const tabButtons: any[] = [];
		const tabPanels: any[] = [];

		for (const [groupName, groupItems] of groupEntries) {
			const label = groupName.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
			tabButtons.push(new Tag('button', {
				role: 'tab',
				class: 'rf-milestone__tab',
				'data-status': groupName,
			}, [`${label} (${groupItems.length})`]));

			const cards = groupItems.map(e => buildEntityCard(e));
			tabPanels.push(new Tag('div', {
				role: 'tabpanel',
				class: 'rf-milestone__panel',
				'data-status': groupName,
			}, cards));
		}

		children.push(new Tag('div', {
			'data-name': 'tabs',
			role: 'tablist',
			class: 'rf-milestone__tabs',
		}, tabButtons));

		children.push(new Tag('div', {
			'data-name': 'panels',
			class: 'rf-milestone__panels',
		}, tabPanels));
	}

	return new Tag('div', { class: 'rf-milestone__backlog', 'data-name': 'backlog', 'data-rune': 'milestone-backlog' }, children);
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

	// Sort by modified date descending (entities with modification data)
	const withModified = allEntities
		.filter(e => {
			const mod = e.data.modified ?? e.data.mtime;
			if (mod == null) return false;
			if (typeof mod === 'string') return mod.length > 0;
			return Number(mod) > 0;
		})
		.sort((a, b) => {
			const aDate = parseModifiedDate(a.data.modified ?? a.data.mtime);
			const bDate = parseModifiedDate(b.data.modified ?? b.data.mtime);
			return bDate - aDate;
		})
		.slice(0, limit);

	const entries = withModified.map(e => {
		const id = String(e.data.id ?? e.id);
		const title = String(e.data.title ?? '');
		const status = String(e.data.status ?? '');
		const type = e.type;
		const dateStr = formatModifiedDate(e.data.modified ?? e.data.mtime);

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

// ─── Plan History Resolution ───

function formatHistoryDate(isoDate: string): string {
	const d = new Date(isoDate);
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${months[d.getMonth()]} ${d.getDate()}`;
}

function buildAttrChangeTag(change: { field: string; from: string | null; to: string | null }): InstanceType<typeof Tag> {
	const children: any[] = [
		new Tag('span', { class: 'rf-plan-history__field' }, [change.field]),
	];
	if (change.from !== null) {
		children.push(new Tag('span', { class: 'rf-plan-history__value', 'data-type': 'remove' }, [change.from]));
	}
	if (change.from !== null && change.to !== null) {
		children.push(new Tag('span', { class: 'rf-plan-history__arrow' }, ['→']));
	}
	if (change.to !== null) {
		const prefix = change.from === null ? '+' : '';
		children.push(new Tag('span', { class: 'rf-plan-history__value', 'data-type': 'add' }, [prefix + change.to]));
	}
	if (change.from !== null && change.to === null) {
		// Removed attribute — show as removal only
	}
	return new Tag('span', { class: 'rf-plan-history__change' }, children);
}

function buildEventTag(event: HistoryEvent, repositoryUrl?: string, collapseThreshold = 3): InstanceType<typeof Tag> {
	const dateTag = new Tag('time', { class: 'rf-plan-history__date' }, [formatHistoryDate(event.date)]);

	const hashChildren: any[] = [event.shortHash];
	const hashAttrs: Record<string, any> = { class: 'rf-plan-history__hash' };
	if (repositoryUrl) {
		const hashTag = new Tag('a', {
			class: 'rf-plan-history__hash',
			href: `${repositoryUrl}/commit/${event.hash}`,
		}, [event.shortHash]);
		return buildEventTagInner(event, dateTag, hashTag, collapseThreshold);
	}
	const hashTag = new Tag('code', hashAttrs, hashChildren);
	return buildEventTagInner(event, dateTag, hashTag, collapseThreshold);
}

function buildEventTagInner(
	event: HistoryEvent,
	dateTag: InstanceType<typeof Tag>,
	hashTag: InstanceType<typeof Tag>,
	collapseThreshold: number,
): InstanceType<typeof Tag> {
	const changesChildren: any[] = [];

	if (event.kind === 'created') {
		const attrs = event.initialAttributes ?? {};
		const parts = Object.entries(attrs)
			.filter(([k]) => k !== 'id' && k !== 'name')
			.map(([, v]) => v);
		changesChildren.push(new Tag('span', { class: 'rf-plan-history__created' }, [`Created (${parts.join(', ')})`]));
	}

	if (event.attributeChanges) {
		for (const change of event.attributeChanges) {
			changesChildren.push(buildAttrChangeTag(change));
		}
	}

	if (event.criteriaChanges) {
		const items = event.criteriaChanges.map(c => {
			const marker = c.action === 'checked' ? '☑' : c.action === 'unchecked' ? '☐' : c.action === 'added' ? '+' : '−';
			return new Tag('li', { 'data-action': c.action }, [`${marker} ${c.text}`]);
		});

		// Collapse if over threshold
		if (items.length > collapseThreshold) {
			const visible: any[] = items.slice(0, collapseThreshold);
			const remaining = items.length - collapseThreshold;
			visible.push(new Tag('li', { class: 'rf-plan-history__more' }, [`+${remaining} more criteria`]));
			changesChildren.push(new Tag('ul', { class: 'rf-plan-history__criteria' }, visible));
		} else {
			changesChildren.push(new Tag('ul', { class: 'rf-plan-history__criteria' }, items));
		}
	}

	if (event.kind === 'resolution') {
		changesChildren.push(new Tag('span', { class: 'rf-plan-history__resolution' }, ['Resolution recorded']));
	}

	if (event.kind === 'content') {
		changesChildren.push(new Tag('span', { class: 'rf-plan-history__content-edit' }, ['Content edited']));
	}

	const changesDiv = new Tag('div', { class: 'rf-plan-history__changes' }, changesChildren);

	return new Tag('li', {
		class: 'rf-plan-history__event',
		'data-kind': event.kind,
	}, [dateTag, hashTag, changesDiv]);
}

function resolvePlanHistory(tag: InstanceType<typeof Tag>, data: PlanAggregatedData): InstanceType<typeof Tag> {
	const entityId = readField(tag, 'id');
	const limit = parseInt(readField(tag, 'limit') || '20', 10);
	const typeFilter = readField(tag, 'type') || 'all';
	const group = readField(tag, 'group') || 'commit';

	const allEntities = [
		...data.workEntities,
		...data.bugEntities,
		...data.decisionEntities,
		...data.specEntities,
		...data.milestoneEntities,
	];

	let listContent: InstanceType<typeof Tag>;
	let isGlobal = false;

	if (entityId) {
		// Per-entity mode: find the entity's file path and look up its history
		const entity = allEntities.find(e => e.id === entityId || e.data.name === entityId);
		if (!entity) {
			listContent = new Tag('ol', { 'data-name': 'events', class: 'rf-plan-history__events' }, [
				new Tag('li', { class: 'rf-plan-history__empty' }, [`No history found for ${entityId}`]),
			]);
		} else {
			// Find history by matching entity file path
			let entityEvents: HistoryEvent[] = [];
			for (const [file, events] of data.history) {
				// Match by file path containing the entity ID or by checking attributes
				if (events.length > 0 && events[0].initialAttributes) {
					const eventId = events[0].initialAttributes.id ?? events[0].initialAttributes.name;
					if (eventId === entityId) {
						entityEvents = events;
						break;
					}
				}
			}

			// Reverse to newest-first, apply limit
			const limited = [...entityEvents].reverse().slice(0, limit);
			const items = limited.map(e => buildEventTag(e, data.repositoryUrl));

			listContent = new Tag('ol', { 'data-name': 'events', class: 'rf-plan-history__events' },
				items.length > 0 ? items : [new Tag('li', { class: 'rf-plan-history__empty' }, ['No history available'])],
			);
		}
	} else {
		// Global feed mode
		isGlobal = true;
		const typeSet = typeFilter !== 'all' ? new Set(typeFilter.split(',').map(t => t.trim())) : null;
		const entityByFile = new Map(allEntities.map(e => {
			// Try to find the file path from history keys
			const filePath = e.data.file as string | undefined;
			return [filePath ?? e.id, e];
		}));

		// Group events by commit
		const commitMap = new Map<string, {
			hash: string; shortHash: string; date: string; message: string;
			entities: Array<{ id: string; event: HistoryEvent }>;
		}>();

		for (const [file, events] of data.history) {
			// Determine entity type for filtering
			const firstEvent = events[0];
			const initialType = firstEvent?.initialAttributes?.id?.split('-')[0]?.toLowerCase();
			const entityTypeMap: Record<string, string> = { work: 'work', spec: 'spec', bug: 'bug', adr: 'decision' };
			const entityType = entityTypeMap[initialType ?? ''];

			if (typeSet && entityType && !typeSet.has(entityType)) continue;

			const entityId = firstEvent?.initialAttributes?.id ?? firstEvent?.initialAttributes?.name ?? file;

			for (const event of events) {
				if (event.kind === 'content') continue; // Skip content events in global feed

				let commitGroup = commitMap.get(event.hash);
				if (!commitGroup) {
					commitGroup = {
						hash: event.hash,
						shortHash: event.shortHash,
						date: event.date,
						message: event.message,
						entities: [],
					};
					commitMap.set(event.hash, commitGroup);
				}
				commitGroup.entities.push({ id: String(entityId), event });
			}
		}

		// Sort commits newest-first, apply limit
		const sortedCommits = [...commitMap.values()]
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, limit);

		const commitItems = sortedCommits.map(commit => {
			const dateTag = new Tag('time', { class: 'rf-plan-history__date' }, [formatHistoryDate(commit.date)]);

			const hashAttrs: Record<string, any> = { class: 'rf-plan-history__hash' };
			let hashTag: InstanceType<typeof Tag>;
			if (data.repositoryUrl) {
				hashTag = new Tag('a', {
					class: 'rf-plan-history__hash',
					href: `${data.repositoryUrl}/commit/${commit.hash}`,
				}, [commit.shortHash]);
			} else {
				hashTag = new Tag('code', hashAttrs, [commit.shortHash]);
			}

			const messageTag = new Tag('span', { class: 'rf-plan-history__commit-message' }, [commit.message]);

			const entitySummaries = commit.entities.map(({ id, event }) => {
				const parts: string[] = [];
				if (event.kind === 'created') {
					const attrs = event.initialAttributes ?? {};
					const vals = Object.entries(attrs).filter(([k]) => k !== 'id' && k !== 'name').map(([, v]) => v);
					parts.push(`Created (${vals.join(', ')})`);
				}
				if (event.attributeChanges) {
					for (const c of event.attributeChanges) {
						if (c.from === null) parts.push(`${c.field}: +${c.to}`);
						else if (c.to === null) parts.push(`${c.field}: -${c.from}`);
						else parts.push(`${c.field}: ${c.from} → ${c.to}`);
					}
				}
				if (event.criteriaChanges && event.criteriaChanges.length > 0) {
					const checked = event.criteriaChanges.filter(c => c.action === 'checked').length;
					const total = event.criteriaChanges.length;
					parts.push(`☑ ${checked}/${total}`);
				}
				if (event.kind === 'resolution') parts.push('Resolution recorded');

				return new Tag('div', { class: 'rf-plan-history__entity-summary' }, [
					new Tag('span', { class: 'rf-plan-history__entity-id' }, [id]),
					new Tag('span', { class: 'rf-plan-history__entity-changes' }, [parts.join(', ')]),
				]);
			});

			return new Tag('li', { class: 'rf-plan-history__event' }, [
				dateTag, hashTag, messageTag,
				new Tag('div', { class: 'rf-plan-history__changes' }, entitySummaries),
			]);
		});

		listContent = new Tag('ol', { 'data-name': 'events', class: 'rf-plan-history__events' },
			commitItems.length > 0 ? commitItems : [new Tag('li', { class: 'rf-plan-history__empty' }, ['No history available'])],
		);
	}

	const attrs = { ...tag.attributes };
	if (isGlobal) {
		attrs.class = ((attrs.class ?? '') + ' rf-plan-history--global').trim();
	}

	const newChildren = tag.children.filter(
		(c: unknown) => !(Markdoc.Tag.isTag(c) && (
			c.attributes['data-field'] === PLAN_HISTORY_SENTINEL ||
			c.attributes['data-name'] === 'events' ||
			c.attributes['data-name'] === 'items'
		)),
	);
	newChildren.push(listContent);

	return new Tag(tag.name, attrs, newChildren as any[]);
}

/**
 * Build a tab-group wrapper for entity pages with Overview, Relationships, and History panels.
 * Emits the same HTML contract that tabsBehavior expects.
 */
function buildEntityTabGroup(
	bodyContent: any[],
	relationshipsSection: InstanceType<typeof Tag> | null,
	historySection: InstanceType<typeof Tag> | null,
): InstanceType<typeof Tag> {
	const tabButtons: any[] = [];
	const tabPanels: any[] = [];

	// Overview tab (always present)
	tabButtons.push(new Tag('button', {
		role: 'tab',
		class: 'rf-plan-entity-tabs__tab',
		'data-tab': 'overview',
	}, ['Overview']));
	tabPanels.push(new Tag('div', {
		role: 'tabpanel',
		class: 'rf-plan-entity-tabs__panel',
		'data-tab': 'overview',
	}, bodyContent));

	// Relationships tab (only if there are relationships)
	if (relationshipsSection) {
		tabButtons.push(new Tag('button', {
			role: 'tab',
			class: 'rf-plan-entity-tabs__tab',
			'data-tab': 'relationships',
		}, ['Relationships']));
		tabPanels.push(new Tag('div', {
			role: 'tabpanel',
			class: 'rf-plan-entity-tabs__panel',
			'data-tab': 'relationships',
		}, [relationshipsSection]));
	}

	// History tab (only if there is history)
	if (historySection) {
		tabButtons.push(new Tag('button', {
			role: 'tab',
			class: 'rf-plan-entity-tabs__tab',
			'data-tab': 'history',
		}, ['History']));
		tabPanels.push(new Tag('div', {
			role: 'tabpanel',
			class: 'rf-plan-entity-tabs__panel',
			'data-tab': 'history',
		}, [historySection]));
	}

	const tabList = new Tag('div', {
		'data-name': 'tabs',
		role: 'tablist',
		class: 'rf-plan-entity-tabs__tabs',
	}, tabButtons);

	const panels = new Tag('div', {
		'data-name': 'panels',
		class: 'rf-plan-entity-tabs__panels',
	}, tabPanels);

	return new Tag('div', {
		class: 'rf-plan-entity-tabs',
		'data-rune': 'plan-entity-tabs',
	}, [tabList, panels]);
}

const KIND_ORDER: Record<string, number> = { 'blocked-by': 0, 'blocks': 1, 'depends-on': 2, 'dependency-of': 3, 'implements': 4, 'implemented-by': 5, 'informs': 6, 'informed-by': 7, 'related': 8 };
const KIND_LABELS: Record<string, string> = { 'blocked-by': 'Blocked by', 'blocks': 'Blocks', 'depends-on': 'Depends on', 'dependency-of': 'Dependency of', 'implements': 'Implements', 'implemented-by': 'Implemented by', 'informs': 'Informs', 'informed-by': 'Decisions', 'related': 'Related' };

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

		// "Informed by" renders decision entry cards
		if (kind === 'informed-by') {
			const entries: any[] = [];
			for (const rel of kindRels) {
				const target = findEntity(rel.toId, data);
				if (target) {
					entries.push(buildDecisionEntry(target));
				}
			}
			if (entries.length > 0) {
				groups.push(new Tag('div', {
					class: 'rf-plan-relationships__group',
					'data-kind': kind,
				}, [
					new Tag('h3', { class: 'rf-plan-relationships__group-title' }, [label]),
					new Tag('ol', { class: 'rf-plan-relationships__decisions' }, entries),
				]));
			}
			continue;
		}

		const cards: any[] = [];
		for (const rel of kindRels) {
			const target = findEntity(rel.toId, data);
			if (target) {
				cards.push(buildEntityCard(target));
			}
		}
		if (cards.length > 0) {
			groups.push(new Tag('div', {
				class: 'rf-plan-relationships__group',
				'data-kind': kind,
			}, [
				new Tag('h3', { class: 'rf-plan-relationships__group-title' }, [label]),
				new Tag('div', { class: 'rf-plan-relationships__cards' }, cards),
			]));
		}
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

/**
 * Build an auto-injected History section for an entity page.
 * Returns null for entities with only a single commit (created and never modified).
 */
function buildAutoHistorySection(
	entityId: string,
	data: PlanAggregatedData,
): InstanceType<typeof Tag> | null {
	// Find history events by matching the entity ID in the first event's attributes
	let entityEvents: HistoryEvent[] = [];
	for (const [, events] of data.history) {
		if (events.length > 0 && events[0].initialAttributes) {
			const eventId = events[0].initialAttributes.id ?? events[0].initialAttributes.name;
			if (eventId === entityId) {
				entityEvents = events;
				break;
			}
		}
	}

	// Skip entities with only a single commit (creation only) — no meaningful history
	if (entityEvents.length <= 1) return null;

	// Build timeline (newest-first), limit to 20 events
	const limited = [...entityEvents].reverse().slice(0, 20);
	const items = limited.map(e => buildEventTag(e, data.repositoryUrl));

	const list = new Tag('ol', { class: 'rf-plan-history__events' }, items);

	return new Tag('section', {
		class: 'rf-plan-history',
		'data-name': 'history',
	}, [
		new Tag('h2', { class: 'rf-plan-history__heading' }, ['History']),
		list,
	]);
}
