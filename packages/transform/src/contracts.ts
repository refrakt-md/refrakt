import type { ThemeConfig, RuneConfig, StructureEntry } from './types.js';
import { toKebabCase } from './helpers.js';

/** Structure contract for a single rune */
export interface RuneContract {
	block: string;
	root: string;
	dataRune: string;
	parent?: string;
	modifiers?: Record<string, {
		source: string;
		default?: string;
		classPattern?: string;
		dataAttribute: string;
		valueMap?: Record<string, string>;
		mapTarget?: string;
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
	inlineStyles?: Record<string, string | { prop: string; template?: string; transform?: (value: string) => string }>;
	childOrder: string[];
	/** Named slot ordering (when declared) */
	slots?: string[];
	/** Child density imposed on nested runes */
	childDensity?: 'compact' | 'minimal';
	/** Projection declarations for structural reshaping */
	projection?: {
		hide?: string[];
		group?: Record<string, { tag: string; members: string[] }>;
		relocate?: Record<string, { into: string; position?: string }>;
	};
	/** Warnings about invalid projection references */
	warnings?: string[];
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
		dataRune: toKebabCase(runeName),
		...(config.parent ? { parent: config.parent } : {}),
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
				...(mod.noBemClass ? {} : { classPattern: `.${block}--{value}` }),
				dataAttribute: `data-${kebab}`,
				...(mod.valueMap ? { valueMap: mod.valueMap } : {}),
				...(mod.mapTarget ? { mapTarget: mod.mapTarget } : {}),
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

	// Slots
	if (config.slots) {
		contract.slots = config.slots;
	}

	// Child density
	if (config.childDensity) {
		contract.childDensity = config.childDensity;
	}

	// Projection declarations + validation
	if (config.projection) {
		contract.projection = {};
		const warnings: string[] = [];

		// Collect all known data-name values from elements
		const knownNames = new Set(Object.keys(contract.elements ?? {}));

		if (config.projection.hide) {
			contract.projection.hide = config.projection.hide;
			for (const name of config.projection.hide) {
				if (!knownNames.has(name)) {
					warnings.push(`projection.hide references unknown data-name "${name}"`);
				}
			}
		}
		if (config.projection.group) {
			contract.projection.group = {};
			for (const [key, def] of Object.entries(config.projection.group)) {
				contract.projection.group[key] = { tag: def.tag, members: def.members };
				// The group itself becomes a new element
				if (!contract.elements) contract.elements = {};
				contract.elements[key] = {
					tag: def.tag,
					selector: `.${block}__${key}`,
					source: 'projection.group',
				};
				for (const member of def.members) {
					if (!knownNames.has(member)) {
						warnings.push(`projection.group "${key}" references unknown member "${member}"`);
					}
				}
			}
		}
		if (config.projection.relocate) {
			contract.projection.relocate = {};
			for (const [source, def] of Object.entries(config.projection.relocate)) {
				contract.projection.relocate[source] = {
					into: def.into,
					...(def.position ? { position: def.position } : {}),
				};
				if (!knownNames.has(source)) {
					warnings.push(`projection.relocate source "${source}" is unknown`);
				}
				// Target can be a data-name or a slot name
				const isSlotTarget = config.slots?.includes(def.into);
				if (!knownNames.has(def.into) && !isSlotTarget) {
					warnings.push(`projection.relocate target "${def.into}" is unknown`);
				}
			}
		}

		if (warnings.length > 0) {
			contract.warnings = warnings;
		}
	}

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

	// Collect repeat template elements
	if (entry.repeat) {
		const repeatRef = entry.repeat.element.ref ?? '';
		if (repeatRef) {
			collectStructureElements(entry.repeat.element, repeatRef, block, elements, ref);
		}
		if (entry.repeat.filledElement) {
			const filledRef = entry.repeat.filledElement.ref ?? '';
			if (filledRef) {
				collectStructureElements(entry.repeat.filledElement, filledRef, block, elements, ref);
			}
		}
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
	// Slot-based ordering
	if (config.slots && config.structure) {
		const order: string[] = [];
		const nonContentSlots = config.slots.filter(s => s !== 'content');
		const firstSlot = nonContentSlots[0];
		const lastSlot = nonContentSlots[nonContentSlots.length - 1];

		// Build slot → entries map
		const slotEntries = new Map<string, Array<{ name: string; order: number }>>();
		for (const slot of config.slots) {
			slotEntries.set(slot, []);
		}

		for (const [key, entry] of Object.entries(config.structure)) {
			const ref = entry.ref ?? key;
			let targetSlot: string;
			if (entry.slot) {
				targetSlot = entry.slot;
			} else if (entry.before && firstSlot) {
				targetSlot = firstSlot;
			} else if (lastSlot) {
				targetSlot = lastSlot;
			} else {
				targetSlot = entry.before ? (firstSlot ?? config.slots[0]) : (lastSlot ?? config.slots[config.slots.length - 1]);
			}
			const bucket = slotEntries.get(targetSlot);
			if (bucket) {
				bucket.push({ name: ref, order: entry.order ?? 0 });
			}
		}

		for (const slot of config.slots) {
			if (slot === 'content') {
				if (config.contentWrapper) {
					order.push(`{content:${config.contentWrapper.ref}}`);
				} else {
					order.push('{content}');
				}
			} else {
				const entries = slotEntries.get(slot) ?? [];
				entries.sort((a, b) => a.order - b.order);
				for (const { name } of entries) {
					order.push(name);
				}
			}
		}
		return order;
	}

	// Legacy before/after ordering
	const order: string[] = [];

	if (config.structure) {
		for (const [key, entry] of Object.entries(config.structure)) {
			if (entry.before) {
				order.push(entry.ref ?? key);
			}
		}
	}

	if (config.contentWrapper) {
		order.push(`{content:${config.contentWrapper.ref}}`);
	} else {
		order.push('{content}');
	}

	if (config.structure) {
		for (const [key, entry] of Object.entries(config.structure)) {
			if (!entry.before) {
				order.push(entry.ref ?? key);
			}
		}
	}

	return order;
}
