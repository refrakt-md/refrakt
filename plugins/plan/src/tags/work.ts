import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '@refrakt-md/runes';
import { slugify, buildSections } from '../util.js';
import { VALID_STATUS, VALID_PRIORITY, VALID_COMPLEXITY } from '../commands/enums.js';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const workSections = { title: 'title', blurb: 'description', body: 'body' } as const;

export const work = createContentModelSchema({
	sections: workSections,
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
	transform(resolved, attrs, config) {
		const titleNodes = renderNodes(resolved.title, config);
		const descNodes = renderNodes(resolved.description, config);

		const title = titleNodes.wrap('header');
		const blurb = descNodes.count() > 0 ? descNodes.wrap('div').next() : undefined;

		const sections = resolved.sections as any[];
		const contentChildren = buildSections(sections, config);

		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable({
			rune: 'work',
			tag: 'article',
			properties: fieldMetas(attrs, config, {
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
			}),
			refs: {
				title: title.tag('header'),
				blurb,
				body: bodyDiv,
			},
			children: [title.next(), ...(blurb ? [blurb] : []), bodyDiv],
		});
	},
});
