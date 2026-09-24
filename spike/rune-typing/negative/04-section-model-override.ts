/** EXPECT 1 error — the one genuinely awkward corner.
 *
 *  `KnownSectionDefinition.model` lets a section override the body model. No
 *  rune declares one (work, bug and decision use `alias` only), so this case is
 *  currently dead. Forced here to document what happens if it is ever used.
 *
 *  The type is CORRECT: `body` exists on the fallback branch but not on the
 *  override, so reading it unconditionally is a real bug. The *message* is the
 *  problem — it inlines the whole inferred model, truncated. Extracting a named
 *  `SectionEntry<M>` alias and hoisting the model to a named const were both
 *  tried; neither improves it, because the type ARGUMENT is the giant object.
 *
 *  @expect TS2339 */
import { createContentModelSchema } from '../infer.js';

export const overridden = createContentModelSchema({
	contentModel: {
		type: 'sections',
		sectionHeading: 'heading:2',
		sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', greedy: true }] },
		knownSections: {
			'Acceptance Criteria': {
				alias: ['Criteria'],
				model: { type: 'sequence', fields: [{ name: 'criteria', match: 'list' }] },
			},
			Approach: { alias: ['How'] },
		},
	},
	transform(resolved) {
		// @ts-expect-error TS2339 — only present on the fallback branch of the union
		return resolved.sections.map((section) => section.body);
	},
});
