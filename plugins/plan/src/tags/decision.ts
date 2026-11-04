import { createContentModelSchema, slotSections } from '@refrakt-md/runes';
import type { EmitsDeclaration } from '@refrakt-md/runes';
import { VALID_STATUS } from '../commands/enums.js';

export const decisionEmits = {
	rune: 'decision',
	tag: 'article',
	properties: {
		id: '',
		status: 'proposed',
		date: '',
		supersedes: '',
		source: '',
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

export const decisionSections = slotSections(decisionEmits);

export const decision = createContentModelSchema({
	provides: ['prose'],
	attributes: {
		id: { type: String, required: true, description: 'Identifier (e.g., "ADR-007").' },
		status: {
			type: String,
			required: false,
			matches: [...VALID_STATUS.decision],
			description: 'Decision status: proposed, accepted, rejected, superseded, or deprecated.',
		},
		date: { type: String, required: false, description: 'Date decided (ISO 8601).' },
		supersedes: { type: String, required: false, description: 'ID of the decision this replaces.' },
		source: {
			type: String,
			required: false,
			description: 'Comma-separated IDs of specs or other entities this decision informs.',
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
			Context: {
				alias: ['Background'],
			},
			'Options Considered': {
				alias: ['Options', 'Alternatives'],
			},
			Decision: {},
			Rationale: {
				alias: ['Reasoning'],
			},
			Consequences: {
				alias: ['Impact', 'Trade-offs'],
			},
		},
	}),
	emits: decisionEmits,
});
