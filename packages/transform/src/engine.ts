import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type { ThemeConfig, RuneConfig, StructureEntry, TintDefinition, BgPresetDefinition, FramePresetDefinition, MetaField, BlockDef, LayoutEntry } from './types.js';
import { isTag, makeTag, readMeta, toKebabCase, resolveOffset, parsePlacement, findNodeByDataName, findMediaZone } from './helpers.js';
import { mergeRuneConfig } from './merge.js';
import { DEFAULT_READING, type ReadingRegister } from './reading.js';
import { createLocaleContext, resolveLocaleString, DEFAULT_LOCALE, type LocaleContext } from './i18n.js';
import { ORDERED_FACETS, FACET_ATTRIBUTES, runFacets, runPostAssemble, WarningCollector } from './facets/index.js';
import type { FacetWarning } from './facets/index.js';

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

/** Parse an ISO 8601 duration (`PT1H30M`) into `{ hours, minutes, seconds }`. */
function parseIsoDuration(iso: string): { hours?: number; minutes?: number; seconds?: number } | null {
	const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!m) return null;
	const out: { hours?: number; minutes?: number; seconds?: number } = {};
	if (m[1]) out.hours = parseInt(m[1], 10);
	if (m[2]) out.minutes = parseInt(m[2], 10);
	if (m[3]) out.seconds = parseInt(m[3], 10);
	return out;
}

/**
 * SPEC-035 — locale-aware ISO-8601 duration formatting. For English (or when
 * `Intl.DurationFormat` is unavailable) it returns the compact `5h 30m` form so
 * zero-config output is byte-identical; for other locales it uses
 * `Intl.DurationFormat` (`5 Std. 30 Min.`).
 */
