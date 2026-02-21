import postcss from 'postcss';

export interface CssSelectorMatch {
	selector: string;
	file: string;
	line: number;
}

export interface AuditResult {
	rune: string;
	total: number;
	styled: number;
	status: 'complete' | 'partial' | 'not-started';
	selectors: Record<string, { styled: boolean; file?: string; line?: number }>;
}

const RF_CLASS_RE = /\.rf-[\w-]+/g;
const DATA_ATTR_RE = /\[data-[\w-]+(?:="[^"]*")?\]/g;

/** Parse a CSS file and extract all .rf-* class selectors and [data-*] attribute selectors */
export function parseCssFile(content: string, filePath: string): CssSelectorMatch[] {
	const matches: CssSelectorMatch[] = [];
	const fileName = filePath.split('/').pop() ?? filePath;

	const root = postcss.parse(content, { from: filePath });

	root.walkRules((rule) => {
		const line = rule.source?.start?.line ?? 0;

		// Extract .rf-* class selectors
		for (const m of rule.selector.matchAll(RF_CLASS_RE)) {
			matches.push({ selector: m[0], file: fileName, line });
		}

		// Extract [data-*] attribute selectors
		for (const m of rule.selector.matchAll(DATA_ATTR_RE)) {
			matches.push({ selector: m[0], file: fileName, line });
		}
	});

	return matches;
}

/** Match generated selectors against CSS selectors and produce an audit result */
export function auditSelectors(
	rune: string,
	generated: string[],
	cssMatches: CssSelectorMatch[],
): AuditResult {
	// Build a lookup: selector → first CSS match
	const cssLookup = new Map<string, { file: string; line: number }>();
	for (const match of cssMatches) {
		if (!cssLookup.has(match.selector)) {
			cssLookup.set(match.selector, { file: match.file, line: match.line });
		}
	}

	const selectors: AuditResult['selectors'] = {};
	let styled = 0;

	for (const sel of generated) {
		const match = cssLookup.get(sel);
		if (match) {
			selectors[sel] = { styled: true, file: match.file, line: match.line };
			styled++;
		} else {
			selectors[sel] = { styled: false };
		}
	}

	const total = generated.length;
	const status = styled === 0 ? 'not-started' : styled === total ? 'complete' : 'partial';

	return { rune, total, styled, status, selectors };
}

/** Collect all possible selectors for a rune by running all modifier variants */
export function collectAllSelectors(
	runeName: string,
	block: string,
	prefix: string,
	schemaVariants: Record<string, string[]>,
	contextModifiers: Record<string, string> | undefined,
	staticModifiers: string[] | undefined,
	runVariant: (flags: Record<string, string>) => string[],
): string[] {
	const allSelectors = new Set<string>();

	// If the rune has variant modifiers, run each combination
	const variantKeys = Object.keys(schemaVariants);
	if (variantKeys.length > 0) {
		// Run each variant value for the first attribute with variants
		// (most runes have a single modifier attribute)
		for (const [attr, values] of Object.entries(schemaVariants)) {
			for (const value of values) {
				const selectors = runVariant({ [attr]: value });
				for (const s of selectors) allSelectors.add(s);
			}
		}
	} else {
		// No variants — run with empty flags
		const selectors = runVariant({});
		for (const s of selectors) allSelectors.add(s);
	}

	// Add synthetic context modifier selectors
	if (contextModifiers) {
		for (const suffix of Object.values(contextModifiers)) {
			allSelectors.add(`.${prefix}-${block}--${suffix}`);
		}
	}

	// Add synthetic static modifier selectors
	if (staticModifiers) {
		for (const suffix of staticModifiers) {
			allSelectors.add(`.${prefix}-${block}--${suffix}`);
		}
	}

	return [...allSelectors].sort(selectorSort);
}

function selectorSort(a: string, b: string): number {
	const typeA = selectorType(a);
	const typeB = selectorType(b);
	if (typeA !== typeB) return typeA - typeB;
	return a.localeCompare(b);
}

function selectorType(s: string): number {
	if (s.startsWith('[')) return 3;
	if (s.includes('__')) return 2;
	if (s.includes('--')) return 1;
	return 0;
}
