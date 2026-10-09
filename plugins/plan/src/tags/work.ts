import { createContentModelSchema, slotSections } from '@refrakt-md/runes';
import type { EmitsDeclaration } from '@refrakt-md/runes';
import { VALID_STATUS, VALID_PRIORITY, VALID_COMPLEXITY } from '../commands/enums.js';

// SPEC-143 — the rune labels its resolved fields and nothing more, so it
// declares its slots instead of writing a transform: the heading group becomes
// the `title` header, the lead paragraphs the `blurb` (only when authored), any
// other content before the first section the `intro` (likewise), and the
// sections the `body`. Everything else it renders — the eyebrow, the
// metadata rows, the content column — is `metaFields`, `blocks` and `layout`.
export const workEmits = {
	rune: 'work',
	tag: 'article',
	properties: {
		id: '',
		status: 'draft',
		priority: 'medium',
		complexity: 'unknown',
		assignee: '',
		milestone: '',
		source: '',
		supersedes: '',
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

// SPEC-125 Phase 2 — the join table the rune declares about itself, referenced
// from the theme config rather than owned by it (ADR-028). Derived from the
// slot declaration (SPEC-143), so the roles are stated once.
export const workSections = slotSections(workEmits);

export const work = createContentModelSchema({
	provides: ['prose'],
	attributes: {
		id: { type: String, required: true, description: 'Unique identifier (e.g., "RF-142").' },
		status: {
			type: String,
			required: false,
			matches: [...VALID_STATUS.work],
			description:
				'Current status: draft, ready, in-progress, review, done, blocked, pending, cancelled, or superseded.',
		},
		priority: {
			type: String,
			required: false,
			matches: [...VALID_PRIORITY],
			description: 'Priority level: critical, high, medium, or low.',
		},
		complexity: {
			type: String,
			required: false,
			matches: [...VALID_COMPLEXITY],
			description: 'Complexity signal: trivial, simple, moderate, complex, or unknown.',
		},
		assignee: { type: String, required: false, description: 'Person or agent working on this.' },
		milestone: { type: String, required: false, description: 'Milestone this belongs to.' },
		source: {
			type: String,
			required: false,
			description: 'Comma-separated IDs of specs or decisions this item implements.',
		},
		supersedes: {
			type: String,
			required: false,
			description: 'ID of the work item this replaces (set when status="superseded").',
		},
		pr: {
			type: String,
			required: false,
			description:
				'Comma-separated PR references that implemented this item (e.g. "refrakt-md/refrakt#142").',
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
			// Whatever else precedes the first `##` — a `> Ref:` blockquote, a
			// list, a fence, a table — in authored order (WORK-638).
			{ name: 'intro', match: 'any', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
		knownSections: {
			'Acceptance Criteria': {
				alias: ['Criteria', 'AC', 'Done When'],
			},
			'Blocked by': {
				alias: ['Depends On', 'Requires', 'Deps', 'Needs', 'Dependencies'],
			},
			Blocks: {
				alias: ['Unblocks', 'Enables', 'Required By'],
			},
			Approach: {
				alias: ['Technical Notes', 'Implementation Notes', 'How'],
			},
			References: {
				alias: ['Refs', 'Related', 'Context'],
			},
			'Edge Cases': {
				alias: ['Exceptions', 'Corner Cases'],
			},
			Verification: {
				alias: ['Test Cases', 'Tests'],
			},
		},
	}),
	emits: workEmits,
});