function formatDurationLocale(iso: string, locale: LocaleContext | undefined): string {
	const compact = transforms.duration(iso);
	if (!locale || locale.locale === DEFAULT_LOCALE) return compact;
	const DF = (Intl as unknown as { DurationFormat?: any }).DurationFormat;
	if (typeof DF !== 'function') return compact;
	const parsed = parseIsoDuration(iso);
	if (!parsed) return compact;
	try {
		return new DF(locale.locale, { style: 'short' }).format(parsed);
	} catch {
		return compact;
	}
}

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
	const { prefix, runes, icons = {}, tints = {}, backgrounds = {}, frames = {} } = config;

	// SPEC-035 — construct the render-scoped LocaleContext once, from the resolved
	// config (locale + already-merged `strings` dictionary). Threaded explicitly
	// into the label renderers; never stored as module-global state (the
	// forward-compatibility constraint for future multi-locale builds).
	const locale = createLocaleContext(config.locale, config.strings);

	// Build lowercase → config-key map for case-insensitive rune lookup
	const runeKeyMap = new Map(Object.keys(runes).map(k => [toKebabCase(k), k]));

	// WORK-524 — diagnostics dedupe per build, not per process. Scoped here so a
	// dev-server rebuild re-reports rather than falling silent after the first
	// occurrence and never mentioning it again.
	const warnings = new WarningCollector();

	function identityTransform(tree: RendererNode, parentRune?: string): RendererNode {
		if (tree === null || tree === undefined) return tree;
		if (typeof tree === 'string' || typeof tree === 'number') return tree;
		if (Array.isArray(tree)) return tree.map(n => identityTransform(n, parentRune));
		if (!isTag(tree)) return tree;

		// SPEC-035 Zone 2 — programmatic text opt-in: a `data-i18n="{key}"`
		// attribute on a leaf label (emitted by a schema transform / postTransform
		// that has no locale access, e.g. budget totals) is resolved here against
		// the locale table, using the existing text as the English fallback, then
		// the marker is stripped. Zero-config → text unchanged, attribute removed.
		const i18nKey = tree.attributes?.['data-i18n'];
		if (i18nKey) {
			const { ['data-i18n']: _drop, ...restAttrs } = tree.attributes;
			const fallback = (tree.children.find(c => typeof c === 'string') as string | undefined) ?? '';
			return { ...tree, attributes: restAttrs, children: [resolveLocaleString(locale, i18nKey, fallback)] };
		}

		const dataRune = tree.attributes?.['data-rune'];
		const configKey = dataRune ? runeKeyMap.get(dataRune) : undefined;
		if (configKey) {
			return transformRune(tree, runes[configKey], prefix, icons, tints, backgrounds, frames, runes, runeKeyMap, identityTransform, locale, warnings, parentRune);
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

/** SPEC-091 — resolve modifier-keyed config variants for one rune instance.
 *  For each variant axis (a declared modifier name) the engine resolves the
 *  instance's value the same way the modifier loop does (field/attribute +
 *  `default`), and merges any matching `variants[axis][value]` delta over the
 *  base config — in `variants` declaration order — before any structure is
 *  read. Returns the effective config; a rune with no variants is untouched. */
function resolveVariantConfig(
	config: RuneConfig,
	tag: SerializedTag,
	fields: Record<string, unknown>,
): RuneConfig {
	if (!config.variants) return config;
	let effective = config;
	for (const [axis, byValue] of Object.entries(config.variants)) {
		const mod = config.modifiers?.[axis];
		// Axes are validated to be declared modifiers at config load; stay
		// defensive at runtime and skip an axis with no modifier source.
		if (!mod) continue;
		const value = mod.source === 'attribute'
			? (tag.attributes[axis] ?? mod.default)
			: readField(tag, fields, axis, mod.default);
		if (value && byValue[value]) {
			effective = mergeRuneConfig(effective, byValue[value]);
		}
	}
	return effective;
}


/** Find the first descendant tag carrying `data-name === name`. */
const findByName = findNodeByDataName;

/** SPEC-101 — collect every `rf-sandbox` element in a subtree (cover-backdrop
 *  handling: auto-fill + activation validation). */
function findSandboxes(node: SerializedTag): SerializedTag[] {
	const out: SerializedTag[] = [];
	const scan = (n: RendererNode): void => {
		if (!isTag(n)) return;
		if (n.name === 'rf-sandbox') out.push(n);
		for (const c of n.children ?? []) scan(c);
	};
	scan(node);
	return out;
}

/** SPEC-090 — find the first descendant rune flagged `interactive` (a
 *  behaviour-driven guest). Returns its `data-rune` name, or undefined. */
function findInteractiveGuest(
	node: SerializedTag,
	allRunes: Record<string, RuneConfig>,
	runeKeyMap: Map<string, string>,
): string | undefined {
	const scan = (n: RendererNode): string | undefined => {
		if (!isTag(n)) return undefined;
		const rune = n.attributes?.['data-rune'];
		if (rune) {
			const key = runeKeyMap.get(rune);
			if (key && allRunes[key]?.interactive) return rune;
		}
		for (const c of n.children ?? []) {
			const hit = scan(c);
			if (hit) return hit;
		}
		return undefined;
	};
	for (const c of node.children ?? []) {
		const hit = scan(c);
		if (hit) return hit;
	}
	return undefined;
}

/** SPEC-090 — an interactive guest in a linked tile: its controls are inert
 *  under the whole-tile link. Informative, not fatal. */
function interactiveGuestInLink(container: string, guest: string): FacetWarning {
	return {
		code: 'interactive-guest-in-link',
		dedupeKey: `interactive-guest:${container}:${guest}`,
		message: `[refrakt] interactive guest \`${guest}\` in a linked \`${container}\` — its controls are inert under the whole-tile link. Drop \`href\` or the interactivity.`,
	};
}

/** SPEC-101 — a non-eager sandbox serving as a cover backdrop: the posture
 *  demotion makes the backdrop inert, so `visible` is a no-op above the fold
 *  and `click`'s Run control is unreachable. Informative. */
function nonEagerCoverSandbox(container: string, activation: string): FacetWarning {
	return {
		code: 'non-eager-cover-sandbox',
		dedupeKey: `cover-sandbox:${container}:${activation}`,
		message: `[refrakt] \`activation="${activation}"\` on a sandbox serving as a \`${container}\` cover backdrop — the backdrop is inert (pointer-events: none), so the poster/Run affordance is unreachable. Drop \`activation\` (eager is the background mode).`,
	};
}

/** Apply BEM classes and structural enhancements to a rune tag */
function transformRune(
	tag: SerializedTag,
	config: RuneConfig,
	prefix: string,
	icons: Record<string, Record<string, string>>,
	tints: Record<string, TintDefinition>,
	backgrounds: Record<string, BgPresetDefinition>,
	frames: Record<string, FramePresetDefinition>,
	allRunes: Record<string, RuneConfig>,
	runeKeyMap: Map<string, string>,
	recurse: (node: RendererNode, parentRune?: string) => RendererNode,
	locale: LocaleContext,
	warnings: WarningCollector,
	parentRune?: string
): SerializedTag {
	const block = `${prefix}-${config.block}`;
	const dataRune = tag.attributes?.['data-rune'];

	// SPEC-084 (WORK-337) — validate the self-declared hard nesting requirement.
	// A rune that opts in via `requiresParent` must have that parent as its
	// nearest ancestor rune; otherwise its output is broken/meaningless.
	if (config.requiresParent && config.requiresParent !== '*') {
		const requiredRune = toKebabCase(config.requiresParent);
		if (parentRune !== requiredRune) {
			warnings.emit(requiresParentViolation(dataRune ?? config.block, config.requiresParent, parentRune));
		}
	}

	// SPEC-082 (WORK-322): the typed field-data channel. The engine reads
	// modifier / metaField values from `data-rune-fields` (preferred), falling
	// back per-field to the legacy `<meta data-field>` children. Both channels
	// carry the same values (WORK-321 dual-emit), so output is unchanged.
	const fields = parseFields(tag.attributes['data-rune-fields']);

	// SPEC-091 — apply modifier-keyed config variants before anything reads the
	// config, so the rest of the transform sees the variant-merged structure.
	config = resolveVariantConfig(config, tag, fields);

	const modifierClasses: string[] = [];
	const modifierValues: Record<string, string> = {};

	// Facet pass (SPEC pending) — universal axes resolved by the facet registry
	// instead of inline here. Currently `elevation` and `prominence`; the
	// remaining axes above and below still resolve inline. Registry order
	// matches the order these axes were resolved in when inline, so
	// `modifierValues` key insertion order — and thus attribute order in the
	// output — is unchanged.
	// The parent's resolved config, for the one axis that inherits from it
	// (`density` reads `childDensity`).
	const parentConfigKey = parentRune ? runeKeyMap.get(parentRune) : undefined;
	const facetInput = {
		tag, config, block, rune: dataRune ?? block, parentRune,
		parentConfig: parentConfigKey ? allRunes[parentConfigKey] : undefined,
		fields,
		theme: { tints, backgrounds, frames },
	};
	const facetResolution = runFacets(ORDERED_FACETS, facetInput, warnings);
	Object.assign(modifierValues, facetResolution.axes);
	modifierClasses.push(...facetResolution.classes);

	// Axes whose emission point the engine owns rather than the axis channel:
	// `reading` / `dropcap` are applied to the body section during child
	// assembly, and `data-density` is unconditional and sits at a fixed position.
	const readingValue = (facetResolution.state['reading'] ?? DEFAULT_READING) as ReadingRegister;
	const dropcapValue = facetResolution.state['dropcap'] === 'true';
	const resolvedDensity = facetResolution.state['density'] ?? 'full';

	// SPEC-090 media-guest posture (below) branches on cover mode, which the
	// `cover` facet publishes as state.
	const isCover = facetResolution.state['cover'] === 'true';

	// Frame chrome (SPEC-086) and substrate fills (SPEC-087) are facets. They
	// resolve in the facet pass above and apply either to the rune root (through
	// the resolution's dataAttrs/styles) or to the media zone (through their
	// postAssemble, once the children exist).

	// 2. Store modifier values as data attributes (so components can read them even after meta removal)
	const modDataAttrs: Record<string, string> = {};
	for (const [name, value] of Object.entries(modifierValues)) {
		const kebab = name.replace(/([A-Z])/g, '-$1').toLowerCase();
		modDataAttrs[`data-${kebab}`] = value;
	}
	// Facet-supplied attributes that bypass the axis channel — including the
	// config-modifier facet's `valueMap` + `mapTarget` translations.
	Object.assign(modDataAttrs, facetResolution.dataAttrs);

	// 3. Build the class string
	const existingClass = tag.attributes.class || '';
	const bemClass = [block, ...modifierClasses, existingClass].filter(Boolean).join(' ');

	// 4. Auto-label children by tag name or property attribute (recursive)
	// SPEC-104 — drop the bg guest from the flow: it was relocated into the bg
	// layer (§1f) and must not also render among the host's content.
	// Nodes a facet relocated into a layer are dropped from the normal flow, or
	// they would render twice (SPEC-104's bg sandbox guest).
	let children = facetResolution.absorbs.length
		? tag.children.filter(c => !facetResolution.absorbs.includes(c as SerializedTag))
		: tag.children;
	if (config.autoLabel) {
		children = applyAutoLabel(children, config.autoLabel);
	}

	// 5. SPEC-080: block-and-layout assembly (metaFields + blocks + layout).
	//    Projects named metadata blocks and places them into the transform
	//    tree per `layout`. The legacy `slots + structure` shim was removed in
	//    WORK-313; the `structure`-only before/after path below survives for
	//    non-meta-projecting runes that just inject icons or badges.
	if (config.blocks || config.layout) {
		children = assembleWithBlocks(config, block, children, modifierValues, locale, warnings);
	} else if (config.structure) {
		// Legacy before/after assembly
		const prepend: RendererNode[] = [];
		const append: RendererNode[] = [];

		for (const [name, entry] of Object.entries(config.structure)) {
			const element = buildStructureElement(entry, name, modifierValues, icons, locale, config);
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

	// 5b. Prepend facet-supplied layers (before content, after structural elements)
	const beforeContent = facetResolution.layers
		.filter(l => l.placement === 'before-content')
		.map(l => l.element);
	if (beforeContent.length) {
		children = [...beforeContent, ...children];
	}

	// 6. Apply BEM element classes, section anatomy, and media slots to data-name children, then recurse once
	let enhancedChildren = children.map(child => {
		if (!isTag(child)) return recurse(child, dataRune);
		return recurse(applyBemClasses(child, block, config.sections, config.mediaSlots, config.guestFit, readingValue, dropcapValue), dataRune);
	});

	// 6b. Projection pass — declarative structural reshaping (hide → group → relocate)
	if (config.projection) {
		enhancedChildren = applyProjection(enhancedChildren, config.projection, block, config.sections, config.mediaSlots, config.guestFit, readingValue, dropcapValue);
	}

	// 6d. Media-guest interaction posture (SPEC-090). A media guest is
	// presentational by default. When the container is itself an interaction
	// target — a stretched whole-tile `href` link (a `link` child) — or the guest
	// is a `cover` backdrop, the media zone is made non-interactive
	// (`data-guest-posture="presentational"` → `pointer-events: none` in CSS, and
	// the behaviours layer skips enhancement) so the tile links reliably / the
	// overlay owns interaction. Scoped to the media zone only, so content-overlay
	// controls (body/footer links & buttons) stay interactive. A genuinely
	// interactive guest in a *linked* tile also warns (cover full-bleed widgets
	// are out of scope, so they're silently inert).
	const hasLink = !!findByName(enhancedChildren, 'link');
	if (hasLink || isCover) {
		const mediaZone = findMediaZone(enhancedChildren);
		if (mediaZone) {
			mediaZone.attributes = { ...mediaZone.attributes, 'data-guest-posture': 'presentational' };
			if (hasLink) {
				const guest = findInteractiveGuest(mediaZone, allRunes, runeKeyMap);
				if (guest) warnings.emit(interactiveGuestInLink(dataRune ?? config.block, guest));
			}
			// SPEC-101 — a sandbox serving as the cover backdrop fills the well:
			// switch an auto-height sandbox to `fill` (the element pins the iframe
			// to 100% and skips resize negotiation). An explicit numeric height is
			// the author's call and is left alone. Non-eager activation contradicts
			// an inert backdrop (the Run control is unreachable) — warn.
			if (isCover) {
				for (const sandbox of findSandboxes(mediaZone)) {
					if ((sandbox.attributes?.['data-height'] ?? 'auto') === 'auto') {
						sandbox.attributes = { ...sandbox.attributes, 'data-height': 'fill' };
					}
					const activation = sandbox.attributes?.['data-activation'];
					if (activation === 'visible' || activation === 'click') {
						warnings.emit(nonEagerCoverSandbox(dataRune ?? config.block, String(activation)));
					}
				}
			}
		}
	}

	// 7. Remove consumed meta tags (config modifiers + everything facets claimed)
	// Build a Set of kebab-cased modifier keys since data-field values are now kebab-case
	// but config.modifiers keys are camelCase
	const consumedModifierFields = config.modifiers
		? new Set(Object.keys(config.modifiers).map(k => toKebabCase(k)))
		: undefined;
	const facetConsumed = new Set(facetResolution.consumes);
	const filteredChildren = enhancedChildren.filter(child => {
		if (!isTag(child as any)) return true;
		const c = child as SerializedTag;
		if (c.name !== 'meta' || !c.attributes['data-field']) return true;
		const prop = c.attributes['data-field'];
		if (consumedModifierFields?.has(prop)) return false;
		if (facetConsumed.has(prop)) return false;
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
	// Facet styles — `content-place` and `cover` land here, in that order, so
	// cover's explicit `--cover-scrim-dir` is declared last and wins.
	for (const [prop, value] of facetResolution.styles) {
		styleParts.push(`${prop}: ${value}`);
	}
	// Second facet phase: contributions that need the assembled children.
	// `cover` flips the colour scheme on the `content` overlay here.
	runPostAssemble(ORDERED_FACETS, facetInput, facetResolution, filteredChildren, warnings);
	if (styleParts.length) {
		inlineStyle = inlineStyle
			? `${inlineStyle}; ${styleParts.join('; ')}`
			: styleParts.join('; ');
	}

	// Strip consumed universal attributes from output (they're expressed via data-* / BEM instead).
	// `data-rune-fields` (SPEC-082) is the internal field-data channel — strip it from output so
	// the dual-emit in WORK-321 stays output-neutral; the engine begins *reading* it in WORK-322.
	// Attributes consumed by the transform never reach the output: the facet
	// registry declares its own (`FACET_ATTRIBUTES`), the config-modifier facet
	// contributes the config-driven ones it claimed, and the two internal
	// channels go regardless.
	const { 'data-rune': _dr, 'data-rune-fields': _drf, ...rawPassAttrs } = tag.attributes;
	const passAttrs = Object.fromEntries(
		Object.entries(rawPassAttrs).filter(
			([k]) => !FACET_ATTRIBUTES.has(k) && !facetResolution.stripAttrs.includes(k),
		),
	);

	const result: SerializedTag = {
		...tag,
		attributes: {
			...passAttrs,
			...modDataAttrs,
			class: bemClass,
			'data-rune': dataRune,
			'data-density': resolvedDensity,
			...(config.rootAttributes || {}),
			...(inlineStyle ? { style: inlineStyle } : {}),
		},
		children: filteredChildren,
	};

	// 9. Programmatic escape hatch — runs after all declarative processing.
	// `fields` is the parsed bag (the bag attribute was stripped from `result`
	// above), so a hook can read non-modifier field values without the metas.
	if (config.postTransform) {
		return config.postTransform(result, {
			modifiers: modifierValues,
			parentType: parentRune,
			fields,
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
function applyBemClasses(child: SerializedTag, block: string, sections?: Record<string, string>, mediaSlots?: Record<string, string>, guestFit?: string, reading?: string, dropcap?: boolean): SerializedTag {
	const dataName = child.attributes['data-name'];
	if (dataName) {
		const elementClass = `${block}__${dataName}`;
		const childExistingClass = child.attributes.class || '';
		// Recursively apply BEM to nested data-name children (e.g., icon/title inside header)
		const nestedChildren = child.children.map(c => {
			if (!isTag(c)) return c;
			return applyBemClasses(c, block, sections, mediaSlots, guestFit, reading, dropcap);
		});
		const sectionRole = sections?.[dataName];
		const mediaSlot = mediaSlots?.[dataName];
		return {
			...child,
			attributes: {
				...child.attributes,
				class: [elementClass, childExistingClass].filter(Boolean).join(' '),
				...(sectionRole ? { 'data-section': sectionRole } : {}),
				// SPEC-108: refine the body section with its reading register, suppressed
				// at the `ui` default (so unmarked bodies stay byte-identical).
				...(sectionRole === 'body' && reading && reading !== DEFAULT_READING ? { 'data-reading': reading } : {}),
				...(sectionRole === 'body' && dropcap ? { 'data-dropcap': 'true' } : {}),
				...(mediaSlot ? { 'data-media': mediaSlot } : {}),
				// The chrome/containment axis (SPEC-090 sibling) rides the media
				// zone so the skin can frame or free a guest without rune-name CSS.
				...(sectionRole === 'media' ? { 'data-guest-fit': guestFit ?? 'clip' } : {}),
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
	guestFit?: string,
	reading?: string,
	dropcap?: boolean,
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
				wrapper = applyBemClasses(wrapper, block, sections, mediaSlots, guestFit, reading, dropcap);
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
/** SPEC-035 — resolve a rune label through the locale table using the
 *  auto-derived key `{scope}.{block}.{ref}` (Decision D1). An explicit
 *  `i18nKey` override pins a stable key across renames. Returns the English
 *  `label` fallback unchanged when the label is absent, no locale strings are
 *  configured, or the key is untranslated — so zero-config output is identical. */
function localizedLabel(
	locale: LocaleContext | undefined,
	config: RuneConfig | undefined,
	ref: string,
	label: string | undefined,
	override?: string,
): string | undefined {
	if (label === undefined) return undefined;
	if (!locale) return label;
	const key = override ?? `${config?.scope ?? 'core'}.${config?.block ?? ''}.${ref}`;
	return resolveLocaleString(locale, key, label);
}

/** SPEC-035 Zone 6 — resolve an enum-as-text display value through the locale
 *  table. Only values the rune *declares* in `i18nEnums` are ever substituted,
 *  and the raw value is the fallback — so zero-config English output is
 *  unchanged and non-enum data values are never touched. Key: `{scope}.{block}.{value}`. */
function localizedEnumValue(
	locale: LocaleContext | undefined,
	config: RuneConfig | undefined,
	value: string,
): string {
	if (!locale || !value || config?.i18nEnums?.[value] === undefined) return value;
	const key = `${config.scope ?? 'core'}.${config.block ?? ''}.${value}`;
	return resolveLocaleString(locale, key, value);
}

function buildStructureElement(
	entry: StructureEntry,
	name: string,
	modifierValues: Record<string, string>,
	icons: Record<string, Record<string, string>>,
	locale: LocaleContext,
	config: RuneConfig,
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
				const el = buildStructureElement(entry.repeat.filledElement, entry.repeat.filledElement.ref ?? '', modifierValues, icons, locale, config);
				if (el) children.push(el);
			} else {
				const el = buildStructureElement(entry.repeat.element, entry.repeat.element.ref ?? '', modifierValues, icons, locale, config);
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
		const rawText = modifierValues[entry.metaText] ?? '';
		// SPEC-035 Zone 6 — a declared enum value resolves through the locale
		// table (e.g. capitalized display values); the raw value is the fallback.
		let text = localizedEnumValue(locale, config, rawText);
		if (text === rawText && entry.transform && transforms[entry.transform]) {
			text = transforms[entry.transform](text);
		}
		// When label is specified, emit separate label and value child elements
		if (entry.label) {
			const labelAttrs: Record<string, string> = { 'data-meta-label': '' };
			if (entry.labelHidden) labelAttrs['data-meta-label-hidden'] = '';
			const labelText = localizedLabel(locale, config, entry.ref ?? name, entry.label, entry.i18nKey) ?? entry.label;
			const labelEl = makeTag('span', labelAttrs, [labelText]);
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
				const built = buildStructureElement(child, child.ref ?? '', modifierValues, icons, locale, config);
				if (built) elementChildren.push(built);
			}
		}
	}

	return makeTag(entry.tag, baseAttrs, elementChildren);
}

// ─── Field resolution + value rendering ─────────────────────────────────

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
	locale?: LocaleContext,
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
	if (field.transform === 'duration') {
		// SPEC-035 — locale-aware duration; English keeps the compact form.
		value = formatDurationLocale(value, locale);
	} else if (field.transform && transforms[field.transform]) {
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
	locale?: LocaleContext,
	config?: RuneConfig,
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
	// `datetime` keeps the raw value; only the *displayed* text is enum-localized.
	const displayValue = localizedEnumValue(locale, config, value);

	if (options.includeLabel && field.label) {
		const label = localizedLabel(locale, config, resolved.name, field.label, field.i18nKey) ?? field.label;
		return makeTag(tag, tagAttrs, [
			makeTag('span', { 'data-meta-label': '' }, [label]),
			makeTag('span', { 'data-meta-value': '' }, [displayValue]),
		]);
	}
	return makeTag(tag, tagAttrs, [displayValue]);
}

/** Build a plain-text value element — typography hints via
 *  `data-meta-type`, NO `.rf-badge` class (so no chip geometry). Used by
 *  the def-list's `<dd>` and split's left slot when the field isn't
 *  sentiment-mapped. */
function buildPlainValue(resolved: ResolvedField, locale?: LocaleContext, config?: RuneConfig): SerializedTag {
	const { field, value } = resolved;
	const attrs: Record<string, string> = {};
	if (field.metaType) attrs['data-meta-type'] = field.metaType;
	const tag = field.tag ?? 'span';
	if (tag === 'time' && value) attrs.datetime = value;
	return makeTag(tag, attrs, [localizedEnumValue(locale, config, value)]);
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
function buildLinkValue(f: ResolvedField, locale?: LocaleContext, config?: RuneConfig): SerializedTag {
	const text = localizedLabel(locale, config, f.name, f.field.label, f.field.i18nKey) ?? f.value;
	return makeTag('a', {
		href: f.href ?? '',
		'data-meta-type': 'link',
	}, [text]);
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
function buildIconValue(f: ResolvedField, locale?: LocaleContext, config?: RuneConfig): SerializedTag {
	const group = f.field.icon!.group;
	const attrs: Record<string, string> = {};
	if (f.field.metaType) attrs['data-meta-type'] = f.field.metaType;
	// `data-icon` keeps the raw value (glyph selector); the visible text uses the
	// label if present, else the enum-localized value (Zone 6, e.g. hint titles).
	const text = localizedLabel(locale, config, f.name, f.field.label, f.field.i18nKey)
		?? localizedEnumValue(locale, config, f.value);
	return makeTag(f.field.tag ?? 'span', attrs, [
		makeTag('span', { 'data-icon-group': group, 'data-icon': f.value }, []),
		makeTag('span', { 'data-meta-value': '' }, [text]),
	]);
}

/** Render one resolved field in its intrinsic shape (link > rating > icon >
 *  chip > bare). */
function renderBlockValue(
	f: ResolvedField,
	includeLabel = false,
	locale?: LocaleContext,
	config?: RuneConfig,
): SerializedTag {
	if (f.field.href) return buildLinkValue(f, locale, config);
	if (f.field.rating) return buildRatingValue(f);
	if (f.field.icon) return buildIconValue(f, locale, config);
	return fieldRendersAsChip(f.field)
		? buildChip(f, { includeLabel }, locale, config)
		: buildPlainValue(f, locale, config);
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
	locale?: LocaleContext,
	config?: RuneConfig,
): SerializedTag | null {
	if (items.length === 0) return null;

	const children: RendererNode[] = [];
	for (const { resolved, align } of items) {
		const els: SerializedTag[] = resolved.field.splitOn && resolved.value
			? splitFieldValue(resolved).map(part => renderBlockValue({ ...resolved, value: part }, false, locale, config))
			: [renderBlockValue(resolved, false, locale, config)];
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
	locale?: LocaleContext,
	config?: RuneConfig,
): SerializedTag | null {
	if (fields.length === 0) return null;

	const rows: RendererNode[] = fields.map(f => {
		const dtText = localizedLabel(locale, config, f.name, f.field.label ?? f.name, f.field.i18nKey) ?? f.name;
		const dt = makeTag('dt', { 'data-meta-label': '' }, [dtText]);
		let dd: SerializedTag;
		if (f.field.splitOn && f.value) {
			const items = splitFieldValue(f).map(part =>
				renderBlockValue({ ...f, value: part }, false, locale, config),
			);
			dd = makeTag('dd', { 'data-multi-value': '' }, items);
		} else if (fieldRendersAsChip(f.field)) {
			dd = makeTag('dd', {}, [buildChip(f, { includeLabel: false }, locale, config)]);
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
	locale: LocaleContext,
	warnings: WarningCollector,
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
			const resolved = resolveField(fieldName, metaFields, modifierValues, locale);
			if (resolved) items.push({ resolved, align });
		}
		if (items.length === 0) return null;
		if (def.layout === 'bar') return renderBarLayout(name, items, def.wrap ?? true, locale, config);
		return renderDefListBlock(name, items.map(i => i.resolved), locale, config);
	};

	// No `layout` → render the transform tree verbatim (no projection).
	if (Object.keys(layout).length === 0) return contentChildren;
	const ctx: LayoutCtx = { layout, renderBlock, warnings };

	// `root` present → resolve the whole skeleton recursively, pulling flat
	// transform slots into (possibly created) containers; unlisted slots append.
	const rootEntry = layout.root;
	if (rootEntry) {
		const rootOrder = Array.isArray(rootEntry) ? rootEntry : rootEntry.children;
		const byName = mapDataNames(contentChildren);
		const consumed = new Set<string>();
		const placed = placeNames(rootOrder, byName, consumed, ctx, ['root']);
		const rest = contentChildren.filter(c =>
			!(isTag(c) && c.attributes['data-name'] && consumed.has(c.attributes['data-name'])),
		);
		return [...placed, ...rest];
	}

	// No `root` → reorder existing containers in place (backward-compatible:
	// the transform built the container; the engine reorders / injects into it).
	let result = contentChildren;
	for (const [key, entry] of Object.entries(layout)) {
		const childOrder = Array.isArray(entry) ? entry : entry.children;
		result = updateContainerByName(result, key, children => {
			const byName = mapDataNames(children);
			const consumed = new Set<string>();
			const placed = placeNames(childOrder, byName, consumed, ctx, [key]);
			const rest = children.filter(c =>
				!(isTag(c) && c.attributes['data-name'] && consumed.has(c.attributes['data-name'])),
			);
			return [...placed, ...rest];
		});
	}
	return result;
}

interface LayoutCtx {
	layout: Record<string, LayoutEntry>;
	renderBlock: (name: string) => SerializedTag | null;
	warnings: WarningCollector;
}

function layoutCycle(name: string): FacetWarning {
	return {
		code: 'layout-cycle',
		dedupeKey: `layout-cycle:${name}`,
		message: `[refrakt] layout reference cycle at "${name}" — skipping to break the loop.`,
	};
}

/** SPEC-084 (WORK-337) — runes whose output is structurally meaningless without
 *  their parent (kebab `data-rune`). A misplacement of these is an *error*; any
 *  other `requiresParent` violation is a *warning* (renders, but off-contract). */
const STRUCTURAL_CHILDREN = new Set<string>([
	'accordion-item', 'tab', 'tab-panel', 'breadcrumb-item', 'juxtapose-panel',
	'bento-cell', 'definition', 'step', 'tier', 'map-pin',
	'itinerary-day', 'itinerary-stop',
]);
/** Report a `requiresParent` violation once per (rune, actual-parent). A
 *  structural child misplaced is an error; any other violation renders but is
 *  off-contract, so it warns. */
function requiresParentViolation(rune: string, required: string, actual: string | undefined): FacetWarning {
	const where = actual ? `nested directly in \`${actual}\`` : 'at the top level';
	return {
		code: 'requires-parent',
		dedupeKey: `requires-parent:${rune}<${actual ?? ''}`,
		severity: STRUCTURAL_CHILDREN.has(rune) ? 'error' : 'warn',
		message: `[refrakt] \`${rune}\` requires parent \`${toKebabCase(required)}\` — found ${where}.`,
	};
}

/** Map a child array to a `data-name` → node index (tags carrying a data-name). */
function mapDataNames(children: RendererNode[]): Map<string, SerializedTag> {
	const m = new Map<string, SerializedTag>();
	for (const c of children) {
		if (isTag(c) && c.attributes['data-name']) m.set(c.attributes['data-name'], c);
	}
	return m;
}

/** Resolve an ordered list of names into nodes, pulling from `byName` and
 *  recording consumed names. Each name resolves, in order:
 *   1. a `layout` entry with a `tag` → create a wrapper element and recurse
 *      (its children pull from the same flat pool);
 *   2. a `layout` entry without a `tag` → reorder the existing container of that
 *      name in place;
 *   3. a projected block;
 *   4. a transform node carrying that `data-name`;
 *   5. otherwise skip.
 *  A name is placed at most once (diamond); reference cycles warn and skip. */
function placeNames(
	order: string[],
	byName: Map<string, SerializedTag>,
	consumed: Set<string>,
	ctx: LayoutCtx,
	ancestors: string[],
): RendererNode[] {
	const out: RendererNode[] = [];
	for (const name of order) {
		if (consumed.has(name)) continue;
		if (ancestors.includes(name)) { ctx.warnings.emit(layoutCycle(name)); continue; }

		const entry = ctx.layout[name];

		// 1. layout entry with a tag → create a wrapper, recurse into the pool
		if (entry && !Array.isArray(entry) && entry.tag) {
			consumed.add(name);
			const kids = placeNames(entry.children, byName, consumed, ctx, [...ancestors, name]);
			out.push(makeTag(entry.tag, { 'data-name': name, ...(entry.attrs ?? {}) }, kids));
			continue;
		}

		// 2. layout entry without a tag → reorder the existing container in place
		if (entry) {
			const existing = byName.get(name);
			if (existing) {
				consumed.add(name);
				const childOrder = Array.isArray(entry) ? entry : entry.children;
				const innerByName = mapDataNames(existing.children);
				const innerConsumed = new Set<string>();
				const innerPlaced = placeNames(childOrder, innerByName, innerConsumed, ctx, [...ancestors, name]);
				const innerRest = existing.children.filter(c =>
					!(isTag(c) && c.attributes['data-name'] && innerConsumed.has(c.attributes['data-name'])),
				);
				out.push({ ...existing, children: [...innerPlaced, ...innerRest] });
				continue;
			}
			// no existing container — fall through to block / node
		}

		// 3. projected block
		const block = ctx.renderBlock(name);
		if (block) { consumed.add(name); out.push(block); continue; }

		// 4. transform node by data-name
		const node = byName.get(name);
		if (node) { consumed.add(name); out.push(node); continue; }

		// 5. unresolved → skip
	}
	return out;
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
