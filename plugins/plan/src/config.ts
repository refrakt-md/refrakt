import type { RuneConfig } from '@refrakt-md/transform';

/** Shared `eyebrow + status` rendering — every plan entity declares
 *  these two fields on its eyebrow zone. Pulled out so the per-entity
 *  metaFields blocks only carry the entity-specific extras. */
const idField = { metaType: 'id' as const };
const tagField = (label: string, condition?: string) => ({
	metaType: 'tag' as const,
	label,
	...(condition ? { condition } : {}),
});
const timeField = (label: string, condition?: string) => ({
	metaType: 'temporal' as const,
	label,
	tag: 'time',
	...(condition ? { condition } : {}),
});

export const config: Record<string, RuneConfig> = {
	Spec: {
		block: 'spec',
		defaultDensity: 'full',
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'draft' },
			version: { source: 'meta' },
			supersedes: { source: 'meta' },
			tags: { source: 'meta', noBemClass: true },
			created: { source: 'meta', noBemClass: true },
			modified: { source: 'meta', noBemClass: true },
		},
		metaFields: {
			id: idField,
			status: {
				metaType: 'status',
				sentimentMap: { draft: 'neutral', review: 'caution', accepted: 'positive', superseded: 'caution', deprecated: 'negative' },
			},
			version: { metaType: 'tag', label: 'Version', condition: 'version' },
			supersedes: { metaType: 'id', label: 'Supersedes', condition: 'supersedes' },
			created: timeField('Created', 'created'),
			modified: timeField('Modified', 'modified'),
			tags: tagField('Tags', 'tags'),
		},
		zones: {
			eyebrow: { left: ['id'], right: ['status'] },
			metadata: { fields: ['version', 'supersedes', 'created', 'modified', 'tags'] },
		},
		contentSlots: {
			title: 'title',
			blurb: 'blurb',
			body: 'body',
		},
		sections: { title: 'title', blurb: 'description', body: 'body' },
		editHints: { body: 'none' },
	},
	Work: {
		block: 'work',
		defaultDensity: 'full',
		checklist: true,
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'draft' },
			priority: { source: 'meta', default: 'medium' },
			complexity: { source: 'meta', default: 'unknown' },
			assignee: { source: 'meta', noBemClass: true },
			milestone: { source: 'meta', noBemClass: true },
			source: { source: 'meta', noBemClass: true },
			tags: { source: 'meta', noBemClass: true },
			created: { source: 'meta', noBemClass: true },
			modified: { source: 'meta', noBemClass: true },
		},
		metaFields: {
			id: idField,
			status: {
				metaType: 'status',
				sentimentMap: { draft: 'neutral', ready: 'neutral', 'in-progress': 'neutral', review: 'caution', done: 'positive', blocked: 'negative' },
			},
			priority: {
				metaType: 'category', label: 'Priority',
				sentimentMap: { critical: 'negative', high: 'caution', medium: 'neutral', low: 'neutral' },
			},
			complexity: { metaType: 'quantity', label: 'Complexity' },
			assignee: tagField('Assignee', 'assignee'),
			milestone: tagField('Milestone', 'milestone'),
			source: { metaType: 'id', label: 'Source', condition: 'source' },
			created: timeField('Created', 'created'),
			modified: timeField('Modified', 'modified'),
			// Tags is a multi-value field — split on comma so each tag
			// renders as its own chip. Used by the `tags` custom zone
			// below as a chip-row trailer after the metadata def-list.
			tags: { metaType: 'tag', label: 'Tags', condition: 'tags', splitOn: ',' },
		},
		zones: {
			eyebrow: { left: ['id'], right: ['status'] },
			metadata: { fields: ['priority', 'complexity', 'assignee', 'milestone', 'source', 'created', 'modified'] },
			tags: { fields: ['tags'] },
		},
		contentSlots: {
			title: 'title',
			blurb: 'blurb',
			body: 'body',
		},
		// Custom position via `order` — `tags` lives between metadata
		// (def-list) and body (authored content) so the chip row reads
		// as a metadata trailer, not part of the body.
		order: ['eyebrow', 'title', 'blurb', 'metadata', 'tags', 'body'],
		zoneLayouts: { tags: 'chip-row' },
		sections: { title: 'title', blurb: 'description', body: 'body' },
		editHints: { body: 'none' },
	},
	Bug: {
		block: 'bug',
		defaultDensity: 'full',
		checklist: true,
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'reported' },
			severity: { source: 'meta', default: 'major' },
			assignee: { source: 'meta', noBemClass: true },
			milestone: { source: 'meta', noBemClass: true },
			source: { source: 'meta', noBemClass: true },
			tags: { source: 'meta', noBemClass: true },
			created: { source: 'meta', noBemClass: true },
			modified: { source: 'meta', noBemClass: true },
		},
		metaFields: {
			id: idField,
			status: {
				metaType: 'status',
				sentimentMap: { reported: 'neutral', confirmed: 'caution', 'in-progress': 'neutral', fixed: 'positive', wontfix: 'neutral', duplicate: 'neutral' },
			},
			severity: {
				metaType: 'category', label: 'Severity',
				sentimentMap: { critical: 'negative', major: 'caution', minor: 'neutral', trivial: 'neutral' },
			},
			assignee: tagField('Assignee', 'assignee'),
			milestone: tagField('Milestone', 'milestone'),
			source: { metaType: 'id', label: 'Source', condition: 'source' },
			created: timeField('Created', 'created'),
			modified: timeField('Modified', 'modified'),
			tags: tagField('Tags', 'tags'),
		},
		zones: {
			eyebrow: { left: ['id'], right: ['status'] },
			metadata: { fields: ['severity', 'assignee', 'milestone', 'source', 'created', 'modified', 'tags'] },
		},
		contentSlots: {
			title: 'title',
			blurb: 'blurb',
			body: 'body',
		},
		sections: { title: 'title', blurb: 'description', body: 'body' },
		editHints: { body: 'none' },
	},
	Decision: {
		block: 'decision',
		defaultDensity: 'full',
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'proposed' },
			date: { source: 'meta', noBemClass: true },
			supersedes: { source: 'meta', noBemClass: true },
			source: { source: 'meta', noBemClass: true },
			tags: { source: 'meta', noBemClass: true },
			created: { source: 'meta', noBemClass: true },
			modified: { source: 'meta', noBemClass: true },
		},
		metaFields: {
			id: idField,
			status: {
				metaType: 'status',
				sentimentMap: { proposed: 'neutral', accepted: 'positive', superseded: 'caution', deprecated: 'negative' },
			},
			date: timeField('Date', 'date'),
			supersedes: { metaType: 'id', label: 'Supersedes', condition: 'supersedes' },
			source: { metaType: 'id', label: 'Source', condition: 'source' },
			created: timeField('Created', 'created'),
			modified: timeField('Modified', 'modified'),
			tags: tagField('Tags', 'tags'),
		},
		zones: {
			eyebrow: { left: ['id'], right: ['status'] },
			metadata: { fields: ['date', 'supersedes', 'source', 'created', 'modified', 'tags'] },
		},
		contentSlots: {
			title: 'title',
			blurb: 'blurb',
			body: 'body',
		},
		sections: { title: 'title', blurb: 'description', body: 'body' },
		editHints: { body: 'none' },
	},
	Milestone: {
		block: 'milestone',
		defaultDensity: 'full',
		modifiers: {
			name: { source: 'meta' },
			status: { source: 'meta', default: 'planning' },
			target: { source: 'meta', noBemClass: true },
			created: { source: 'meta', noBemClass: true },
			modified: { source: 'meta', noBemClass: true },
		},
		metaFields: {
			// Milestone's id field is `name` — the engine reads it from the
			// `name` modifier, which maps to the meta tag emitted by the rune.
			name: idField,
			status: {
				metaType: 'status',
				sentimentMap: { planning: 'neutral', active: 'positive', complete: 'positive' },
			},
			target: timeField('Target', 'target'),
			created: timeField('Created', 'created'),
			modified: timeField('Modified', 'modified'),
		},
		zones: {
			eyebrow: { left: ['name'], right: ['status'] },
			metadata: { fields: ['target', 'created', 'modified'] },
		},
		contentSlots: {
			title: 'title',
			blurb: 'blurb',
			body: 'body',
		},
		sections: { title: 'title', blurb: 'description', body: 'body' },
		editHints: { body: 'none' },
	},
	Backlog: {
		block: 'backlog',
		defaultDensity: 'full',
		childDensity: 'minimal',
		modifiers: {
			filter: { source: 'meta', noBemClass: true },
			sort: { source: 'meta', noBemClass: true },
			group: { source: 'meta', noBemClass: true },
			show: { source: 'meta', noBemClass: true },
		},
	},
	DecisionLog: {
		block: 'decision-log',
		defaultDensity: 'full',
		childDensity: 'minimal',
		modifiers: {
			filter: { source: 'meta', noBemClass: true },
			sort: { source: 'meta', noBemClass: true },
		},
	},
	PlanProgress: {
		block: 'plan-progress',
		modifiers: {
			show: { source: 'meta', noBemClass: true },
		},
	},
	PlanActivity: {
		block: 'plan-activity',
		modifiers: {
			limit: { source: 'meta', noBemClass: true },
		},
	},
	PlanHistory: {
		block: 'plan-history',
		modifiers: {
			id: { source: 'meta', noBemClass: true },
			limit: { source: 'meta', noBemClass: true },
			type: { source: 'meta', noBemClass: true },
			since: { source: 'meta', noBemClass: true },
			group: { source: 'meta', noBemClass: true },
		},
	},
	PlanEntityTabs: {
		block: 'plan-entity-tabs',
	},
};
