/** `knownSections` against `plugins/plan/src/tags/work.ts`, verbatim.
 *  The only authoring change anywhere in this spike: `as const` moved from the
 *  two inner `type:` fields to the returned object. */
import type { Node } from '@markdoc/markdoc';
import { createContentModelSchema } from '../infer.js';

export const work = createContentModelSchema({
	attributes: {
		id: { type: String, required: true },
		status: { type: String, required: false, matches: ['draft', 'ready', 'in-progress', 'done'] },
	},
	contentModel: () =>
		({
			type: 'sections',
			sectionHeading: 'heading:2',
			fields: [
				{ name: 'title', match: 'heading', optional: false },
				{ name: 'description', match: 'paragraph', optional: true, greedy: true },
			],
			sectionModel: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
			},
			knownSections: {
				'Acceptance Criteria': { alias: ['Criteria', 'AC', 'Done When'] },
				'Blocked by': { alias: ['Depends On', 'Requires', 'Deps', 'Needs', 'Dependencies'] },
				Blocks: { alias: ['Unblocks', 'Enables', 'Required By'] },
				Approach: { alias: ['Technical Notes', 'Implementation Notes', 'How'] },
				References: { alias: ['Refs', 'Related', 'Context'] },
				'Edge Cases': { alias: ['Exceptions', 'Corner Cases'] },
				Verification: { alias: ['Test Cases', 'Tests'] },
			},
		}) as const,
	transform(resolved, attrs) {
		const id: string = attrs.id;
		const title: Node = resolved.title;
		const description: Node[] | undefined = resolved.description;

		for (const section of resolved.sections) {
			const heading: string = section.$heading;
			const body: Node[] | undefined = section.body;

			// The payoff: this is the literal union, not `string`. Compare
			// `buildSections` (plugins/plan/src/util.ts:27), which reaches the same
			// value through `any[]` and re-asserts it with `as string | undefined`.
			const canonical:
				| 'Acceptance Criteria'
				| 'Blocked by'
				| 'Blocks'
				| 'Approach'
				| 'References'
				| 'Edge Cases'
				| 'Verification'
				| undefined = section.$canonicalName;

			if (section.$canonicalName === 'Acceptance Criteria') {
				// narrows
			}
			void [heading, body, canonical];
		}
		return [id, title, description];
	},
});
