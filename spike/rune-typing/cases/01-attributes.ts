/** Attributes: required/optional split, `matches` → literal union, `base` merge.
 *  Declarations are `character.ts`'s, verbatim — including the `.slice()` idiom. */
import { createContentModelSchema } from '../infer.js';

const roleType = ['protagonist', 'antagonist', 'supporting', 'minor'] as const;
const taxonomyAttributes = { tags: { type: String, required: false } } as const;

export const character = createContentModelSchema({
	base: taxonomyAttributes,
	attributes: {
		name: { type: String, required: true, description: 'Display name.' },
		role: { type: String, required: false, matches: roleType.slice() },
		featured: { type: Boolean, required: false },
		order: { type: Number, required: false },
	},
	contentModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', greedy: true }] },
	transform(resolved, attrs) {
		const name: string = attrs.name;
		const role: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | undefined = attrs.role;
		const featured: boolean | undefined = attrs.featured;
		const order: number | undefined = attrs.order;
		const tags: string | undefined = attrs.tags;
		const body = resolved.body;
		return [name, role, featured, order, tags, body];
	},
});
