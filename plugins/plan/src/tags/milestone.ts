import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '@refrakt-md/runes';
import { VALID_STATUS } from '../commands/enums.js';
import { stripHorizontalRules } from '../util.js';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const milestoneSections = { title: 'title', blurb: 'description', body: 'body' } as const;

export const milestone = createContentModelSchema({
	sections: milestoneSections,
	provides: ['prose'],
	attributes: {
		name: { type: String, required: true, description: 'Milestone name (e.g., "v0.5.0").' },
		target: {
			type: String,
			required: false,
			description: 'Target date (aspirational, not a commitment).',
		},
		status: {
			type: String,
			required: false,
			matches: [...VALID_STATUS.milestone],
			description: 'Current status: planning, active, or complete.',
		},
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
			{ name: 'title', match: 'heading', optional: true },
			{ name: 'description', match: 'paragraph', optional: true, greedy: true },
			// Everything after the lead paragraphs — the goals list, notes, and
			// every `##` section — is the body, in authored order (WORK-638).
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const titleNodes = renderNodes(resolved.title, config);
		const descNodes = renderNodes(resolved.description, config);
		const bodyNodes = renderNodes(resolved.body, config);

		const title = titleNodes.count() > 0 ? titleNodes.wrap('header') : undefined;
		const blurb = descNodes.count() > 0 ? descNodes.wrap('div').next() : undefined;
		const bodyDiv = new Tag('div', {}, stripHorizontalRules(bodyNodes.toArray()));

		return createComponentRenderable({
			rune: 'milestone',
			tag: 'section',
			properties: fieldMetas(attrs, config, {
				name: '',
				target: '',
				status: 'planning',
				created: { from: ['attrs.created', 'file.created'], default: '' },
				modified: { from: ['attrs.modified', 'file.modified'], default: '' },
			}),
			refs: {
				title: title?.tag('header'),
				blurb,
				body: bodyDiv,
			},
			children: [...(title ? [title.next()] : []), ...(blurb ? [blurb] : []), bodyDiv],
		});
	},
});
