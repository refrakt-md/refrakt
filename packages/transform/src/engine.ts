import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type { ThemeConfig, RuneConfig, StructureEntry, TintDefinition } from './types.js';
import { isTag, makeTag, readMeta } from './helpers.js';

/** The 6 tint colour tokens */
const TINT_TOKENS = ['background', 'surface', 'primary', 'secondary', 'accent', 'border'] as const;

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
	const { prefix, runes, icons = {}, tints = {} } = config;

	function identityTransform(tree: RendererNode, parentTypeof?: string): RendererNode {
		if (tree === null || tree === undefined) return tree;
		if (typeof tree === 'string' || typeof tree === 'number') return tree;
		if (Array.isArray(tree)) return tree.map(n => identityTransform(n, parentTypeof));
		if (!isTag(tree)) return tree;

		const typeof_ = tree.attributes?.typeof;
		if (typeof_ && typeof_ in runes) {
			return transformRune(tree, runes[typeof_], prefix, icons, tints, identityTransform, parentTypeof);
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
	tints: Record<string, TintDefinition>,
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
				if (!mod.noBemClass) {
					modifierClasses.push(`${block}--${value}`);
				}
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

	// 1d. Tint processing — read tint meta tags and resolve colour tokens
	const tintMetaProps = new Set<string>();
	const tintDataAttrs: Record<string, string> = {};
	const tintStyleParts: string[] = [];

	const tintName = readMeta(tag, 'tint');
	const tintMode = readMeta(tag, 'tint-mode');

	if (tintName || tintMode) {
		// Resolve named tint definition
		let lightTokens: Record<string, string> = {};
		let darkTokens: Record<string, string> = {};
		let resolvedMode = tintMode;

		if (tintName && tintName !== 'custom' && tints[tintName]) {
			const def = tints[tintName];
			if (def.light) {
				for (const [k, v] of Object.entries(def.light)) {
					if (v) lightTokens[k] = v;
				}
			}
			if (def.dark) {
				for (const [k, v] of Object.entries(def.dark)) {
					if (v) darkTokens[k] = v;
				}
			}
			if (!resolvedMode && def.mode && def.mode !== 'auto') {
				resolvedMode = def.mode;
			}
		}

		// Read inline tint token metas (override preset values)
		for (const token of TINT_TOKENS) {
			const val = readMeta(tag, `tint-${token}`);
			if (val) {
				lightTokens[token] = val;
				tintMetaProps.add(`tint-${token}`);
			}
			const darkVal = readMeta(tag, `tint-dark-${token}`);
			if (darkVal) {
				darkTokens[token] = darkVal;
				tintMetaProps.add(`tint-dark-${token}`);
			}
		}

		// Set data attributes
		const hasTokens = Object.keys(lightTokens).length > 0;
		if (tintName || hasTokens) {
			tintDataAttrs['data-tint'] = tintName || 'custom';
		}
		if (resolvedMode && resolvedMode !== 'auto') {
			tintDataAttrs['data-color-scheme'] = resolvedMode;
		}
		if (Object.keys(darkTokens).length > 0) {
			tintDataAttrs['data-tint-dark'] = '';
		}

		// Build inline styles for tint tokens
		for (const [token, value] of Object.entries(lightTokens)) {
			tintStyleParts.push(`--tint-${token}: ${value}`);
		}
		for (const [token, value] of Object.entries(darkTokens)) {
			tintStyleParts.push(`--tint-dark-${token}: ${value}`);
		}

		// Add --tinted BEM modifier when colour tokens are present
		if (hasTokens || (tintName && tintName !== 'custom' && tints[tintName])) {
			modifierClasses.push(`${block}--tinted`);
		}

		// Track consumed meta properties
		tintMetaProps.add('tint');
		tintMetaProps.add('tint-mode');
	}

	// 1e. Width and spacing — universal base attributes on all block runes
	const widthValue = tag.attributes?.width ?? config.defaultWidth;
	if (widthValue && widthValue !== 'content') {
		modifierValues['width'] = widthValue;
		modifierClasses.push(`${block}--${widthValue}`);
	}
	const spacingValue = tag.attributes?.spacing;
	if (spacingValue && spacingValue !== 'default') {
		modifierValues['spacing'] = spacingValue;
		modifierClasses.push(`${block}--spacing-${spacingValue}`);
	}

	// 1f. Background processing — read bg-* meta tags and build background layer
	const bgMetaProps = new Set<string>();
	const bgDataAttrs: Record<string, string> = {};
	let bgElement: SerializedTag | null = null;

	const bgSrc = readMeta(tag, 'bg-src');
	const bgVideo = readMeta(tag, 'bg-video');

	if (bgSrc || bgVideo) {
		const bgOverlay = readMeta(tag, 'bg-overlay');
		const bgBlur = readMeta(tag, 'bg-blur');
		const bgPosition = readMeta(tag, 'bg-position');
		const bgFit = readMeta(tag, 'bg-fit');
		const bgOpacity = readMeta(tag, 'bg-opacity');
		const bgFixed = readMeta(tag, 'bg-fixed');

		// Blur presets
		const BLUR_PRESETS: Record<string, string> = { sm: '4px', md: '8px', lg: '16px' };

		// Build bg layer style
		const bgStyleParts: string[] = [];
		if (bgSrc) bgStyleParts.push(`--bg-image: url(${bgSrc})`);
		if (bgPosition) bgStyleParts.push(`--bg-position: ${bgPosition}`);
		if (bgBlur) bgStyleParts.push(`--bg-blur: ${BLUR_PRESETS[bgBlur] ?? bgBlur}`);
		if (bgFit) bgStyleParts.push(`--bg-fit: ${bgFit}`);
		if (bgOpacity) bgStyleParts.push(`--bg-opacity: ${bgOpacity}`);

		const bgAttrs: Record<string, any> = { 'data-name': 'bg' };
		if (bgStyleParts.length) bgAttrs.style = bgStyleParts.join('; ');
		if (bgFixed) bgAttrs['data-bg-fixed'] = '';

		// Build bg layer children
		const bgChildren: RendererNode[] = [];

		if (bgVideo) {
			bgChildren.push(makeTag('video', {
				'data-name': 'bg-video',
				autoplay: '',
				muted: '',
				loop: '',
				playsinline: '',
				src: bgVideo,
				...(bgStyleParts.length ? { style: bgStyleParts.filter(s => !s.startsWith('--bg-image')).join('; ') } : {}),
			}));
		}

		if (bgOverlay) {
			const overlayAttrs: Record<string, string> = { 'data-name': 'bg-overlay' };
			if (bgOverlay === 'dark' || bgOverlay === 'light') {
				overlayAttrs['data-bg-overlay'] = bgOverlay;
			} else {
				overlayAttrs.style = `background: ${bgOverlay}`;
			}
			bgChildren.push(makeTag('div', overlayAttrs));
		}

		bgElement = makeTag('div', bgAttrs, bgChildren);

		// Add has-bg modifier and class
		modifierClasses.push(`${block}--has-bg`);
		bgDataAttrs['data-bg'] = '';

		// Track consumed meta properties
		bgMetaProps.add('bg-src');
		bgMetaProps.add('bg-video');
		bgMetaProps.add('bg-overlay');
		bgMetaProps.add('bg-blur');
		bgMetaProps.add('bg-position');
		bgMetaProps.add('bg-fit');
		bgMetaProps.add('bg-opacity');
		bgMetaProps.add('bg-fixed');
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

	// 4. Auto-label children by tag name or property attribute (recursive)
	let children = tag.children;
	if (config.autoLabel) {
		children = applyAutoLabel(children, config.autoLabel);
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

	// 5b. Prepend bg layer element if present (before content, after structural elements)
	if (bgElement) {
		children = [bgElement, ...children];
	}

	// 6. Apply BEM element classes to data-name children, then recurse once
	const enhancedChildren = children.map(child => {
		if (!isTag(child)) return recurse(child, typeof_);
		return recurse(applyBemClasses(child, block), typeof_);
	});

	// 7. Remove consumed meta tags (modifiers + tint)
	const filteredChildren = enhancedChildren.filter(child => {
		if (!isTag(child as any)) return true;
		const c = child as SerializedTag;
		if (c.name !== 'meta' || !c.attributes.property) return true;
		const prop = c.attributes.property;
		if (config.modifiers && prop in config.modifiers) return false;
		if (tintMetaProps.has(prop)) return false;
		if (bgMetaProps.has(prop)) return false;
		return true;
	});

	// 8. Build inline styles from styles config + tint tokens
	let inlineStyle = tag.attributes.style || '';
	const styleParts: string[] = [];
	if (config.styles) {
		for (const [modName, spec] of Object.entries(config.styles)) {
			const val = modifierValues[modName];
			if (!val) continue;
			if (typeof spec === 'string') {
				styleParts.push(`${spec}: ${val}`);
			} else if (spec.transform) {
				styleParts.push(`${spec.prop}: ${spec.transform(val)}`);
			} else if (spec.template) {
				styleParts.push(`${spec.prop}: ${spec.template.replace('{}', val)}`);
			} else {
				styleParts.push(`${spec.prop}: ${val}`);
			}
		}
	}
	styleParts.push(...tintStyleParts);
	if (styleParts.length) {
		inlineStyle = inlineStyle
			? `${inlineStyle}; ${styleParts.join('; ')}`
			: styleParts.join('; ');
	}

	// Strip consumed universal attributes from output (they're expressed via data-* / BEM instead)
	const { width: _w, spacing: _s, ...passAttrs } = tag.attributes;

	const result: SerializedTag = {
		...tag,
		attributes: {
			...passAttrs,
			...modDataAttrs,
			...tintDataAttrs,
			...bgDataAttrs,
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

/** Recursively apply autoLabel mapping to all descendant nodes. */
function applyAutoLabel(children: RendererNode[], autoLabel: Record<string, string>): RendererNode[] {
	return children.map(child => {
		if (!isTag(child)) return child;
		const label = autoLabel[child.name] ?? autoLabel[child.attributes?.property];
		const labeled = label && !child.attributes['data-name']
			? { ...child, attributes: { ...child.attributes, 'data-name': label } }
			: child;
		if (labeled.children.length === 0) return labeled;
		return { ...labeled, children: applyAutoLabel(labeled.children, autoLabel) };
	});
}

/** Recursively apply BEM element classes to data-name elements within a rune's children.
 *  Pure decoration — does not recurse into the transform pipeline. */
function applyBemClasses(child: SerializedTag, block: string): SerializedTag {
	const dataName = child.attributes['data-name'];
	if (dataName) {
		const elementClass = `${block}__${dataName}`;
		const childExistingClass = child.attributes.class || '';
		// Recursively apply BEM to nested data-name children (e.g., icon/title inside header)
		const nestedChildren = child.children.map(c => {
			if (!isTag(c)) return c;
			return applyBemClasses(c, block);
		});
		return {
			...child,
			attributes: {
				...child.attributes,
				class: [elementClass, childExistingClass].filter(Boolean).join(' '),
			},
			children: nestedChildren,
		};
	}
	return child;
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
			} else if ('fromModifier' in val) {
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
