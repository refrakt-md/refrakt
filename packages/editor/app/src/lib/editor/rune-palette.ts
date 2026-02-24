import {
	type CompletionContext,
	type CompletionResult,
	type Completion,
	type CompletionSource,
} from '@codemirror/autocomplete';
import type { RuneInfo } from '../api/client.js';

/**
 * Build a snippet string for inserting a rune.
 * Self-closing runes: `{% name /%}`
 * Block runes: `{% name %}\n\n{% /name %}`
 */
function buildSnippet(rune: RuneInfo): string {
	// Build required attribute defaults
	const attrParts: string[] = [];
	for (const [name, attr] of Object.entries(rune.attributes)) {
		if (attr.required) {
			const defaultVal = attr.values?.[0] ?? '';
			attrParts.push(`${name}="${defaultVal}"`);
		}
	}
	const attrStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';

	if (rune.selfClosing) {
		return `{% ${rune.name}${attrStr} /%}`;
	}
	return `{% ${rune.name}${attrStr} %}\n\n{% /${rune.name} %}`;
}

/**
 * Creates a CompletionSource for the rune palette triggered by `/`.
 * Accepts a getter function so runes are read at query time (not creation time).
 */
export function runeCompletionSource(getRunes: () => RuneInfo[]): CompletionSource {
	return (context: CompletionContext): CompletionResult | null => {
		const word = context.matchBefore(/\/\w*/);
		if (!word) return null;

		// Only trigger at start of line or after whitespace
		if (word.from > 0) {
			const charBefore = context.state.doc.sliceString(word.from - 1, word.from);
			if (charBefore.trim() !== '') return null;
		}

		const runes = getRunes();
		if (runes.length === 0) return null;

		const slashFrom = word.from; // position of the `/` trigger character

		const completions: Completion[] = runes.map((rune) => ({
			label: rune.name,
			detail: rune.category,
			info: rune.description,
			section: rune.category,
			type: 'keyword',
			apply: (view, _completion, from, to) => {
				const snippet = buildSnippet(rune);
				// Replace from the `/` to remove the trigger character
				view.dispatch({
					changes: { from: slashFrom, to, insert: snippet },
					selection: {
						anchor: rune.selfClosing
							? slashFrom + snippet.indexOf('/%}')
							: slashFrom + snippet.indexOf('%}') + 2 + 1,
					},
				});
			},
		}));

		return {
			from: slashFrom + 1, // filter starts after `/` so "hint" matches typed "h"
			options: completions,
			filter: true,
		};
	};
}
