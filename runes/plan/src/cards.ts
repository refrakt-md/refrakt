// ─── Entity Card Builders ───
// Construct summary card and entry Tag renderables for plan entities.
// No Node.js API dependencies — safe for edge runtimes.

import Markdoc from '@markdoc/markdoc';
import type { EntityRegistration } from '@refrakt-md/types';

const { Tag } = Markdoc;

// ─── Sentiment maps (matching rune configs in config.ts) ───

export const WORK_STATUS_SENTIMENT: Record<string, string> = {
	draft: 'neutral', ready: 'neutral', 'in-progress': 'neutral',
	review: 'caution', done: 'positive', blocked: 'negative',
};
export const BUG_STATUS_SENTIMENT: Record<string, string> = {
	reported: 'neutral', confirmed: 'caution', 'in-progress': 'neutral',
	fixed: 'positive', wontfix: 'neutral', duplicate: 'neutral',
};
export const PRIORITY_SENTIMENT: Record<string, string> = {
	critical: 'negative', high: 'caution', medium: 'neutral', low: 'neutral',
};
export const SEVERITY_SENTIMENT: Record<string, string> = {
	critical: 'negative', major: 'caution', minor: 'neutral', trivial: 'neutral',
};
export const SPEC_STATUS_SENTIMENT: Record<string, string> = {
	draft: 'neutral', review: 'caution', accepted: 'positive', superseded: 'caution', deprecated: 'negative',
};
export const DECISION_STATUS_SENTIMENT: Record<string, string> = {
	proposed: 'neutral', accepted: 'positive', superseded: 'caution', deprecated: 'negative',
};
export const MILESTONE_STATUS_SENTIMENT: Record<string, string> = {
	planning: 'neutral', active: 'positive', complete: 'positive',
};

/** Build a metadata badge matching the dimension system output */
export function buildMetaBadge(label: string, value: string, opts: {
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
export function buildEntityCard(entity: EntityRegistration): InstanceType<typeof Tag> {
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
export function buildDecisionEntry(entity: EntityRegistration): InstanceType<typeof Tag> {
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
