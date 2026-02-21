import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type { ThemeConfig, RuneConfig, StructureEntry } from './types.js';
import { isTag, makeTag, readMeta } from './helpers.js';

/** Pure text transforms for metaText values */
const transforms: Record<string, (v: string) => string> = {
	duration(iso: string): string {
		const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		if (!m) return iso;
		const parts: string[] = [];
		if (m[1]) parts.push(`${m[1]}h`);
		if (m[2]) parts.push(`${m[2]}m`);
		if (m[3]) parts.push(`${m[3]}s`);
		return parts.join(' ') || iso;
	},
	uppercase: (s) => s.toUpperCase(),
	capitalize: (s) => s.charAt(0).toUpperCase() + s.slice(1),
};

/**
 * Create an identity transform function from a theme configuration.
 *
 * The returned function walks the serialized tag tree and enhances it:
 * - Adds BEM classes based on the rune config
 * - Reads and consumes meta tags for variant info
 * - Auto-labels children by tag name (e.g., summary → data-name="header")
 * - Injects structural elements (headers, icons, titles) from config
 * - Recurses into children for nested runes
 */
export function createTransform(config: ThemeConfig) {
	const { prefix, runes, icons = {} } = config;

	function identityTransform(tree: RendererNode, parentTypeof?: string): RendererNode {
		if (tree === null || tree === undefined) return tree;
		if (typeof tree === 'string' || typeof tree === 'number') return tree;
		if (Array.isArray(tree)) return tree.map(n => identityTransform(n, parentTypeof));
		if (!isTag(tree)) return tree;

		const typeof_ = tree.attributes?.typeof;
		if (typeof_ && typeof_ in runes) {
			return transformRune(tree, runes[typeof_], prefix, icons, identityTransform, parentTypeof);
		}

		// Recurse into children even for non-rune tags (pass parent context through)
		return { ...tree, children: tree.children.map(n => identityTransform(n, parentTypeof)) };
	}

	return (tree: RendererNode) => identityTransform(tree);
}

/** Apply BEM classes and structural enhancements to a rune tag */
function transformRune(
	tag: SerializedTag,
	config: RuneConfig,
	prefix: string,
	icons: Record<string, Record<string, string>>,
	recurse: (node: RendererNode, parentTypeof?: string) => RendererNode,
	parentTypeof?: string
): SerializedTag {
	const block = `${prefix}-${config.block}`;
	const typeof_ = tag.attributes?.typeof;

	// 1. Read modifiers from meta tags, collecting resolved values
	const modifierClasses: string[] = [];
	const modifierValues: Record<string, string> = {};
	if (config.modifiers) {
		for (const [name, mod] of Object.entries(config.modifiers)) {
			const value = mod.source === 'meta'
				? readMeta(tag, name, mod.default)
				: tag.attributes[name] ?? mod.default;
			if (value) {
				modifierValues[name] = value;
				modifierClasses.push(`${block}--${value}`);
			}
		}
	}

	// 1b. Context-aware modifiers — add BEM modifier when nested inside a matching parent rune
	if (config.contextModifiers && parentTypeof && config.contextModifiers[parentTypeof]) {
		modifierClasses.push(`${block}--${config.contextModifiers[parentTypeof]}`);
	}

	// 1c. Static modifiers — always-applied BEM modifier suffixes
	if (config.staticModifiers) {
		for (const mod of config.staticModifiers) {
			modifierClasses.push(`${block}--${mod}`);
		}
	}

	// 2. Store modifier values as data attributes (so components can read them even after meta removal)
	const modDataAttrs: Record<string, string> = {};
	for (const [name, value] of Object.entries(modifierValues)) {
		const kebab = name.replace(/([A-Z])/g, '-$1').toLowerCase();
		modDataAttrs[`data-${kebab}`] = value;
	}

	// 3. Build the class string
	const existingClass = tag.attributes.class || '';
	const bemClass = [block, ...modifierClasses, existingClass].filter(Boolean).join(' ');

	// 4. Auto-label children by tag name or property attribute
	let children = tag.children;
	if (config.autoLabel) {
		children = children.map(child => {
			if (!isTag(child)) return child;
			const label = config.autoLabel![child.name] ?? config.autoLabel![child.attributes?.property];
			if (label && !child.attributes['data-name']) {
				return { ...child, attributes: { ...child.attributes, 'data-name': label } };
			}
			return child;
		});
	}

	// 5. Inject structural elements from config
	if (config.structure) {
		const prepend: RendererNode[] = [];
		const append: RendererNode[] = [];

		for (const [name, entry] of Object.entries(config.structure)) {
			const element = buildStructureElement(entry, name, modifierValues, icons);
			if (!element) continue;
			if (entry.before) {
				prepend.push(element);
			} else {
				append.push(element);
			}
		}

		if (config.contentWrapper) {
			const wrapped = makeTag(config.contentWrapper.tag,
				{ 'data-name': config.contentWrapper.ref }, children);
			children = [...prepend, wrapped, ...append];
		} else if (prepend.length || append.length) {
			children = [...prepend, ...children, ...append];
		}
	} else if (config.contentWrapper) {
		const wrapped = makeTag(config.contentWrapper.tag,
			{ 'data-name': config.contentWrapper.ref }, children);
		children = [wrapped];
	}

	// 6. Apply BEM element classes to data-name children (recursively for structural elements)
	const enhancedChildren = children.map(child => {
		if (!isTag(child)) return recurse(child, typeof_);
		return applyBemClasses(child, block, recurse, typeof_);
	});

	// 7. Remove consumed meta tags
	const filteredChildren = enhancedChildren.filter(child => {
		if (!isTag(child as any)) return true;
		const c = child as SerializedTag;
		if (c.name !== 'meta' || !c.attributes.property) return true;
		return !config.modifiers || !(c.attributes.property in config.modifiers);
	});

	// 8. Build inline styles from styles config
	let inlineStyle = tag.attributes.style || '';
	if (config.styles) {
		const parts: string[] = [];
		for (const [modName, spec] of Object.entries(config.styles)) {
			const val = modifierValues[modName];
			if (!val) continue;
			if (typeof spec === 'string') {
				parts.push(`${spec}: ${val}`);
			} else {
				parts.push(`${spec.prop}: ${spec.template.replace('{}', val)}`);
			}
		}
		if (parts.length) {
			inlineStyle = inlineStyle
				? `${inlineStyle}; ${parts.join('; ')}`
				: parts.join('; ');
		}
	}

	const result: SerializedTag = {
		...tag,
		attributes: {
			...tag.attributes,
			...modDataAttrs,
			class: bemClass,
			'data-rune': typeof_ ? typeof_.toLowerCase() : undefined,
			...(config.rootAttributes || {}),
			...(inlineStyle ? { style: inlineStyle } : {}),
		},
		children: filteredChildren,
	};

	// 9. Programmatic escape hatch — runs after all declarative processing
	if (config.postTransform) {
		return config.postTransform(result, {
			modifiers: modifierValues,
			parentType: parentTypeof,
		});
	}

	return result;
}

