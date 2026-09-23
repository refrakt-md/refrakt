/** Nested models: the `emitTag` discriminant, recursion through `sectionModel`,
 *  and `delimited` with dynamic zones recursing through `zoneModel`. */
import type { Node } from '@markdoc/markdoc';
import { createContentModelSchema } from '../infer.js';

const seq = {
	type: 'sequence',
	fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
} as const;

/** emitTag SET — `sections` are AST tag nodes (character, accordion, realm…). */
export const withEmitTag = createContentModelSchema({
	contentModel: {
		type: 'sections',
		sectionHeading: 'heading',
		emitTag: 'character-section',
		fields: [{ name: 'portrait', match: 'image', optional: true }],
		sectionModel: seq,
	},
	transform(resolved) {
		const portrait: Node | undefined = resolved.portrait;
		const sections: Node[] = resolved.sections;
		return [portrait, sections];
	},
});

/** emitTag ABSENT — `sections` are resolved entries (work, bug, decision…). */
export const withoutEmitTag = createContentModelSchema({
	contentModel: {
		type: 'sections',
		sectionHeading: 'heading',
		fields: [{ name: 'title', match: 'heading' }],
		sectionModel: seq,
	},
	transform(resolved) {
		const title: Node = resolved.title;
		for (const section of resolved.sections) {
			const heading: string = section.$heading;
			const body: Node[] | undefined = section.body; // recursed from sectionModel
			void [heading, body];
		}
		return title;
	},
});

/** delimited + dynamicZones — the zone COUNT is dynamic, the zone SHAPE is not. */
export const dynamicZones = createContentModelSchema({
	contentModel: { type: 'delimited', delimiter: 'hr', dynamicZones: true, zoneModel: seq },
	transform(resolved) {
		return resolved.zones.map((zone) => zone.body);
	},
});
