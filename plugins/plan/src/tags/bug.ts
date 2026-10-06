import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '@refrakt-md/runes';
import { buildSections } from '../util.js';
import { VALID_STATUS, VALID_SEVERITY } from '../commands/enums.js';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const bugSections = { title: 'title', blurb: 'description', body: 'body' } as const;

export const bug = createContentModelSchema({
	sections: bugSections,
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
	transform(resolved, attrs, config) {
		const titleNodes = renderNodes(resolved.title, config);
		const descNodes = renderNodes(resolved.description, config);

		const title = titleNodes.wrap('header');
		const blurb = descNodes.count() > 0 ? descNodes.wrap('div').next() : undefined;

		const sections = resolved.sections as any[];
		const contentChildren = buildSections(sections, config);
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable({
			rune: 'bug',
			tag: 'article',
			properties: fieldMetas(attrs, config, {
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
