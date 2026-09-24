/** EXPECT 5 errors — every one of these is silently accepted today.
 *  @expect TS2339 TS2339 TS2322 TS2322 TS2367 */
import { createContentModelSchema } from '../infer.js';

export const bad = createContentModelSchema({
	attributes: {
		name: { type: String, required: true },
		role: { type: String, required: false, matches: ['protagonist', 'antagonist'] },
	},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs) {
		// @ts-expect-error TS2339 — typo'd attribute name
		const a = attrs.nmae;
		// @ts-expect-error TS2339 — typo'd resolved field
		const b = resolved.bdoy;
		// @ts-expect-error TS2322 — optional attribute treated as required
		const c: string = attrs.role;
		// @ts-expect-error TS2322 — greedy array treated as a single node
		const d: string = resolved.body;
		// @ts-expect-error TS2367 — value outside the `matches` union
		const e = attrs.role === 'narrator';
		return [a, b, c, d, e];
	},
});
