import { runes } from '@refrakt-md/runes';

// Build static set of all known rune tag names (primary + aliases)
const ALL_TAG_NAMES: Set<string> = new Set();
const TAG_LABELS: Record<string, string> = {};

for (const rune of Object.values(runes)) {
	const label = rune.name
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
	ALL_TAG_NAMES.add(rune.name);
	TAG_LABELS[rune.name] = label;
	for (const alias of rune.aliases) {
		ALL_TAG_NAMES.add(alias);
		TAG_LABELS[alias] = label;
	}
}

export interface InProgressBlock {
	tagName: string;
	label: string;
	startIndex: number;
}

/**
 * Scan accumulated text for rune blocks that have been opened but not closed.
 * Returns in-progress blocks sorted by source position.
 *
 * This is a regex scan on raw text — it does NOT parse Markdoc.
 * Rune tag syntax: {% tagname %} ... {% /tagname %} or {% tagname /%}
 */
export function scanInProgressBlocks(source: string): InProgressBlock[] {
	// Track open count per tag name (stack handles nesting of same tag type)
	const openStacks = new Map<string, number[]>();

	// Match all Markdoc tag markers
	const tagPattern = /\{%\s*(\/?)\s*([\w-]+)([^%]*?)(\/?)\s*%\}/g;
	let match: RegExpExecArray | null;

	while ((match = tagPattern.exec(source)) !== null) {
		const isClosing = match[1] === '/';
		const tagName = match[2];
		const isSelfClosing = match[4] === '/';

		if (!ALL_TAG_NAMES.has(tagName)) continue;
		if (isSelfClosing) continue;

		if (isClosing) {
			const stack = openStacks.get(tagName);
			if (stack && stack.length > 0) {
				stack.pop();
			}
		} else {
			if (!openStacks.has(tagName)) {
				openStacks.set(tagName, []);
			}
			openStacks.get(tagName)!.push(match.index);
		}
	}

	// Collect everything still on stacks
	const inProgress: InProgressBlock[] = [];
	for (const [tagName, stack] of openStacks) {
		for (const startIndex of stack) {
			inProgress.push({
				tagName,
				label: TAG_LABELS[tagName] || tagName,
				startIndex,
			});
		}
	}

	return inProgress.sort((a, b) => a.startIndex - b.startIndex);
}
