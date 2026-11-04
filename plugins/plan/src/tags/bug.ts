import { createContentModelSchema, slotSections } from '@refrakt-md/runes';
import type { EmitsDeclaration } from '@refrakt-md/runes';
import { VALID_STATUS, VALID_SEVERITY } from '../commands/enums.js';

export const bugEmits = {
	rune: 'bug',
	tag: 'article',
	properties: {
		id: '',
		status: 'reported',
		severity: 'major',
		assignee: '',
		milestone: '',
		source: '',
		pr: '',
		tags: '',
		created: { from: ['attrs.created', 'file.created'], default: '' },
		modified: { from: ['attrs.modified', 'file.modified'], default: '' },
	},
	slots: {
		title: { as: 'region', el: 'header' },
		blurb: { from: 'description', as: 'region', omitWhenEmpty: true },
		intro: { as: 'region', omitWhenEmpty: true, role: 'body' },
		body: { from: 'sections', as: 'region' },
	},
} satisfies EmitsDeclaration;

export const bugSections = slotSections(bugEmits);

export const bug = createContentModelSchema({
	provides: ['prose'],
	attributes: {
		id: { type: String, required: true, description: 'Unique identifier.' },
		status: {
			type: String,
			required: false,
			matches: [...VALID_STATUS.bug],
			description:
				'Current status: reported, confirmed, in-progress, fixed, wontfix, or duplicate.',
		},
		severity: {
			type: String,
			required: false,
			matches: [...VALID_SEVERITY],
			description: 'Impact level: critical, major, minor, or cosmetic.',
		},
		assignee: { type: String, required: false, description: 'Person or agent working on this.' },
		milestone: { type: String, required: false, description: 'Milestone for the fix.' },
		source: {
			type: String,
			required: false,
			description: 'Comma-separated IDs of specs or decisions this item implements.',
		},
		pr: {
			type: String,
			required: false,
			description:
				'Comma-separated PR references that fixed this bug (e.g. "refrakt-md/refrakt#142").',
		},
		tags: { type: String, required: false, description: 'Comma-separated labels.' },
		created: {
			type: String,
			required: false,
			description: 'Creation date (ISO 8601). Defaults to file creation date from git.',
		},
		modified: {
			type: String,
			required: false,
			description: 'Last modified date (ISO 8601). Defaults to file modification date from git.',
		},
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading:2',
		fields: [
			{ name: 'title', match: 'heading', optional: false },
			{ name: 'description', match: 'paragraph', optional: true, greedy: true },
			{ name: 'intro', match: 'any', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
		knownSections: {
			'Steps to Reproduce': {
				alias: ['Reproduction', 'Steps', 'Repro'],
			},
			Expected: {
				alias: ['Expected Behaviour'],
			},
			Actual: {
				alias: ['Actual Behaviour'],
			},
			Environment: {
				alias: ['Env'],
			},
			'Blocked by': {
				alias: ['Depends On', 'Requires', 'Deps', 'Needs', 'Dependencies'],
			},
			Blocks: {
				alias: ['Unblocks', 'Enables', 'Required By'],
			},
		},
	}),
	emits: bugEmits,
});