/** Recursively apply BEM element classes to data-name elements within a rune's children */
function applyBemClasses(
	child: SerializedTag,
	block: string,
	recurse: (node: RendererNode, parentTypeof?: string) => RendererNode,
	parentTypeof?: string
): RendererNode {
	const dataName = child.attributes['data-name'];
	if (dataName) {
		const elementClass = `${block}__${dataName}`;
		const childExistingClass = child.attributes.class || '';
		// Recursively apply BEM to nested data-name children (e.g., icon/title inside header)
		const nestedChildren = child.children.map(c => {
			if (!isTag(c)) return c;
			return applyBemClasses(c, block, recurse, parentTypeof);
		});
		return recurse({
			...child,
			attributes: {
				...child.attributes,
				class: [elementClass, childExistingClass].filter(Boolean).join(' '),
			},
			children: nestedChildren,
		}, parentTypeof);
	}

	return recurse(child, parentTypeof);
}

/** Build a structural element from a StructureEntry config. Returns null if condition is not met. */
function buildStructureElement(
	entry: StructureEntry,
	name: string,
	modifierValues: Record<string, string>,
	icons: Record<string, Record<string, string>>,
): SerializedTag | null {
	// Conditional injection
	if (entry.condition && !modifierValues[entry.condition]) return null;
	if (entry.conditionAny && !entry.conditionAny.some(k => modifierValues[k])) return null;

	const dataName = entry.ref ?? name;

	// Resolve extra attributes
	const extraAttrs: Record<string, string> = {};
	if (entry.attrs) {
		for (const [key, val] of Object.entries(entry.attrs)) {
			if (typeof val === 'string') {
				extraAttrs[key] = val;
			} else {
				extraAttrs[key] = modifierValues[val.fromModifier] ?? '';
			}
		}
	}

	const baseAttrs = { 'data-name': dataName, ...extraAttrs };

	// Icon entry: create empty element, CSS displays icon via mask-image
	if (entry.icon) {
		return makeTag(entry.tag, baseAttrs, []);
	}

	// Meta text injection: use resolved modifier value as text content
	if (entry.metaText) {
		let text = modifierValues[entry.metaText] ?? '';
		if (entry.transform && transforms[entry.transform]) {
			text = transforms[entry.transform](text);
		}
		if (entry.textPrefix) text = entry.textPrefix + text;
		if (entry.textSuffix) text = text + entry.textSuffix;
		return makeTag(entry.tag, baseAttrs, [text]);
	}

	// Process children recursively
	const elementChildren: RendererNode[] = [];
	if (entry.children) {
		for (const child of entry.children) {
			if (typeof child === 'string') {
				elementChildren.push(child);
			} else {
				const built = buildStructureElement(child, child.ref ?? '', modifierValues, icons);
				if (built) elementChildren.push(built);
			}
		}
	}

	return makeTag(entry.tag, baseAttrs, elementChildren);
}
