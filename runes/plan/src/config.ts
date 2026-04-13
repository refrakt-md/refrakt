import type { RuneConfig } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Spec: {
		block: 'spec',
		defaultDensity: 'full',
		slots: ['header-primary', 'content', 'header-secondary'],
		sections: { 'header-primary': 'header', 'header-secondary': 'header', body: 'body' },
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'draft' },
			version: { source: 'meta' },
			supersedes: { source: 'meta' },
			tags: { source: 'meta', noBemClass: true },
			created: { source: 'meta', noBemClass: true },
			modified: { source: 'meta', noBemClass: true },
		},
		structure: {
			'header-primary': {
				tag: 'div', slot: 'header-primary',
				children: [
					{ tag: 'span', ref: 'id-badge', metaText: 'id', label: 'ID:', labelHidden: true, metaType: 'id', metaRank: 'primary' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status', label: 'Status:', labelHidden: true, metaType: 'status', metaRank: 'primary', sentimentMap: { draft: 'neutral', review: 'caution', accepted: 'positive', superseded: 'caution', deprecated: 'negative' } },
				],
			},
			'header-secondary': {
				tag: 'div', slot: 'header-secondary',
				children: [
					{ tag: 'span', ref: 'version-badge', metaText: 'version', condition: 'version', textPrefix: 'v', metaType: 'tag', metaRank: 'secondary' },
					{ tag: 'span', ref: 'supersedes-badge', metaText: 'supersedes', condition: 'supersedes', label: 'Supersedes:', metaType: 'id', metaRank: 'secondary' },
					{ tag: 'time', ref: 'created-badge', metaText: 'created', condition: 'created', label: 'Created:', metaType: 'temporal', metaRank: 'secondary' },
					{ tag: 'time', ref: 'modified-badge', metaText: 'modified', condition: 'modified', label: 'Modified:', metaType: 'temporal', metaRank: 'secondary' },
				],
			},
		},
		editHints: { body: 'none', 'id-badge': 'none', 'status-badge': 'none', 'version-badge': 'none', 'supersedes-badge': 'none', 'created-badge': 'none', 'modified-badge': 'none' },
	},
	Work: {
		block: 'work',
		defaultDensity: 'full',
		checklist: true,
		slots: ['header-primary', 'content', 'header-secondary'],
		sections: { 'header-primary': 'header', 'header-secondary': 'header', body: 'body' },
		contentWrapper: { tag: 'div', ref: 'body' },
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
		structure: {
			'header-primary': {
				tag: 'div', slot: 'header-primary',
				children: [
					{ tag: 'span', ref: 'id-badge', metaText: 'id', label: 'ID:', labelHidden: true, metaType: 'id', metaRank: 'primary' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status', label: 'Status:', labelHidden: true, metaType: 'status', metaRank: 'primary', sentimentMap: { draft: 'neutral', ready: 'neutral', 'in-progress': 'neutral', review: 'caution', done: 'positive', blocked: 'negative' } },
				],
			},
			'header-secondary': {
				tag: 'div', slot: 'header-secondary',
				children: [
					{ tag: 'span', ref: 'priority-badge', metaText: 'priority', label: 'Priority:', metaType: 'category', metaRank: 'primary', sentimentMap: { critical: 'negative', high: 'caution', medium: 'neutral', low: 'neutral' } },
					{ tag: 'span', ref: 'complexity-badge', metaText: 'complexity', label: 'Complexity:', metaType: 'quantity', metaRank: 'secondary' },
					{ tag: 'span', ref: 'assignee-badge', metaText: 'assignee', label: 'Assignee:', condition: 'assignee', metaType: 'tag', metaRank: 'secondary' },
					{ tag: 'span', ref: 'milestone-badge', metaText: 'milestone', label: 'Milestone:', condition: 'milestone', metaType: 'tag', metaRank: 'secondary' },
					{ tag: 'span', ref: 'source-badge', metaText: 'source', condition: 'source', label: 'Source:', metaType: 'id', metaRank: 'secondary' },
					{ tag: 'time', ref: 'created-badge', metaText: 'created', condition: 'created', label: 'Created:', metaType: 'temporal', metaRank: 'secondary' },
					{ tag: 'time', ref: 'modified-badge', metaText: 'modified', condition: 'modified', label: 'Modified:', metaType: 'temporal', metaRank: 'secondary' },
				],
			},
		},
		editHints: { body: 'none', 'id-badge': 'none', 'status-badge': 'none', 'priority-badge': 'none', 'complexity-badge': 'none', 'assignee-badge': 'none', 'milestone-badge': 'none', 'source-badge': 'none', 'created-badge': 'none', 'modified-badge': 'none' },
	},
	Bug: {
		block: 'bug',
		defaultDensity: 'full',
		checklist: true,
		slots: ['header-primary', 'content', 'header-secondary'],
		sections: { 'header-primary': 'header', 'header-secondary': 'header', body: 'body' },
		contentWrapper: { tag: 'div', ref: 'body' },
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
		structure: {
			'header-primary': {
				tag: 'div', slot: 'header-primary',
				children: [
					{ tag: 'span', ref: 'id-badge', metaText: 'id', label: 'ID:', labelHidden: true, metaType: 'id', metaRank: 'primary' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status', label: 'Status:', labelHidden: true, metaType: 'status', metaRank: 'primary', sentimentMap: { reported: 'neutral', confirmed: 'caution', 'in-progress': 'neutral', fixed: 'positive', wontfix: 'neutral', duplicate: 'neutral' } },
				],
			},
			'header-secondary': {
				tag: 'div', slot: 'header-secondary',
				children: [
					{ tag: 'span', ref: 'severity-badge', metaText: 'severity', label: 'Severity:', metaType: 'category', metaRank: 'primary', sentimentMap: { critical: 'negative', major: 'caution', minor: 'neutral', trivial: 'neutral' } },
					{ tag: 'span', ref: 'assignee-badge', metaText: 'assignee', label: 'Assignee:', condition: 'assignee', metaType: 'tag', metaRank: 'secondary' },
					{ tag: 'span', ref: 'milestone-badge', metaText: 'milestone', label: 'Milestone:', condition: 'milestone', metaType: 'tag', metaRank: 'secondary' },
					{ tag: 'span', ref: 'source-badge', metaText: 'source', condition: 'source', label: 'Source:', metaType: 'id', metaRank: 'secondary' },
					{ tag: 'time', ref: 'created-badge', metaText: 'created', condition: 'created', label: 'Created:', metaType: 'temporal', metaRank: 'secondary' },
					{ tag: 'time', ref: 'modified-badge', metaText: 'modified', condition: 'modified', label: 'Modified:', metaType: 'temporal', metaRank: 'secondary' },
				],
			},
		},
		editHints: { body: 'none', 'id-badge': 'none', 'status-badge': 'none', 'severity-badge': 'none', 'assignee-badge': 'none', 'milestone-badge': 'none', 'source-badge': 'none', 'created-badge': 'none', 'modified-badge': 'none' },
	},
	Decision: {
		block: 'decision',
		defaultDensity: 'full',
		slots: ['header-primary', 'content', 'header-secondary'],
		sections: { 'header-primary': 'header', 'header-secondary': 'header', body: 'body' },
		contentWrapper: { tag: 'div', ref: 'body' },
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
		structure: {
			'header-primary': {
				tag: 'div', slot: 'header-primary',
				children: [
					{ tag: 'span', ref: 'id-badge', metaText: 'id', label: 'ID:', labelHidden: true, metaType: 'id', metaRank: 'primary' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status', label: 'Status:', labelHidden: true, metaType: 'status', metaRank: 'primary', sentimentMap: { proposed: 'neutral', accepted: 'positive', superseded: 'caution', deprecated: 'negative' } },
				],
			},
			'header-secondary': {
				tag: 'div', slot: 'header-secondary',
				children: [
					{ tag: 'time', ref: 'date-badge', metaText: 'date', label: 'Date:', condition: 'date', metaType: 'temporal', metaRank: 'secondary' },
					{ tag: 'span', ref: 'supersedes-badge', metaText: 'supersedes', condition: 'supersedes', label: 'Supersedes:', metaType: 'id', metaRank: 'secondary' },
					{ tag: 'span', ref: 'source-badge', metaText: 'source', condition: 'source', label: 'Source:', metaType: 'id', metaRank: 'secondary' },
					{ tag: 'time', ref: 'created-badge', metaText: 'created', condition: 'created', label: 'Created:', metaType: 'temporal', metaRank: 'secondary' },
					{ tag: 'time', ref: 'modified-badge', metaText: 'modified', condition: 'modified', label: 'Modified:', metaType: 'temporal', metaRank: 'secondary' },
				],
			},
		},
		editHints: { body: 'none', 'id-badge': 'none', 'status-badge': 'none', 'date-badge': 'none', 'supersedes-badge': 'none', 'source-badge': 'none', 'created-badge': 'none', 'modified-badge': 'none' },
	},
	Milestone: {
		block: 'milestone',
		defaultDensity: 'full',
		slots: ['header-primary', 'content', 'header-secondary'],
		sections: { 'header-primary': 'header', 'header-secondary': 'header', body: 'body' },
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			name: { source: 'meta' },
			status: { source: 'meta', default: 'planning' },
			target: { source: 'meta', noBemClass: true },
			created: { source: 'meta', noBemClass: true },
			modified: { source: 'meta', noBemClass: true },
		},
		structure: {
			'header-primary': {
				tag: 'div', slot: 'header-primary',
				children: [
					{ tag: 'span', ref: 'name-badge', metaText: 'name', label: 'Name:', labelHidden: true, metaType: 'id', metaRank: 'primary' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status', label: 'Status:', labelHidden: true, metaType: 'status', metaRank: 'primary', sentimentMap: { planning: 'neutral', active: 'positive', complete: 'positive' } },
				],
			},
			'header-secondary': {
				tag: 'div', slot: 'header-secondary',
				children: [
					{ tag: 'time', ref: 'target-badge', metaText: 'target', label: 'Target:', condition: 'target', metaType: 'temporal', metaRank: 'secondary' },
					{ tag: 'time', ref: 'created-badge', metaText: 'created', condition: 'created', label: 'Created:', metaType: 'temporal', metaRank: 'secondary' },
					{ tag: 'time', ref: 'modified-badge', metaText: 'modified', condition: 'modified', label: 'Modified:', metaType: 'temporal', metaRank: 'secondary' },
				],
			},
		},
		editHints: { body: 'none', 'name-badge': 'none', 'status-badge': 'none', 'target-badge': 'none', 'created-badge': 'none', 'modified-badge': 'none' },
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
