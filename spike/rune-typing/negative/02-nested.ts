/** EXPECT 3 errors — the `emitTag` discriminant, both directions.
 *  @expect TS2339 TS2322 TS2339 */
import type { Node } from '@markdoc/markdoc';
import { createContentModelSchema } from '../infer.js';

const seq = {
	type: 'sequence',
	fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
} as const;

export const emitTagSet = createContentModelSchema({
	contentModel: { type: 'sections', sectionHeading: 'heading', emitTag: 'x', sectionModel: seq },
	transform(resolved) {
		// @ts-expect-error TS2339 — emitTag IS set, so these are nodes, not entries
		return resolved.sections.map((s) => s.$heading);
	},
});

export const emitTagAbsent = createContentModelSchema({
	contentModel: { type: 'sections', sectionHeading: 'heading', sectionModel: seq },
	transform(resolved) {
		// @ts-expect-error TS2322 — emitTag is NOT set, so these are entries, not nodes
		const wrong: Node[] = resolved.sections;
		// @ts-expect-error TS2339 — typo in a field of the NESTED sectionModel
		const alsoWrong = resolved.sections[0].bdoy;
		return [wrong, alsoWrong];
	},
});
