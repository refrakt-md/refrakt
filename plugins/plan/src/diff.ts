// ─── Pure Diffing Utilities ───
// Parsing and diffing functions for plan entity attributes and criteria.
// No Node.js API dependencies — safe for edge runtimes.

// ─── Types ───

export interface AttributeChange {
	field: string;
	from: string | null; // null = attribute was added
	to: string | null;   // null = attribute was removed
}

export interface CriteriaChange {
	text: string;
	action: 'checked' | 'unchecked' | 'added' | 'removed';
}

export interface ParsedCheckbox {
	text: string;
	checked: boolean;
}

// ─── Parsing ───

/** Regex to parse the opening Markdoc tag on line 1: {% type key="value" ... %} */
const TAG_ATTR_RE = /(\w+)="([^"]*)"/g;

/**
 * Parse attributes from a Markdoc opening tag line.
 * Expects the line to look like: {% type key="value" key2="value2" ... %}
 */
export function parseTagAttributes(line: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	let match: RegExpExecArray | null;
	TAG_ATTR_RE.lastIndex = 0;
	while ((match = TAG_ATTR_RE.exec(line)) !== null) {
		attrs[match[1]] = match[2];
	}
	return attrs;
}

/** Checkbox line pattern: - [ ] text or - [x] text (case-insensitive x) */
const CHECKBOX_RE = /^[\s]*-\s+\[([ xX])\]\s+(.+)/;

/**
 * Extract all checkbox lines from file content.
 */
export function parseCheckboxes(content: string): ParsedCheckbox[] {
	const results: ParsedCheckbox[] = [];
	for (const line of content.split('\n')) {
		const match = CHECKBOX_RE.exec(line);
		if (match) {
			results.push({
				text: match[2].trim(),
				checked: match[1] !== ' ',
			});
		}
	}
	return results;
}

/**
 * Detect whether a ## Resolution section exists in the content.
 */
export function hasResolutionSection(content: string): boolean {
	return /^##\s+Resolution\s*$/m.test(content);
}

// ─── Diffing ───

/**
 * Diff two attribute maps and return the changes.
 */
export function diffAttributes(
	prev: Record<string, string>,
	curr: Record<string, string>,
): AttributeChange[] {
	const changes: AttributeChange[] = [];
	const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

	for (const key of allKeys) {
		const oldVal = prev[key] ?? null;
		const newVal = curr[key] ?? null;
		if (oldVal !== newVal) {
			changes.push({ field: key, from: oldVal, to: newVal });
		}
	}
	return changes;
}

/**
 * Diff two checkbox lists by text matching.
 */
export function diffCriteria(
	prev: ParsedCheckbox[],
	curr: ParsedCheckbox[],
): CriteriaChange[] {
	const changes: CriteriaChange[] = [];
	const prevByText = new Map(prev.map(c => [c.text, c.checked]));
	const currByText = new Map(curr.map(c => [c.text, c.checked]));

	// Check for removed or changed criteria
	for (const [text, wasChecked] of prevByText) {
		const isChecked = currByText.get(text);
		if (isChecked === undefined) {
			changes.push({ text, action: 'removed' });
		} else if (wasChecked && !isChecked) {
			changes.push({ text, action: 'unchecked' });
		} else if (!wasChecked && isChecked) {
			changes.push({ text, action: 'checked' });
		}
	}

	// Check for added criteria
	for (const [text] of currByText) {
		if (!prevByText.has(text)) {
			changes.push({ text, action: 'added' });
		}
	}

	return changes;
}
