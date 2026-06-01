import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type { ThemeConfig, RuneConfig, StructureEntry, TintDefinition, BgPresetDefinition, LayoutPrimitive, MetaField, ZoneDeclaration } from './types.js';
import { isTag, makeTag, readMeta, toKebabCase } from './helpers.js';

/** The 6 tint colour tokens */
/** Tint token names per SPEC-053 vocabulary alignment. Each maps to a
 *  matching `--rf-color-*` token via the same dot-to-dash rule the token
 *  contract uses. See `TintTokens` in `./types.ts` for the field-to-token
 *  mapping table. */
const TINT_TOKENS = ['bg', 'surface', 'text', 'muted', 'primary', 'border'] as const;

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
	const { prefix, runes, icons = {}, tints = {}, backgrounds = {}, zoneLayouts: themeZoneLayouts = {} } = config;

	// Build lowercase → config-key map for case-insensitive rune lookup
	const runeKeyMap = new Map(Object.keys(runes).map(k => [toKebabCase(k), k]));

	function identityTransform(tree: RendererNode, parentRune?: string): RendererNode {
		if (tree === null || tree === undefined) return tree;
		if (typeof tree === 'string' || typeof tree === 'number') return tree;
		if (Array.isArray(tree)) return tree.map(n => identityTransform(n, parentRune));
		if (!isTag(tree)) return tree;

		const dataRune = tree.attributes?.['data-rune'];
		const configKey = dataRune ? runeKeyMap.get(dataRune) : undefined;
		if (configKey) {
			return transformRune(tree, runes[configKey], prefix, icons, tints, backgrounds, runes, runeKeyMap, identityTransform, themeZoneLayouts, configKey, parentRune);
		}

		// Detect checkbox markers on list items
		if (tree.name === 'li') {
			const checked = detectCheckboxMarker(tree);
			if (checked) {
				return { ...checked, children: checked.children.map(n => identityTransform(n, parentRune)) };
			}
		}

		// Recurse into children even for non-rune tags (pass parent context through)
		return { ...tree, children: tree.children.map(n => identityTransform(n, parentRune)) };
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
	backgrounds: Record<string, BgPresetDefinition>,
	allRunes: Record<string, RuneConfig>,
	runeKeyMap: Map<string, string>,
	recurse: (node: RendererNode, parentRune?: string) => RendererNode,
	themeZoneLayouts: Record<string, LayoutPrimitive>,
	runeName: string,
	parentRune?: string
): SerializedTag {
	const block = `${prefix}-${config.block}`;
	const dataRune = tag.attributes?.['data-rune'];

	// 1. Read modifiers from meta tags, collecting resolved values
	const modifierClasses: string[] = [];
	const modifierValues: Record<string, string> = {};
	const mappedValues: Record<string, string> = {};
	const attrModifierNames: string[] = [];
	if (config.modifiers) {
		for (const [name, mod] of Object.entries(config.modifiers)) {
			if (mod.source === 'attribute') attrModifierNames.push(name);
			const value = mod.source === 'meta'
				? readMeta(tag, name, mod.default)
				: tag.attributes[name] ?? mod.default;
			if (value) {
				modifierValues[name] = value;
				if (!mod.noBemClass) {
					modifierClasses.push(`${block}--${value}`);
				}
				// Value mapping: translate raw value through valueMap
				if (mod.valueMap) {
					const mapped = mod.valueMap[value] ?? value;
					if (mod.mapTarget) {
						mappedValues[mod.mapTarget] = mapped;
					} else {
						modifierValues[name] = mapped;
					}
				}
			}
		}
	}

	// 1b. Context-aware modifiers — add BEM modifier when nested inside a matching parent rune
	if (config.contextModifiers && parentRune && config.contextModifiers[parentRune]) {
		modifierClasses.push(`${block}--${config.contextModifiers[parentRune]}`);
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
			if (!resolvedMode && def.lockMode) {
				resolvedMode = def.lockMode;
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

	// 1e. Density — resolve from author attribute → context → config default → 'full'
	const authorDensity = tag.attributes?.density;
	const parentConfigKey = parentRune ? runeKeyMap.get(parentRune) : undefined;
	const parentChildDensity = parentConfigKey ? allRunes[parentConfigKey]?.childDensity : undefined;
	const contextDensity = parentChildDensity;
	const resolvedDensity = authorDensity ?? contextDensity ?? config.defaultDensity ?? 'full';

	// 1f. Width and spacing — universal base attributes on all block runes
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
	const insetValue = tag.attributes?.inset;
	if (insetValue && insetValue !== 'default') {
		modifierValues['inset'] = insetValue;
		modifierClasses.push(`${block}--inset-${insetValue}`);
	}

	// 1f. Background processing — read bg-* meta tags and build background layer
	const bgMetaProps = new Set<string>();
	const bgDataAttrs: Record<string, string> = {};
	let bgElement: SerializedTag | null = null;

	const bgPreset = readMeta(tag, 'bg-preset');
	const bgSrc = readMeta(tag, 'bg-src');
	const bgVideo = readMeta(tag, 'bg-video');

	if (bgPreset || bgSrc || bgVideo) {
		// Resolve preset styles (Tier 1 — CSS-only presets)
		let presetStyles: Record<string, string> = {};
		if (bgPreset && backgrounds[bgPreset]) {
			let preset = backgrounds[bgPreset];

			// Resolve extends chain (single level)
			if (preset.extends && backgrounds[preset.extends]) {
				const base = backgrounds[preset.extends];
				preset = { ...base, params: { ...base.params, ...preset.params }, style: { ...base.style, ...preset.style } };
			}

			if (preset.style) {
				presetStyles = { ...preset.style };
			}
		}

		const bgOverlay = readMeta(tag, 'bg-overlay');
		const bgBlur = readMeta(tag, 'bg-blur');
		const bgPosition = readMeta(tag, 'bg-position');
		const bgFit = readMeta(tag, 'bg-fit');
		const bgOpacity = readMeta(tag, 'bg-opacity');
		const bgFixed = readMeta(tag, 'bg-fixed');

		// Blur presets
		const BLUR_PRESETS: Record<string, string> = { sm: '4px', md: '8px', lg: '16px' };

		// Build bg layer style — preset styles first, then explicit overrides
		const bgStyleParts: string[] = [];
		for (const [prop, value] of Object.entries(presetStyles)) {
			bgStyleParts.push(`${prop}: ${value}`);
		}
		if (bgSrc) bgStyleParts.push(`--bg-image: url(${bgSrc})`);
		if (bgPosition) bgStyleParts.push(`--bg-position: ${bgPosition}`);
		if (bgBlur) bgStyleParts.push(`--bg-blur: ${BLUR_PRESETS[bgBlur] ?? bgBlur}`);
		if (bgFit) bgStyleParts.push(`--bg-fit: ${bgFit}`);
		if (bgOpacity) bgStyleParts.push(`--bg-opacity: ${bgOpacity}`);

		const bgAttrs: Record<string, any> = { 'data-name': 'bg' };
		if (bgPreset) bgAttrs['data-bg-preset'] = bgPreset;
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
		bgMetaProps.add('bg-preset');
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
	// Add mapped value attributes (from valueMap + mapTarget)
	for (const [attr, value] of Object.entries(mappedValues)) {
		const key = attr.startsWith('data-') ? attr : `data-${attr}`;
		modDataAttrs[key] = value;
	}

	// 3. Build the class string
	const existingClass = tag.attributes.class || '';
	const bemClass = [block, ...modifierClasses, existingClass].filter(Boolean).join(' ');

	// 4. Auto-label children by tag name or property attribute (recursive)
	let children = tag.children;
	if (config.autoLabel) {
		children = applyAutoLabel(children, config.autoLabel);
	}

	// 5. SPEC-079: zone-based assembly (metaFields + zones + contentSlots).
	//    Takes precedence over the legacy `slots + structure` path. Resolves
	//    canonical render order, projects zones via layout primitives, and
	//    extracts user-authored content slots into zone wrappers.
	if (config.zones || config.contentSlots) {
		children = assembleWithZones(
			config, block, children, modifierValues, themeZoneLayouts, runeName,
		);
	} else if (config.slots && config.structure) {
		// Legacy slots + structure path — emit one-time migration warning if
		// the rune uses the v0.16 slot vocabulary (header-primary etc.).
		if (hasLegacySlotNames(config.slots)) {
			warnLegacySlots(runeName);
		}
		children = assembleWithSlots(config.slots, config.structure, children, config.contentWrapper, modifierValues, icons);
	} else if (config.structure) {
		// Legacy before/after assembly
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

	// 6. Apply BEM element classes, section anatomy, and media slots to data-name children, then recurse once
	let enhancedChildren = children.map(child => {
		if (!isTag(child)) return recurse(child, dataRune);
		return recurse(applyBemClasses(child, block, config.sections, config.mediaSlots), dataRune);
	});

	// 6b. Projection pass — declarative structural reshaping (hide → group → relocate)
	if (config.projection) {
		enhancedChildren = applyProjection(enhancedChildren, config.projection, block, config.sections, config.mediaSlots);
	}

	// 7. Remove consumed meta tags (modifiers + tint)
	// Build a Set of kebab-cased modifier keys since data-field values are now kebab-case
	// but config.modifiers keys are camelCase
	const consumedModifierFields = config.modifiers
		? new Set(Object.keys(config.modifiers).map(k => toKebabCase(k)))
		: undefined;
	const filteredChildren = enhancedChildren.filter(child => {
		if (!isTag(child as any)) return true;
		const c = child as SerializedTag;
		if (c.name !== 'meta' || !c.attributes['data-field']) return true;
		const prop = c.attributes['data-field'];
		if (consumedModifierFields?.has(prop)) return false;
		if (tintMetaProps.has(prop)) return false;
		if (bgMetaProps.has(prop)) return false;
		return true;
	});

	// 7b. Annotate <ol> elements with data-sequence when config declares sequence style
	if (config.sequence) {
		const seqDirection = config.sequenceDirection
			? (modifierValues[config.sequenceDirection.fromModifier] ?? config.sequenceDirection.default)
			: undefined;
		annotateSequence(filteredChildren, config.sequence, seqDirection);
	}

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
	const { width: _w, spacing: _s, inset: _i, density: _d, 'data-rune': _dr, ...rawPassAttrs } = tag.attributes;
	// Strip consumed attribute-source modifier names (expressed via data-* / BEM)
	const passAttrs = attrModifierNames.length > 0
		? Object.fromEntries(Object.entries(rawPassAttrs).filter(([k]) => !attrModifierNames.includes(k)))
		: rawPassAttrs;

	const result: SerializedTag = {
		...tag,
		attributes: {
			...passAttrs,
			...modDataAttrs,
			...tintDataAttrs,
			...bgDataAttrs,
			class: bemClass,
			'data-rune': dataRune,
			'data-density': resolvedDensity,
			...(config.rootAttributes || {}),
			...(inlineStyle ? { style: inlineStyle } : {}),
		},
		children: filteredChildren,
	};

	// 9. Programmatic escape hatch — runs after all declarative processing
	if (config.postTransform) {
		return config.postTransform(result, {
			modifiers: modifierValues,
			parentType: parentRune,
		});
	}

	return result;
}

/** Recursively apply autoLabel mapping to all descendant nodes. */
function applyAutoLabel(children: RendererNode[], autoLabel: Record<string, string>): RendererNode[] {
	return children.map(child => {
		if (!isTag(child)) return child;
		const label = autoLabel[child.name] ?? autoLabel[child.attributes?.['data-field']];
		const labeled = label && !child.attributes['data-name']
			? { ...child, attributes: { ...child.attributes, 'data-name': label } }
			: child;
		if (labeled.children.length === 0) return labeled;
		return { ...labeled, children: applyAutoLabel(labeled.children, autoLabel) };
	});
}

/** Recursively apply BEM element classes, section anatomy, and media slots to data-name elements within a rune's children.
 *  Pure decoration — does not recurse into the transform pipeline. */
function applyBemClasses(child: SerializedTag, block: string, sections?: Record<string, string>, mediaSlots?: Record<string, string>): SerializedTag {
	const dataName = child.attributes['data-name'];
	if (dataName) {
		const elementClass = `${block}__${dataName}`;
		const childExistingClass = child.attributes.class || '';
		// Recursively apply BEM to nested data-name children (e.g., icon/title inside header)
		const nestedChildren = child.children.map(c => {
			if (!isTag(c)) return c;
			return applyBemClasses(c, block, sections, mediaSlots);
		});
		const sectionRole = sections?.[dataName];
		const mediaSlot = mediaSlots?.[dataName];
		return {
			...child,
			attributes: {
				...child.attributes,
				class: [elementClass, childExistingClass].filter(Boolean).join(' '),
				...(sectionRole ? { 'data-section': sectionRole } : {}),
				...(mediaSlot ? { 'data-media': mediaSlot } : {}),
			},
			children: nestedChildren,
		};
	}
	return child;
}

/** Checkbox marker pattern: [x], [ ], [>], [-] at start of text */
const CHECKBOX_RE = /^\[(x|X|>|\s|-)\]\s*/;

/** Map marker characters to data-checked values */
const MARKER_TO_CHECKED: Record<string, string> = {
	'x': 'checked',
	'X': 'checked',
	' ': 'unchecked',
	'>': 'active',
	'-': 'skipped',
};

/**
 * Detect a checkbox marker at the start of a list item's text content.
 * If found, strips the marker and returns a new node with `data-checked` set.
 * Returns null if no marker is found.
 */
function detectCheckboxMarker(li: SerializedTag): SerializedTag | null {
	// Find the first text node (may be the first child, or inside a nested <p>)
	const children = li.children;
	if (children.length === 0) return null;

	const first = children[0];

	// Direct text child: "[ ] Some text"
	if (typeof first === 'string') {
		const match = first.match(CHECKBOX_RE);
		if (!match) return null;
		const value = MARKER_TO_CHECKED[match[1]] ?? 'unchecked';
		const stripped = first.slice(match[0].length);
		return {
			...li,
			attributes: { ...li.attributes, 'data-checked': value },
			children: [stripped, ...children.slice(1)],
		};
	}

	// Text inside a <p> wrapper (common Markdoc output)
	if (isTag(first) && first.name === 'p' && first.children.length > 0) {
		const pFirst = first.children[0];
		if (typeof pFirst === 'string') {
			const match = pFirst.match(CHECKBOX_RE);
			if (!match) return null;
			const value = MARKER_TO_CHECKED[match[1]] ?? 'unchecked';
			const stripped = pFirst.slice(match[0].length);
			const newP = { ...first, children: [stripped, ...first.children.slice(1)] };
			return {
				...li,
				attributes: { ...li.attributes, 'data-checked': value },
				children: [newP, ...children.slice(1)],
			};
		}
	}

	return null;
}

/**
 * Recursively walk children to find `<ol>` elements and annotate them with
 * `data-sequence` and optionally `data-sequence-direction`.
 * Mutates the array in-place for efficiency (replaces matching elements).
 */
function annotateSequence(children: RendererNode[], sequence: string, direction?: string): void {
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!isTag(child)) continue;

		if (child.name === 'ol') {
			const attrs: Record<string, string> = {
				...child.attributes,
				'data-sequence': sequence,
			};
			if (direction) {
				attrs['data-sequence-direction'] = direction;
			}
			children[i] = { ...child, attributes: attrs };
		} else if (child.children.length > 0) {
			// Recurse into wrappers (contentWrapper, structural elements)
			annotateSequence(child.children, sequence, direction);
		}
	}
}

/** Assemble children using named slots.
 *  Iterates slots in declared order, collecting structure entries per slot sorted by order,
 *  and places content children at the 'content' slot. */
function assembleWithSlots(
	slots: string[],
	structure: Record<string, StructureEntry>,
	contentChildren: RendererNode[],
	contentWrapper: { tag: string; ref: string } | undefined,
	modifierValues: Record<string, string>,
	icons: Record<string, Record<string, string>>,
): RendererNode[] {
	// Determine the first and last non-content slots for before/after mapping
	const nonContentSlots = slots.filter(s => s !== 'content');
	const firstSlot = nonContentSlots[0];
	const lastSlot = nonContentSlots[nonContentSlots.length - 1];

	// Build all structure elements and assign to slots
	type SlotEntry = { element: RendererNode; order: number };
	const slotMap = new Map<string, SlotEntry[]>();
	for (const slot of slots) {
		slotMap.set(slot, []);
	}

	for (const [name, entry] of Object.entries(structure)) {
		const element = buildStructureElement(entry, name, modifierValues, icons);
		if (!element) continue;

		// Determine slot assignment: explicit slot > before mapping > last slot
		let targetSlot: string;
		if (entry.slot) {
			targetSlot = entry.slot;
		} else if (entry.before && firstSlot) {
			targetSlot = firstSlot;
		} else if (lastSlot) {
			targetSlot = lastSlot;
		} else {
			// Fallback: place before content if before=true, after otherwise
			targetSlot = entry.before ? (firstSlot ?? slots[0]) : (lastSlot ?? slots[slots.length - 1]);
		}

		const bucket = slotMap.get(targetSlot);
		if (bucket) {
			bucket.push({ element, order: entry.order ?? 0 });
		}
	}

	// Sort entries within each slot by order
	for (const entries of slotMap.values()) {
		entries.sort((a, b) => a.order - b.order);
	}

	// Assemble in slot order
	const result: RendererNode[] = [];
	for (const slot of slots) {
		if (slot === 'content') {
			if (contentWrapper) {
				result.push(makeTag(contentWrapper.tag, { 'data-name': contentWrapper.ref }, contentChildren));
			} else {
				result.push(...contentChildren);
			}
		} else {
			const entries = slotMap.get(slot) ?? [];
			for (const { element } of entries) {
				result.push(element);
			}
		}
	}

	return result;
}

/** Find and remove a child by data-name from a flat children array.
 *  Returns the removed element and the updated array, or null if not found. */
function extractByDataName(children: RendererNode[], name: string): { element: SerializedTag; rest: RendererNode[] } | null {
	const idx = children.findIndex(c => isTag(c) && (c as SerializedTag).attributes?.['data-name'] === name);
	if (idx === -1) return null;
	const element = children[idx] as SerializedTag;
	const rest = [...children.slice(0, idx), ...children.slice(idx + 1)];
	return { element, rest };
}

/** Find a child (or nested child) by data-name without removing it. */
function findDeepByDataName(children: RendererNode[], name: string): SerializedTag | null {
	for (const child of children) {
		if (!isTag(child)) continue;
		const tag = child as SerializedTag;
		if (tag.attributes?.['data-name'] === name) return tag;
		const found = findDeepByDataName(tag.children, name);
		if (found) return found;
	}
	return null;
}

/** Insert an element into a target element's children (found by data-name). */
function insertIntoTarget(children: RendererNode[], targetName: string, element: RendererNode, position: 'prepend' | 'append'): RendererNode[] {
	return children.map(child => {
		if (!isTag(child)) return child;
		const tag = child as SerializedTag;
		if (tag.attributes?.['data-name'] === targetName) {
			const newChildren = position === 'prepend'
				? [element, ...tag.children]
				: [...tag.children, element];
			return { ...tag, children: newChildren };
		}
		// Recurse into children to find nested targets
		const updatedChildren = insertIntoTarget(tag.children, targetName, element, position);
		if (updatedChildren !== tag.children) {
			return { ...tag, children: updatedChildren };
		}
		return child;
	});
}

/** Apply projection transformations: hide → group → relocate.
 *  Operates on data-name addresses in the children array. */
function applyProjection(
	children: RendererNode[],
	projection: NonNullable<import('./types.js').RuneConfig['projection']>,
	block: string,
	sections?: Record<string, string>,
	mediaSlots?: Record<string, string>,
): RendererNode[] {
	let result = [...children];

	// Phase 1: Hide — remove elements matching hide entries
	if (projection.hide) {
		const hideSet = new Set(projection.hide);
		result = result.filter(child => {
			if (!isTag(child)) return true;
			const name = (child as SerializedTag).attributes?.['data-name'];
			return !name || !hideSet.has(name);
		});
	}

	// Phase 2: Group — collect members, wrap in container, place at first member position
	if (projection.group) {
		for (const [groupName, groupDef] of Object.entries(projection.group)) {
			const memberSet = new Set(groupDef.members);
			const collected: RendererNode[] = [];
			let firstIdx = -1;

			// Find and collect all members
			for (let i = result.length - 1; i >= 0; i--) {
				const child = result[i];
				if (!isTag(child)) continue;
				const name = (child as SerializedTag).attributes?.['data-name'];
				if (name && memberSet.has(name)) {
					collected.unshift(child);
					if (firstIdx === -1 || i < firstIdx) firstIdx = i;
					result.splice(i, 1);
				}
			}

			if (collected.length > 0) {
				// Create group wrapper with data-name and apply BEM classes
				let wrapper = makeTag(groupDef.tag, { 'data-name': groupName }, collected);
				wrapper = applyBemClasses(wrapper, block, sections, mediaSlots);
				result.splice(firstIdx, 0, wrapper);
			}
		}
	}

	// Phase 3: Relocate — move elements into targets
	if (projection.relocate) {
		for (const [sourceName, relDef] of Object.entries(projection.relocate)) {
			const extracted = extractByDataName(result, sourceName);
			if (!extracted) continue;
			result = extracted.rest;

			// Try to find target by data-name in the tree
			const targetExists = findDeepByDataName(result, relDef.into);
			if (targetExists) {
				result = insertIntoTarget(result, relDef.into, extracted.element, relDef.position ?? 'append');
			}
			// If target not found, element is dropped (no-op for invalid references)
		}
	}

	return result;
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

	// Repeated element generation: produce N copies of a template element
	if (entry.repeat) {
		const countRaw = parseInt(modifierValues[entry.repeat.count] ?? '', 10);
		if (!countRaw || countRaw < 0 || isNaN(countRaw)) {
			return makeTag(entry.tag, { 'data-name': dataName }, []);
		}
		const max = entry.repeat.max ?? 10;
		const count = Math.min(countRaw, max);
		const filledRaw = entry.repeat.filled
			? parseInt(modifierValues[entry.repeat.filled] ?? '0', 10)
			: 0;
		const filled = Math.max(0, Math.min(filledRaw, count));

		const children: RendererNode[] = [];
		for (let i = 0; i < count; i++) {
			const isFilled = i < filled;
			if (isFilled && entry.repeat.filledElement) {
				const el = buildStructureElement(entry.repeat.filledElement, entry.repeat.filledElement.ref ?? '', modifierValues, icons);
				if (el) children.push(el);
			} else {
				const el = buildStructureElement(entry.repeat.element, entry.repeat.element.ref ?? '', modifierValues, icons);
				if (el) {
					if (entry.repeat.filled) {
						// Add data-filled attribute when filled tracking is active
						children.push({
							...el,
							attributes: { ...el.attributes, 'data-filled': isFilled ? 'true' : 'false' },
						});
					} else {
						children.push(el);
					}
				}
			}
		}
		return makeTag(entry.tag, { 'data-name': dataName }, children);
	}

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

	const baseAttrs: Record<string, string> = { 'data-name': dataName, ...extraAttrs };

	// Metadata dimension attributes — additive semantic markers for generic theme styling
	if (entry.metaType) {
		baseAttrs['data-meta-type'] = entry.metaType;
		// SPEC-079: legacy `slots + structure` configs get the universal
		// `.rf-badge` class on every meta-typed structure entry so the
		// chip-look rides along without needing the new zone dispatcher.
		// Layout primitives in the new zone path emit `.rf-badge`
		// independently via buildChip().
		const existingClass = baseAttrs.class || '';
		baseAttrs.class = existingClass ? `rf-badge ${existingClass}` : 'rf-badge';
	}
	if (entry.metaRank) {
		baseAttrs['data-meta-rank'] = entry.metaRank;
	}
	if (entry.sentimentMap && entry.metaText) {
		const rawValue = modifierValues[entry.metaText];
		if (rawValue) {
			const sentiment = entry.sentimentMap[rawValue];
			if (sentiment) {
				baseAttrs['data-meta-sentiment'] = sentiment;
			}
		}
	}

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
		// When label is specified, emit separate label and value child elements
		if (entry.label) {
			const labelAttrs: Record<string, string> = { 'data-meta-label': '' };
			if (entry.labelHidden) labelAttrs['data-meta-label-hidden'] = '';
			const labelEl = makeTag('span', labelAttrs, [entry.label]);
			let valueText = text;
			if (entry.textPrefix) valueText = entry.textPrefix + valueText;
			if (entry.textSuffix) valueText = valueText + entry.textSuffix;
			const valueEl = makeTag('span', { 'data-meta-value': '' }, [valueText]);
			return makeTag(entry.tag, baseAttrs, [labelEl, valueEl]);
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

// ─── SPEC-079: Zone dispatcher + layout primitives ──────────────────────

/** Canonical render order for the position vocabulary. The engine emits
 *  zones / contentSlots in this order when the rune doesn't declare an
 *  explicit `order: [...]` field. Standard positions get canonical CSS
 *  classes; custom positions (declared via `order`) get auto-derived
 *  `.rf-{block}__{name}` classes. */
const CANONICAL_POSITION_ORDER = ['eyebrow', 'title', 'blurb', 'metadata', 'body'] as const;

/** Positions that belong to the auto-derived `.rf-{block}__preamble`
 *  header region wrapper. The engine groups any declared positions from
 *  this set into a single preamble element so themes get a stable CSS
 *  hook around the header. `body` and custom positions stay outside. */
const PREAMBLE_POSITIONS = new Set<string>(['eyebrow', 'title', 'blurb', 'metadata']);

/** Engine-side default layout per zone name when neither per-rune
 *  `zoneLayouts.{zone}` nor theme-level `zoneLayouts.{zone}` is set.
 *  Lumina's theme config overrides `metadata` to `definition-list` (its
 *  preferred default); the engine fallback is the more conservative
 *  `chip-row` which works without grid CSS support. */
const DEFAULT_ZONE_LAYOUT: Record<string, LayoutPrimitive> = {
	eyebrow: 'split',
	metadata: 'chip-row',
};

/** One-time warning tracker — emits the migration hint once per rune
 *  name per process. */
const LEGACY_SLOT_WARNED = new Set<string>();
const LEGACY_SLOT_NAMES = new Set<string>(['header-primary', 'header-secondary', 'preamble', 'content']);

function hasLegacySlotNames(slots: string[]): boolean {
	return slots.some(s => LEGACY_SLOT_NAMES.has(s));
}

function warnLegacySlots(runeName: string): void {
	if (LEGACY_SLOT_WARNED.has(runeName)) return;
	LEGACY_SLOT_WARNED.add(runeName);
	// Use console.warn — engine has no logger infra.
	// eslint-disable-next-line no-console
	console.warn(
		`[refrakt] Rune \`${runeName}\` uses legacy \`slots\` + \`structure\` config. ` +
		`Migrate to SPEC-079 \`metaFields\` + \`zones\` + \`contentSlots\` to ` +
		`opt into the new layout primitives. Legacy configs continue to render ` +
		`via the existing path; chip styling rides along universally from the ` +
		`metadata.css rewrite.`,
	);
}

/** A field resolved against the modifier values — ready for layout rendering. */
interface ResolvedField {
	name: string;
	value: string;
	field: MetaField;
}

function resolveField(
	name: string,
	metaFields: Record<string, MetaField>,
	modifierValues: Record<string, string>,
): ResolvedField | null {
	const field = metaFields[name];
	if (!field) return null;
	if (field.condition && !modifierValues[field.condition]) return null;
	const value = modifierValues[name] ?? '';
	if (!value && field.condition) return null;
	return { name, value, field };
}

/** Build a chip element — the universal `.rf-badge` primitive emitted by
 *  layout primitives that render values as chips (sentiment-mapped fields
 *  in split / def-list, every field in chip-row). The standalone
 *  `{% badge %}` rune emits the same DOM shape. */
function buildChip(
	resolved: ResolvedField,
	options: { includeLabel: boolean } = { includeLabel: true },
): SerializedTag {
	const { field, value } = resolved;
	const attrs: Record<string, string> = { class: 'rf-badge' };
	if (field.metaType) attrs['data-meta-type'] = field.metaType;
	if (field.metaRank) attrs['data-meta-rank'] = field.metaRank;
	if (field.sentimentMap) {
		const sentiment = field.sentimentMap[value];
		if (sentiment) attrs['data-meta-sentiment'] = sentiment;
	}
	const tag = field.tag ?? 'span';
	const tagAttrs = { ...attrs };
	if (tag === 'time' && value) tagAttrs.datetime = value;

	if (options.includeLabel && field.label) {
		return makeTag(tag, tagAttrs, [
			makeTag('span', { 'data-meta-label': '' }, [field.label]),
			makeTag('span', { 'data-meta-value': '' }, [value]),
		]);
	}
	return makeTag(tag, tagAttrs, [value]);
}

/** Build a plain-text value element — typography hints via
 *  `data-meta-type`, NO `.rf-badge` class (so no chip geometry). Used by
 *  the def-list's `<dd>` and split's left slot when the field isn't
 *  sentiment-mapped. */
function buildPlainValue(resolved: ResolvedField): SerializedTag {
	const { field, value } = resolved;
	const attrs: Record<string, string> = {};
	if (field.metaType) attrs['data-meta-type'] = field.metaType;
	if (field.metaRank) attrs['data-meta-rank'] = field.metaRank;
	const tag = field.tag ?? 'span';
	if (tag === 'time' && value) attrs.datetime = value;
	return makeTag(tag, attrs, [value]);
}

/** `split` layout — eyebrow's two-slot row.
 *  Left = plain text (primary-color via CSS); right = chip when
 *  sentiment-mapped, plain text otherwise. */
function renderSplitLayout(
	position: string,
	left: ResolvedField[],
	right: ResolvedField[],
	block: string,
): SerializedTag | null {
	if (left.length === 0 && right.length === 0) return null;

	const leftChildren = left.map(f =>
		f.field.sentimentMap ? buildChip(f, { includeLabel: false }) : buildPlainValue(f),
	);
	const rightChildren = right.map(f =>
		f.field.sentimentMap ? buildChip(f, { includeLabel: false }) : buildPlainValue(f),
	);

	// data-name drives the BEM class via applyBemClasses; don't set `class`
	// here to avoid a duplicate `rf-{block}__{position}` token.
	const wrapperAttrs: Record<string, string> = {
		'data-name': position,
		'data-zone': position,
		'data-zone-layout': 'split',
	};

	return makeTag('div', wrapperAttrs, [
		makeTag('div', { 'data-eyebrow-slot': 'left' }, leftChildren),
		makeTag('div', { 'data-eyebrow-slot': 'right' }, rightChildren),
	]);
}

/** `chip-row` layout — flowing row, every value rendered as a chip with
 *  optional inline label. */
function renderChipRowLayout(
	position: string,
	fields: ResolvedField[],
	block: string,
): SerializedTag | null {
	if (fields.length === 0) return null;

	const wrapperAttrs: Record<string, string> = {
		'data-name': position,
		'data-zone': position,
		'data-zone-layout': 'chip-row',
	};

	return makeTag('div', wrapperAttrs, fields.map(f => buildChip(f, { includeLabel: true })));
}

/** `definition-list` layout — `<dl>` with `<dt>` + `<dd>` per field.
 *  Each row wraps in `<div data-name="row">` with `display: contents`
 *  so dt/dd participate in the outer grid. Sentiment-mapped fields
 *  render the value as a chip inside `<dd>`; others render as plain
 *  text with `data-meta-type` for typography. */
function renderDefListLayout(
	position: string,
	fields: ResolvedField[],
	block: string,
): SerializedTag | null {
	if (fields.length === 0) return null;

	const wrapperAttrs: Record<string, string> = {
		'data-name': position,
		'data-zone': position,
		'data-zone-layout': 'definition-list',
	};

	const rows: RendererNode[] = fields.map(f => {
		const dt = makeTag('dt', { 'data-meta-label': '' }, [f.field.label ?? f.name]);
		let dd: SerializedTag;
		if (f.field.sentimentMap) {
			// Sentiment-mapped value renders as a chip inside the <dd>.
			dd = makeTag('dd', {}, [buildChip(f, { includeLabel: false })]);
		} else {
			// Plain text value carries data-meta-type for typography hints
			// (monospace for id, tabular-nums for quantity / temporal).
			const ddAttrs: Record<string, string> = {};
			if (f.field.metaType) ddAttrs['data-meta-type'] = f.field.metaType;
			const text = f.field.tag === 'time' && f.value
				? makeTag('time', { datetime: f.value }, [f.value])
				: f.value;
			dd = makeTag('dd', ddAttrs, [text]);
		}
		// `data-field` carries the field name so themes can target specific
		// rows (e.g. `.rf-work__metadata [data-field="assignee"] dd::before
		// { content: '@'; }`). Generic styles still target the dl + dt/dd
		// selectors per layout primitive.
		return makeTag('div', { 'data-name': 'row', 'data-field': f.name }, [dt, dd]);
	});

	return makeTag('dl', wrapperAttrs, rows);
}

/** Resolve the layout primitive for a zone. Lookup order:
 *    per-rune `zoneLayouts.{zone}` → theme-level `zoneLayouts.{zone}` →
 *    `DEFAULT_ZONE_LAYOUT[zone]` (engine fallback) → 'chip-row'. */
function resolveZoneLayout(
	zoneName: string,
	runeZoneLayouts: Record<string, LayoutPrimitive> | undefined,
	themeZoneLayouts: Record<string, LayoutPrimitive>,
): LayoutPrimitive {
	return runeZoneLayouts?.[zoneName]
		?? themeZoneLayouts[zoneName]
		?? DEFAULT_ZONE_LAYOUT[zoneName]
		?? 'chip-row';
}

/** Render a single zone via the resolved layout primitive. */
function renderZone(
	position: string,
	decl: ZoneDeclaration,
	layout: LayoutPrimitive,
	metaFields: Record<string, MetaField>,
	modifierValues: Record<string, string>,
	block: string,
): SerializedTag | null {
	if (decl === null) return null;

	if ('left' in decl && 'right' in decl) {
		const left = decl.left.map(n => resolveField(n, metaFields, modifierValues))
			.filter((f): f is ResolvedField => f !== null);
		const right = decl.right.map(n => resolveField(n, metaFields, modifierValues))
			.filter((f): f is ResolvedField => f !== null);
		if (layout === 'split') {
			return renderSplitLayout(position, left, right, block);
		}
		// Flatten for non-split layouts
		const flat = [...left, ...right];
		if (layout === 'definition-list') return renderDefListLayout(position, flat, block);
		return renderChipRowLayout(position, flat, block);
	}

	if ('fields' in decl) {
		const fields = decl.fields.map(n => resolveField(n, metaFields, modifierValues))
			.filter((f): f is ResolvedField => f !== null);
		if (layout === 'split') {
			// Mismatch: flat shape → split. First field is left, rest is right.
			const [head, ...rest] = fields;
			return renderSplitLayout(position, head ? [head] : [], rest, block);
		}
		if (layout === 'definition-list') return renderDefListLayout(position, fields, block);
		return renderChipRowLayout(position, fields, block);
	}

	return null;
}

/** SPEC-079 main dispatcher — orchestrates zones + contentSlots into a
 *  child array honouring canonical render order, with header positions
 *  wrapped in an auto-derived `.rf-{block}__preamble` element. */
function assembleWithZones(
	config: RuneConfig,
	block: string,
	contentChildren: RendererNode[],
	modifierValues: Record<string, string>,
	themeZoneLayouts: Record<string, LayoutPrimitive>,
	_runeName: string,
): RendererNode[] {
	const zones = config.zones ?? {};
	const contentSlots = config.contentSlots ?? {};
	const metaFields = config.metaFields ?? {};

	// Declared positions — anything in zones (excluding nulls) OR contentSlots
	const declared = new Set<string>();
	for (const [pos, decl] of Object.entries(zones)) {
		if (decl !== null) declared.add(pos);
	}
	for (const pos of Object.keys(contentSlots)) declared.add(pos);

	// Resolve render order. Explicit `order: [...]` wins; otherwise canonical.
	let order: string[];
	if (config.order && config.order.length > 0) {
		order = config.order.filter(p => declared.has(p));
	} else {
		order = CANONICAL_POSITION_ORDER.filter(p => declared.has(p));
		// Any non-canonical declared positions (custom names without explicit `order`)
		// land at the end.
		for (const pos of declared) {
			if (!order.includes(pos)) order.push(pos);
		}
	}

	// Build elements per position. contentSlots extracts authored content
	// by data-name; zones render projected fields via layout primitive.
	let remaining = contentChildren;
	const positionElements = new Map<string, RendererNode>();

	for (const position of order) {
		const zoneDecl = zones[position];
		if (zoneDecl !== undefined) {
			const layout = resolveZoneLayout(position, config.zoneLayouts, themeZoneLayouts);
			const element = renderZone(position, zoneDecl, layout, metaFields, modifierValues, block);
			if (element) positionElements.set(position, element);
			continue;
		}
		const dataName = contentSlots[position];
		if (dataName) {
			const extracted = extractByDataName(remaining, dataName);
			if (extracted) {
				remaining = extracted.rest;
				// Annotate the authored slot with data-zone so themes can style
				// authored vs projected positions identically. Preserve the
				// original data-name so the BEM pass adds the standard class.
				const el = extracted.element;
				positionElements.set(position, {
					...el,
					attributes: { ...el.attributes, 'data-zone': position },
				});
			}
		}
	}

	// Group preamble positions (eyebrow + title + blurb + metadata) into
	// one auto-derived wrapper so themes get a single CSS hook around the
	// header region. Body and custom positions stay outside.
	const headerEls: RendererNode[] = [];
	const tail: RendererNode[] = [];
	for (const position of order) {
		const el = positionElements.get(position);
		if (!el) continue;
		if (PREAMBLE_POSITIONS.has(position)) {
			headerEls.push(el);
		} else {
			tail.push(el);
		}
	}

	const result: RendererNode[] = [];
	if (headerEls.length > 0) {
		// Preamble wrapper. The BEM pass will add `${block}__preamble`
		// class from the data-name. `data-section="preamble"` keeps theme
		// styling that targets the section role working.
		result.push(makeTag('div', { 'data-name': 'preamble', 'data-section': 'preamble' }, headerEls));
	}
	result.push(...tail);

	// Append remaining content (untagged children, meta tags) — meta tags
	// get filtered later (step 7), unmatched user content stays as-is.
	result.push(...remaining);

	return result;
}
