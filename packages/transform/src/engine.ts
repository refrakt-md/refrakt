import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type { ThemeConfig, RuneConfig, StructureEntry, TintDefinition, BgPresetDefinition, MetaField, BlockDef } from './types.js';
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
	const { prefix, runes, icons = {}, tints = {}, backgrounds = {} } = config;

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
			return transformRune(tree, runes[configKey], prefix, icons, tints, backgrounds, runes, runeKeyMap, identityTransform, configKey, parentRune);
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

/** Parse the SPEC-082 `data-rune-fields` channel (a JSON object) once per node.
 *  Malformed / absent → empty. */
function parseFields(raw: unknown): Record<string, unknown> {
	if (typeof raw !== 'string' || raw.length === 0) return {};
	try {
		const v = JSON.parse(raw);
		return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
	} catch {
		return {};
	}
}

/** Read a modifier/field value: prefer the parsed `fields` bag (a scalar there
 *  equals the legacy meta's `content`, so the result is unchanged), falling back
 *  to the `<meta data-field>` child when the key is absent or non-scalar. */
function readField(
	tag: SerializedTag,
	fields: Record<string, unknown>,
	name: string,
	def?: string,
): string | undefined {
	const v = fields[name];
	if (v !== undefined && v !== null && typeof v !== 'object') return v as string;
	return readMeta(tag, name, def);
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
	runeName: string,
	parentRune?: string
): SerializedTag {
	const block = `${prefix}-${config.block}`;
	const dataRune = tag.attributes?.['data-rune'];

	// SPEC-082 (WORK-322): the typed field-data channel. The engine reads
	// modifier / metaField values from `data-rune-fields` (preferred), falling
	// back per-field to the legacy `<meta data-field>` children. Both channels
	// carry the same values (WORK-321 dual-emit), so output is unchanged.
	const fields = parseFields(tag.attributes['data-rune-fields']);

	// 1. Read modifiers from the field channel, collecting resolved values
	const modifierClasses: string[] = [];
	const modifierValues: Record<string, string> = {};
	const mappedValues: Record<string, string> = {};
	const attrModifierNames: string[] = [];
	if (config.modifiers) {
		for (const [name, mod] of Object.entries(config.modifiers)) {
			if (mod.source === 'attribute') attrModifierNames.push(name);
			const value = mod.source === 'meta'
				? readField(tag, fields, name, mod.default)
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
			} else if (value === '') {
				// Present but empty (e.g. `title=""`) — record it so
				// `renderWhenEmpty` fields can tell present-empty from absent.
				// No BEM class (would be a dangling `block--`) and no mapping.
				modifierValues[name] = '';
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

	// 5. SPEC-080: block-and-layout assembly (metaFields + blocks + layout).
	//    Projects named metadata blocks and places them into the transform
	//    tree per `layout`. Takes precedence over the legacy `slots +
	//    structure` shim (removed in WORK-313).
	if (config.blocks || config.layout) {
		children = assembleWithBlocks(config, block, children, modifierValues);
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

	// Strip consumed universal attributes from output (they're expressed via data-* / BEM instead).
	// `data-rune-fields` (SPEC-082) is the internal field-data channel — strip it from output so
	// the dual-emit in WORK-321 stays output-neutral; the engine begins *reading* it in WORK-322.
	const { width: _w, spacing: _s, inset: _i, density: _d, 'data-rune': _dr, 'data-rune-fields': _drf, ...rawPassAttrs } = tag.attributes;
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
 *  Returns the removed element and the updated array, or null if not found.
 *
 *  Also looks one level deep inside any direct-child wrapper carrying
 *  `data-name="preamble"`. This lets `projection` relocate refs
 *  (`headline`, `blurb`, etc.) that the rune's schema nested inside an
 *  auto-labelled `<header data-name="preamble">` wrapper — otherwise the
 *  extraction would silently fail and the dispatcher would emit a
 *  second preamble alongside the schema's, producing duplicate wrappers
 *  in the rendered DOM. */
function extractByDataName(children: RendererNode[], name: string): { element: SerializedTag; rest: RendererNode[] } | null {
	const idx = children.findIndex(c => isTag(c) && (c as SerializedTag).attributes?.['data-name'] === name);
	if (idx !== -1) {
		const element = children[idx] as SerializedTag;
		const rest = [...children.slice(0, idx), ...children.slice(idx + 1)];
		return { element, rest };
	}
	// Fall back: look inside any direct-child preamble wrapper.
	for (let i = 0; i < children.length; i++) {
		const c = children[i];
		if (!isTag(c)) continue;
		const wrapper = c as SerializedTag;
		if (wrapper.attributes?.['data-name'] !== 'preamble') continue;
		const inner = extractByDataName(wrapper.children, name);
		if (!inner) continue;
		const newRest = [...children];
		if (inner.rest.length === 0) {
			// Wrapper now empty — drop it so we don't emit a hollow
			// preamble alongside the dispatcher's auto-derived one.
			newRest.splice(i, 1);
		} else {
			newRest[i] = { ...wrapper, children: inner.rest };
		}
		return { element: inner.element, rest: newRest };
	}
	return null;
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

// ─── Field resolution + value rendering ─────────────────────────────────

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
		`Migrate to the SPEC-080 \`metaFields\` + \`blocks\` + \`layout\` model. ` +
		`Legacy configs continue to render via the backwards-compat shim ` +
		`(removed in WORK-313).`,
	);
}

/** A field resolved against the modifier values — ready for layout rendering. */
interface ResolvedField {
	name: string;
	value: string;
	field: MetaField;
	/** Resolved link URL when the field declares `href` (a modifier name). */
	href?: string;
	/** Resolved rating maximum when the field declares `rating` (default 5). */
	ratingTotal?: string;
}

function resolveField(
	name: string,
	metaFields: Record<string, MetaField>,
	modifierValues: Record<string, string>,
): ResolvedField | null {
	const field = metaFields[name];
	if (!field) return null;
	if (field.condition) {
		const condVal = modifierValues[field.condition];
		// `renderWhenEmpty` gates on presence (defined) instead of truthiness.
		const present = field.renderWhenEmpty ? condVal !== undefined : !!condVal;
		if (!present) return null;
	}
	let value = modifierValues[name] ?? '';
	if (!value && field.condition && !field.renderWhenEmpty) return null;
	if (field.transform && transforms[field.transform]) {
		value = transforms[field.transform](value);
	}
	const href = field.href ? (modifierValues[field.href] ?? '') : undefined;
	if (field.href && !href) return null;
	const ratingTotal = field.rating
		? (modifierValues[field.rating.total ?? ''] || '5')
		: undefined;
	return { name, value, field, href, ratingTotal };
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
	const tag = field.tag ?? 'span';
	if (tag === 'time' && value) attrs.datetime = value;
	return makeTag(tag, attrs, [value]);
}

/** Split a field's value into trimmed non-empty parts using
 *  `field.splitOn`. Used by layouts that fan multi-value fields out
 *  into one chip per item. */
function splitFieldValue(resolved: ResolvedField): string[] {
	const sep = resolved.field.splitOn;
	if (!sep || !resolved.value) return [resolved.value].filter(Boolean);
	return resolved.value.split(sep).map(s => s.trim()).filter(Boolean);
}

// ─── SPEC-080: block-and-layout assembly ──────────────────────────────────

/** metaTypes that render as a chip (`.rf-badge`). Everything else — `id`,
 *  `quantity`, `temporal`, `code`, or no metaType — renders as bare inline
 *  text. Shape is intrinsic to the field, not the layout primitive. */
const CHIP_METATYPES = new Set(['status', 'category', 'tag']);

function fieldRendersAsChip(field: MetaField): boolean {
	return field.metaType !== undefined && CHIP_METATYPES.has(field.metaType);
}

/** A resolved field plus its optional `bar` alignment. */
interface BarItem {
	resolved: ResolvedField;
	align?: 'start' | 'end';
}

/** Build a link value — `<a href>` carrying the field's label (or value) as
 *  text, bare (no chip). `data-meta-type="link"` for theme typography. */
function buildLinkValue(f: ResolvedField): SerializedTag {
	return makeTag('a', {
		href: f.href ?? '',
		'data-meta-type': 'link',
	}, [f.field.label ?? f.value]);
}

/** Build a rating widget — `total` mark elements, the first `value` filled.
 *  Bare (no chip); CSS draws the marks (stars, dots) via `data-filled`. */
function buildRatingValue(f: ResolvedField): SerializedTag {
	const filled = Math.max(0, parseInt(f.value, 10) || 0);
	const total = Math.max(0, parseInt(f.ratingTotal ?? '5', 10) || 5);
	const marks: RendererNode[] = [];
	for (let i = 0; i < total; i++) {
		marks.push(makeTag('span', { 'data-filled': i < filled ? 'true' : 'false' }, []));
	}
	return makeTag('span', { 'data-meta-type': 'rating' }, marks);
}

/** Build an icon-decorated value — a leading icon element (glyph selected
 *  by the field's value via `data-icon-group` + `data-icon`) followed by the
 *  value text. Bare (no chip); CSS draws the glyph via `mask-image`. */
function buildIconValue(f: ResolvedField): SerializedTag {
	const group = f.field.icon!.group;
	const attrs: Record<string, string> = {};
	if (f.field.metaType) attrs['data-meta-type'] = f.field.metaType;
	return makeTag(f.field.tag ?? 'span', attrs, [
		makeTag('span', { 'data-icon-group': group, 'data-icon': f.value }, []),
		makeTag('span', { 'data-meta-value': '' }, [f.field.label ?? f.value]),
	]);
}

/** Render one resolved field in its intrinsic shape (link > rating > icon >
 *  chip > bare). */
function renderBlockValue(f: ResolvedField, includeLabel = false): SerializedTag {
	if (f.field.href) return buildLinkValue(f);
	if (f.field.rating) return buildRatingValue(f);
	if (f.field.icon) return buildIconValue(f);
	return fieldRendersAsChip(f.field)
		? buildChip(f, { includeLabel })
		: buildPlainValue(f);
}

/** `bar` layout — a horizontal flex row of fields, each in its intrinsic
 *  shape. `align: 'end'` tags a field so the shared
 *  `[data-zone-layout="bar"] [data-align="end"] { margin-left: auto }` rule
 *  pushes it (and everything after) to the right. Unlabelled (eyebrow-style);
 *  labelled rows belong in `definition-list`. */
function renderBarLayout(
	blockName: string,
	items: BarItem[],
	wrap: boolean,
): SerializedTag | null {
	if (items.length === 0) return null;

	const children: RendererNode[] = [];
	for (const { resolved, align } of items) {
		const els: SerializedTag[] = resolved.field.splitOn && resolved.value
			? splitFieldValue(resolved).map(part => renderBlockValue({ ...resolved, value: part }))
			: [renderBlockValue(resolved)];
		if (align === 'end' && els.length > 0) {
			els[0] = { ...els[0], attributes: { ...els[0].attributes, 'data-align': 'end' } };
		}
		children.push(...els);
	}

	const attrs: Record<string, string> = {
		'data-name': blockName,
		'data-zone': blockName,
		'data-zone-layout': 'bar',
	};
	if (wrap === false) attrs['data-wrap'] = 'false';
	return makeTag('div', attrs, children);
}

/** `definition-list` block — labelled `<dt>`/`<dd>` pairs, with the dd value
 *  in its intrinsic shape. Mirrors the legacy def-list DOM but selects
 *  chip-vs-bare from the field's metaType rather than `sentimentMap`. */
function renderDefListBlock(
	blockName: string,
	fields: ResolvedField[],
): SerializedTag | null {
	if (fields.length === 0) return null;

	const rows: RendererNode[] = fields.map(f => {
		const dt = makeTag('dt', { 'data-meta-label': '' }, [f.field.label ?? f.name]);
		let dd: SerializedTag;
		if (f.field.splitOn && f.value) {
			const items = splitFieldValue(f).map(part =>
				renderBlockValue({ ...f, value: part }),
			);
			dd = makeTag('dd', { 'data-multi-value': '' }, items);
		} else if (fieldRendersAsChip(f.field)) {
			dd = makeTag('dd', {}, [buildChip(f, { includeLabel: false })]);
		} else {
			const ddAttrs: Record<string, string> = {};
			if (f.field.metaType) ddAttrs['data-meta-type'] = f.field.metaType;
			const text = f.field.tag === 'time' && f.value
				? makeTag('time', { datetime: f.value }, [f.value])
				: f.value;
			dd = makeTag('dd', ddAttrs, [text]);
		}
		return makeTag('div', { 'data-name': 'row', 'data-field': f.name }, [dt, dd]);
	});

	return makeTag('dl', {
		'data-name': blockName,
		'data-zone': blockName,
		'data-zone-layout': 'definition-list',
	}, rows);
}

/** SPEC-080 main assembler — projects named metadata blocks and places them,
 *  plus the rune's own transform blocks, into the tree per `layout`. */
function assembleWithBlocks(
	config: RuneConfig,
	_block: string,
	contentChildren: RendererNode[],
	modifierValues: Record<string, string>,
): RendererNode[] {
	const blocks = config.blocks ?? {};
	const layout = config.layout ?? {};
	const metaFields = config.metaFields ?? {};

	/** Render a named metadata block on demand; null if undefined or empty. */
	const renderBlock = (name: string): SerializedTag | null => {
		const def: BlockDef | undefined = blocks[name];
		if (!def) return null;
		const items: BarItem[] = [];
		for (const spec of def.fields) {
			const fieldName = typeof spec === 'string' ? spec : spec.field;
			const align = typeof spec === 'string' ? undefined : spec.align;
			const resolved = resolveField(fieldName, metaFields, modifierValues);
			if (resolved) items.push({ resolved, align });
		}
		if (items.length === 0) return null;
		if (def.layout === 'bar') return renderBarLayout(name, items, def.wrap ?? true);
		return renderDefListBlock(name, items.map(i => i.resolved));
	};

	// No `layout` → render the transform tree verbatim (no projection).
	if (Object.keys(layout).length === 0) return contentChildren;

	// Compose the rune root first (reserved `root` key), then named containers.
	let result = layout.root
		? composeContainer(contentChildren, layout.root, renderBlock)
		: contentChildren;

	for (const [key, order] of Object.entries(layout)) {
		if (key === 'root') continue;
		result = updateContainerByName(result, key, children =>
			composeContainer(children, order, renderBlock),
		);
	}
	return result;
}

/** Reorder + inject blocks within one container's children per an ordered
 *  list of block names. Transform children are placed by `data-name` where
 *  the list names them; projected blocks are rendered in place; names absent
 *  from both are skipped; transform children the list didn't name append in
 *  their original order (never dropped). */
function composeContainer(
	children: RendererNode[],
	order: string[],
	renderBlock: (name: string) => SerializedTag | null,
): RendererNode[] {
	const byName = new Map<string, RendererNode>();
	for (const c of children) {
		if (isTag(c) && c.attributes['data-name']) byName.set(c.attributes['data-name'], c);
	}
	const named = new Set(order);

	const result: RendererNode[] = [];
	for (const name of order) {
		const existing = byName.get(name);
		if (existing) {
			result.push(existing);
		} else {
			const projected = renderBlock(name);
			if (projected) result.push(projected);
		}
	}
	// Append unlisted transform children (incl. meta tags / untagged nodes).
	for (const c of children) {
		const dn = isTag(c) ? c.attributes['data-name'] : undefined;
		if (dn && named.has(dn)) continue;
		result.push(c);
	}
	return result;
}

/** Immutably replace the children of the first descendant carrying
 *  `data-name === name`. Leaves the tree unchanged if no such element. */
function updateContainerByName(
	children: RendererNode[],
	name: string,
	fn: (children: RendererNode[]) => RendererNode[],
): RendererNode[] {
	let done = false;
	const walk = (nodes: RendererNode[]): RendererNode[] =>
		nodes.map(n => {
			if (done || !isTag(n)) return n;
			if (n.attributes['data-name'] === name) {
				done = true;
				return { ...n, children: fn(n.children) };
			}
			return { ...n, children: walk(n.children) };
		});
	return walk(children);
}
