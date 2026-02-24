import {
	type CompletionContext,
	type CompletionResult,
	type CompletionSource,
} from '@codemirror/autocomplete';
import type { RuneInfo } from '../api/client.js';

/**
 * Find the Markdoc tag context at the cursor position.
 * Returns the tag name and whether we're completing an attribute value.
 */
function findTagContext(
	doc: string,
	pos: number,
): { tagName: string; attrName?: string; valueStart?: number } | null {
	const before = doc.slice(Math.max(0, pos - 500), pos);

	const lastClose = before.lastIndexOf('%}');
	const lastOpen = before.lastIndexOf('{%');

	if (lastOpen === -1 || (lastClose !== -1 && lastClose > lastOpen)) {
		return null;
	}

	const tagContent = before.slice(lastOpen + 2).trimStart();

	if (tagContent.startsWith('/')) return null;

	const nameMatch = tagContent.match(/^(\w[\w-]*)/);
	if (!nameMatch) return null;
	const tagName = nameMatch[1];

	const afterName = tagContent.slice(nameMatch[0].length);

	// Check if we're inside an attribute value: attr="...
	const valueMatch = afterName.match(/(\w[\w-]*)="[^"]*$/);
	if (valueMatch) {
		const quoteIdx = before.lastIndexOf('="');
		return {
			tagName,
			attrName: valueMatch[1],
			valueStart: Math.max(0, pos - 500) + quoteIdx + 2,
		};
	}

	return { tagName };
}

/**
 * Creates a CompletionSource for Markdoc tag attribute names and values.
 * Accepts a getter function so runes are read at query time (not creation time).
 */
export function attributeCompletionSource(getRunes: () => RuneInfo[]): CompletionSource {
	return (context: CompletionContext): CompletionResult | null => {
		const doc = context.state.doc.toString();
		const pos = context.pos;

		const tagCtx = findTagContext(doc, pos);
		if (!tagCtx) return null;

		const runes = getRunes();
		const runeMap = new Map<string, RuneInfo>();
		for (const r of runes) {
			runeMap.set(r.name, r);
			for (const alias of r.aliases) {
				runeMap.set(alias, r);
			}
		}

		const rune = runeMap.get(tagCtx.tagName);
		if (!rune) return null;

		// Completing attribute value
		if (tagCtx.attrName && tagCtx.valueStart !== undefined) {
			const attr = rune.attributes[tagCtx.attrName];
			if (!attr?.values?.length) return null;

			return {
				from: tagCtx.valueStart,
				options: attr.values.map((v) => ({
					label: v,
					type: 'enum',
				})),
				filter: true,
			};
		}

		// Completing attribute name
		const word = context.matchBefore(/\w*/);
		if (!word) return null;

		if (!context.explicit && word.from === word.to) return null;

		// Get already-used attributes
		const before = doc.slice(Math.max(0, pos - 500), pos);
		const usedAttrs = new Set(
			[...before.matchAll(/(\w[\w-]*)="/g)].map((m) => m[1]),
		);

		const options = Object.entries(rune.attributes)
			.filter(([name]) => !usedAttrs.has(name))
			.map(([name, attr]) => ({
				label: name,
				detail: attr.required ? 'required' : undefined,
				type: 'property' as const,
				apply: `${name}="`,
				boost: attr.required ? 1 : 0,
			}));

		if (options.length === 0) return null;

		return {
			from: word.from,
			options,
			filter: true,
		};
	};
}
