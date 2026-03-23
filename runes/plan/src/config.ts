import type { RuneConfig } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Spec: {
		block: 'spec',
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'draft' },
			version: { source: 'meta' },
			supersedes: { source: 'meta' },
			tags: { source: 'meta', noBemClass: true },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'id-badge', metaText: 'id' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status' },
					{ tag: 'span', ref: 'version-badge', metaText: 'version', condition: 'version', textPrefix: 'v' },
					{ tag: 'span', ref: 'supersedes-badge', metaText: 'supersedes', condition: 'supersedes', textPrefix: 'Supersedes ' },
				],
			},
		},
		editHints: { body: 'none', 'id-badge': 'none', 'status-badge': 'none', 'version-badge': 'none', 'supersedes-badge': 'none' },
	},
	Work: {
		block: 'work',
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'draft' },
			priority: { source: 'meta', default: 'medium' },
			complexity: { source: 'meta', default: 'unknown' },
			assignee: { source: 'meta', noBemClass: true },
			milestone: { source: 'meta', noBemClass: true },
			tags: { source: 'meta', noBemClass: true },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'id-badge', metaText: 'id' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status' },
					{ tag: 'span', ref: 'priority-badge', metaText: 'priority' },
					{ tag: 'span', ref: 'complexity-badge', metaText: 'complexity' },
					{ tag: 'span', ref: 'assignee-badge', metaText: 'assignee', condition: 'assignee' },
					{ tag: 'span', ref: 'milestone-badge', metaText: 'milestone', condition: 'milestone' },
				],
			},
		},
		editHints: { body: 'none', 'id-badge': 'none', 'status-badge': 'none', 'priority-badge': 'none', 'complexity-badge': 'none', 'assignee-badge': 'none', 'milestone-badge': 'none' },
	},
	Bug: {
		block: 'bug',
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'reported' },
			severity: { source: 'meta', default: 'major' },
			assignee: { source: 'meta', noBemClass: true },
			milestone: { source: 'meta', noBemClass: true },
			tags: { source: 'meta', noBemClass: true },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'id-badge', metaText: 'id' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status' },
					{ tag: 'span', ref: 'severity-badge', metaText: 'severity' },
					{ tag: 'span', ref: 'assignee-badge', metaText: 'assignee', condition: 'assignee' },
					{ tag: 'span', ref: 'milestone-badge', metaText: 'milestone', condition: 'milestone' },
				],
			},
		},
		editHints: { body: 'none', 'id-badge': 'none', 'status-badge': 'none', 'severity-badge': 'none', 'assignee-badge': 'none', 'milestone-badge': 'none' },
	},
	Decision: {
		block: 'decision',
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'proposed' },
			date: { source: 'meta', noBemClass: true },
			supersedes: { source: 'meta', noBemClass: true },
			tags: { source: 'meta', noBemClass: true },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'id-badge', metaText: 'id' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status' },
					{ tag: 'time', ref: 'date-badge', metaText: 'date', condition: 'date' },
					{ tag: 'span', ref: 'supersedes-badge', metaText: 'supersedes', condition: 'supersedes', textPrefix: 'Supersedes ' },
				],
			},
		},
		editHints: { body: 'none', 'id-badge': 'none', 'status-badge': 'none', 'date-badge': 'none', 'supersedes-badge': 'none' },
	},
	Milestone: {
		block: 'milestone',
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			name: { source: 'meta' },
			status: { source: 'meta', default: 'planning' },
			target: { source: 'meta', noBemClass: true },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'name-badge', metaText: 'name' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status' },
					{ tag: 'time', ref: 'target-badge', metaText: 'target', condition: 'target' },
				],
			},
		},
		editHints: { body: 'none', 'name-badge': 'none', 'status-badge': 'none', 'target-badge': 'none' },
	},
	Backlog: {
		block: 'backlog',
		modifiers: {
			filter: { source: 'meta', noBemClass: true },
			sort: { source: 'meta', noBemClass: true },
			group: { source: 'meta', noBemClass: true },
			show: { source: 'meta', noBemClass: true },
		},
	},
	DecisionLog: {
		block: 'decision-log',
		modifiers: {
			filter: { source: 'meta', noBemClass: true },
			sort: { source: 'meta', noBemClass: true },
		},
	},
};
