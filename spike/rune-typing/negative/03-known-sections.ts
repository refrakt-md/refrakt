/** EXPECT 2 errors — both are silent no-ops today, because `$canonicalName`
 *  is read as `string | undefined`.
 *  @expect TS2367 TS2367 */
import { createContentModelSchema } from '../infer.js';

export const work = createContentModelSchema({
	contentModel: {
		type: 'sections',
		sectionHeading: 'heading:2',
		sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', greedy: true }] },
		knownSections: {
			'Acceptance Criteria': { alias: ['Criteria', 'AC'] },
			Approach: { alias: ['How'] },
		},
	},
	transform(resolved) {
		for (const section of resolved.sections) {
			// @ts-expect-error TS2367 — typo'd section name
			if (section.$canonicalName === 'Acceptence Criteria') void 0;
			// @ts-expect-error TS2367 — a real section name this rune does not declare
			if (section.$canonicalName === 'Resolution') void 0;
		}
		return null;
	},
});
