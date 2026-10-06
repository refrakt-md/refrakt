import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '@refrakt-md/runes';
import { stripHorizontalRules } from '../util.js';
import { VALID_STATUS } from '../commands/enums.js';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const specSections = { title: 'title', blurb: 'description', body: 'body' } as const;

export const spec = createContentModelSchema({
	sections: specSections,
	provides: ['prose'],
	attributes: {
		id: { type: String, required: true, description: 'Unique identifier (e.g., "SPEC-008").' },
		status: {
			type: String,
			required: false,
			matches: [...VALID_STATUS.spec],
			description:
				'Current status: draft, review, accepted, implemented, shipped, superseded, or deprecated.',
		},
		version: { type: String, required: false, description: 'Spec version (e.g., "1.0", "1.2").' },
		supersedes: { type: String, required: false, description: 'ID of the spec this replaces.' },
		'released-in': {
			type: String,
			required: false,
			description:
				'Release version this spec shipped in (semver, e.g. "v0.11.4"). Required when status="shipped".',
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
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'title', match: 'heading', optional: false },
			{ name: 'summary', match: 'paragraph', optional: true, greedy: true },
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const titleNodes = renderNodes(resolved.title, config);
		const summaryNodes = renderNodes(resolved.summary, config);
		const bodyNodes = renderNodes(resolved.body, config);

		const title = titleNodes.wrap('header');
		const blurb = summaryNodes.count() > 0 ? summaryNodes.wrap('div').next() : undefined;
		const contentChildren: any[] = [];
		if (bodyNodes.count() > 0) {
			contentChildren.push(...stripHorizontalRules(bodyNodes.toArray()));
		}
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable({
			rune: 'spec',
			tag: 'article',
			properties: fieldMetas(attrs, config, {
				id: '',
				status: 'draft',
				version: '',
				supersedes: '',
				'released-in': '',
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
