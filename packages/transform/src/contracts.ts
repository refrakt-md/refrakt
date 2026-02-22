import type { ThemeConfig, RuneConfig, StructureEntry } from './types.js';

/** Structure contract for a single rune */
export interface RuneContract {
	block: string;
	root: string;
	dataRune: string;
	modifiers?: Record<string, {
		source: string;
		default?: string;
		classPattern: string;
		dataAttribute: string;
	}>;
	contextModifiers?: Record<string, {
		suffix: string;
		selector: string;
	}>;
	staticModifiers?: Array<{
		name: string;
		selector: string;
	}>;
	elements?: Record<string, {
		tag: string;
		selector: string;
		source: string;
		parent?: string;
		condition?: string;
		conditionAny?: string[];
	}>;
	inlineStyles?: Record<string, string | { prop: string; template: string }>;
	childOrder: string[];
}

/** Top-level structure contract document */
export interface StructureContract {
	$schema: string;
	description: string;
	prefix: string;
	runes: Record<string, RuneContract>;
}

/**
 * Generate a structure contract from a theme configuration.
 *
 * Derives the complete BEM selector contract, data attributes, injected elements,
 * and child ordering for every rune — purely from config, no engine execution needed.
 */
export function generateStructureContract(config: ThemeConfig): StructureContract {
	const { prefix, runes } = config;
	const result: Record<string, RuneContract> = {};

	for (const [runeName, runeConfig] of Object.entries(runes)) {
		result[runeName] = generateRuneContract(runeName, runeConfig, prefix);
	}

	return {
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		description:
			'HTML structure contracts for the identity transform. Documents the BEM selectors, data attributes, and HTML structure the engine produces for each rune. Auto-generated from theme config — do not edit by hand.',
		prefix,
		runes: result,
	};
}

function generateRuneContract(runeName: string, config: RuneConfig, prefix: string): RuneContract {
	const block = `${prefix}-${config.block}`;
	const contract: RuneContract = {
		block: config.block,
		root: `.${block}`,
		dataRune: runeName.toLowerCase(),
		childOrder: [],
	};

	// Modifiers
	if (config.modifiers && Object.keys(config.modifiers).length > 0) {
		contract.modifiers = {};
		for (const [name, mod] of Object.entries(config.modifiers)) {
			const kebab = name.replace(/([A-Z])/g, '-$1').toLowerCase();
			contract.modifiers[name] = {
				source: mod.source,
				...(mod.default !== undefined ? { default: mod.default } : {}),
				classPattern: `.${block}--{value}`,
				dataAttribute: `data-${kebab}`,
			};
		}
	}

	// Context modifiers
	if (config.contextModifiers && Object.keys(config.contextModifiers).length > 0) {
		contract.contextModifiers = {};
		for (const [parent, suffix] of Object.entries(config.contextModifiers)) {
			contract.contextModifiers[parent] = {
				suffix,
				selector: `.${block}--${suffix}`,
			};
		}
	}

	// Static modifiers
	if (config.staticModifiers && config.staticModifiers.length > 0) {
		contract.staticModifiers = config.staticModifiers.map(name => ({
			name,
			selector: `.${block}--${name}`,
		}));
	}

	// Elements: collected from structure, contentWrapper, and autoLabel
	const elements: Record<string, RuneContract['elements'] extends Record<string, infer V> | undefined ? V : never> = {};

	// Structure elements (recursive)
	if (config.structure) {
		for (const [key, entry] of Object.entries(config.structure)) {
			collectStructureElements(entry, key, block, elements, undefined);
		}
	}

	// Content wrapper element
	if (config.contentWrapper) {
		elements[config.contentWrapper.ref] = {
			tag: config.contentWrapper.tag,
			selector: `.${block}__${config.contentWrapper.ref}`,
			source: 'contentWrapper',
		};
	}

	// AutoLabel elements
	if (config.autoLabel) {
		for (const [tagName, label] of Object.entries(config.autoLabel)) {
			elements[label] = {
				tag: tagName,
				selector: `.${block}__${label}`,
				source: 'autoLabel',
			};
		}
	}

	if (Object.keys(elements).length > 0) {
		contract.elements = elements;
	}

	// Inline styles
	if (config.styles && Object.keys(config.styles).length > 0) {
		contract.inlineStyles = {};
		for (const [modName, spec] of Object.entries(config.styles)) {
			contract.inlineStyles[modName] = spec;
		}
	}

	// Child order
	contract.childOrder = computeChildOrder(config);

	return contract;
}

/** Recursively collect element entries from a structure tree */
function collectStructureElements(
	entry: StructureEntry,
	key: string,
	block: string,
	elements: Record<string, any>,
	parentRef: string | undefined,
): void {
	const ref = entry.ref ?? key;

	const element: Record<string, any> = {
		tag: entry.tag,
		selector: `.${block}__${ref}`,
		source: 'structure',
	};

	if (parentRef) {
		element.parent = parentRef;
	}
	if (entry.condition) {
		element.condition = entry.condition;
	}
	if (entry.conditionAny) {
		element.conditionAny = entry.conditionAny;
	}

	// Deduplicate: if we already have this ref (e.g., multiple 'dot' or 'meta-item'),
	// only store it once since the selector is the same
	if (!elements[ref]) {
		elements[ref] = element;
	}

	// Recurse into children
	if (entry.children) {
		for (const child of entry.children) {
			if (typeof child !== 'string' && (child.ref || child.tag)) {
				const childKey = child.ref ?? '';
				if (childKey) {
					collectStructureElements(child, childKey, block, elements, ref);
				}
			}
		}
	}
}

/** Compute the child order array for a rune */
function computeChildOrder(config: RuneConfig): string[] {
	const order: string[] = [];

	// Prepended structure entries (before: true)
	if (config.structure) {
		for (const [key, entry] of Object.entries(config.structure)) {
			if (entry.before) {
				order.push(entry.ref ?? key);
			}
		}
	}

	// Content (possibly wrapped)
	if (config.contentWrapper) {
		order.push(`{content:${config.contentWrapper.ref}}`);
	} else {
		order.push('{content}');
	}

	// Appended structure entries (after content)
	if (config.structure) {
		for (const [key, entry] of Object.entries(config.structure)) {
			if (!entry.before) {
				order.push(entry.ref ?? key);
			}
		}
	}

	return order;
}
