import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type { ThemeConfig, RuneConfig, StructureEntry, TintDefinition, BgPresetDefinition, FramePresetDefinition, MetaField, BlockDef, LayoutEntry } from './types.js';
import { isTag, makeTag, readMeta, toKebabCase, resolveOffset, parsePlacement } from './helpers.js';
import { mergeRuneConfig } from './merge.js';
import { resolveReading, DEFAULT_READING, READING_CAPABILITIES } from './reading.js';
import { createLocaleContext, type LocaleContext } from './i18n.js';

/** The 6 tint colour tokens */
/** Tint token names per SPEC-053 vocabulary alignment. Each maps to a
 *  matching `--rf-color-*` token via the same dot-to-dash rule the token
 *  contract uses. See `TintTokens` in `./types.ts` for the field-to-token
 *  mapping table. */
const TINT_TOKENS = ['bg', 'surface', 'text', 'muted', 'primary', 'border'] as const;

/** SPEC-107 — `elevation` is the chrome/depth axis: an ordered ladder
 *  (sunken|flush|flat|raised|floating|overlay). The old shadow-only scale
 *  (none|sm|md|lg) is a deprecated alias, resolved with a dev warning. Note
 *  `none` meant "keep the surface, drop the shadow" → `flat`, NOT `flush`
 *  (which strips the surface). `frame-shadow` keeps its own none/sm/md/lg
 *  scale and is unaffected — this only touches the rune-surface `elevation`. */
const ELEVATION_VALUES = ['sunken', 'flush', 'flat', 'raised', 'floating', 'overlay'] as const;
const ELEVATION_ALIAS: Record<string, string> = { none: 'flat', sm: 'raised', md: 'raised', lg: 'floating' };

/** Resolve an authored/default `elevation` value: pass through ladder values,
 *  map deprecated ones (with a warning). Returns undefined for falsy input. */
function resolveElevation(value: unknown): string | undefined {
	if (typeof value !== 'string' || value === '') return undefined;
	if (ELEVATION_ALIAS[value]) {
		const mapped = ELEVATION_ALIAS[value];
		console.warn(`[refrakt] elevation="${value}" is deprecated (SPEC-107) — use "${mapped}". The alias will be removed in a future minor.`);
		return mapped;
	}
	return value;
}

/** SPEC-107 — `prominence` (header emphasis) is a *family* axis: it scales a
 *  rune's page-section header, so it's only meaningful on runes that have one.
 *  A rune "has a header" when its `sections` map includes a header-ish role. */
const HEADER_SECTION_ROLES = new Set(['header', 'preamble', 'title', 'description']);
function hasPageSectionHeader(sections: Record<string, string> | undefined): boolean {
	return !!sections && Object.values(sections).some(role => HEADER_SECTION_ROLES.has(role));
}

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
	const { prefix, runes, icons = {}, tints = {}, backgrounds = {}, frames = {} } = config;

	// SPEC-035 — construct the render-scoped LocaleContext once, from the resolved
	// config (locale + already-merged `strings` dictionary). Threaded explicitly
	// into the label renderers; never stored as module-global state (the
	// forward-compatibility constraint for future multi-locale builds).
	const locale = createLocaleContext(config.locale, config.strings);

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
			return transformRune(tree, runes[configKey], prefix, icons, tints, backgrounds, frames, runes, runeKeyMap, identityTransform, locale, parentRune);
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

/** Resolved frame chrome — the data attributes + style custom-properties to
 *  land on the frame-target element, plus the meta fields to consume. */
interface FrameChrome {
	dataAttrs: Record<string, string>;
	styleParts: string[];
	metaProps: Set<string>;
}

const FRAME_FACET_META = ['frame-aspect', 'frame-displace', 'frame-displace-mode', 'frame-offset', 'frame-oversize', 'frame-place', 'frame-anchor', 'frame-overflow', 'frame-shadow'] as const;

/** SPEC-086 — read the `frame` preset + `frame-*` facet metas, resolve the
 *  preset (one `extends` level) and inline overrides, and emit the chrome
 *  contract (data-displace / data-frame-shadow / --frame-* custom props).
 *  Returns null when no frame meta is present. */
function resolveFrameChrome(tag: SerializedTag, frames: Record<string, FramePresetDefinition>, guestFit?: string): FrameChrome | null {
	const metaProps = new Set<string>();
	const read = (field: string): string | undefined => {
		const v = readMeta(tag, field);
		if (v !== undefined && v !== null) metaProps.add(field);
		return v ?? undefined;
	};

	const presetName = read('frame');
	let facets: FramePresetDefinition = {};
	if (presetName && frames[presetName]) {
		let preset = frames[presetName];
		if (preset.extends && frames[preset.extends]) {
			preset = { ...frames[preset.extends], ...preset };
		}
		facets = { ...preset };
		delete facets.extends;
	}

	const inline: Record<string, string | undefined> = {
		aspect: read('frame-aspect'),
		displace: read('frame-displace'),
		displaceMode: read('frame-displace-mode'),
		offset: read('frame-offset'),
		oversize: read('frame-oversize'),
		place: read('frame-place'),
		anchor: read('frame-anchor'),
		overflow: read('frame-overflow'),
		shadow: read('frame-shadow'),
	};
	for (const [k, v] of Object.entries(inline)) {
		if (v !== undefined) (facets as Record<string, string>)[k] = v;
	}

	if (metaProps.size === 0) return null;

	// A displaced guest defaults to its host's containment mode: a bleed host
	// (guestFit: 'bleed', e.g. hero/feature) spills, a clip host crops to a peek.
	// An explicit `frame-displace-mode=` still wins. This is the displace face of
	// the same clip-vs-bleed axis as `data-guest-fit`, so a hero no longer needs
	// `frame-displace-mode="bleed"` spelled out.
	if (facets.displace && !(facets as Record<string, string>).displaceMode && guestFit === 'bleed') {
		(facets as Record<string, string>).displaceMode = 'bleed';
	}

	const dataAttrs: Record<string, string> = {};
	const styleParts: string[] = [];
	if (presetName) dataAttrs['data-frame'] = presetName;
	if (facets.displace) dataAttrs['data-displace'] = facets.displace;
	if ((facets as Record<string, string>).displaceMode) dataAttrs['data-displace-mode'] = (facets as Record<string, string>).displaceMode;
	if (facets.shadow) dataAttrs['data-frame-shadow'] = facets.shadow;
	// `frame-overflow="bleed"` — a content-overflow policy on the media frame.
	// Only meaningful on a bleed host (the clip host's media well crops the
	// over-width); the call site strips it + warns on a clip host.
	if (facets.overflow === 'bleed') dataAttrs['data-frame-overflow'] = 'bleed';
	if (facets.aspect) styleParts.push(`--frame-aspect: ${facets.aspect}`);
	if (facets.offset) styleParts.push(`--frame-offset: ${resolveOffset(facets.offset)}`);
	if (facets.oversize) styleParts.push(`--frame-oversize: ${facets.oversize}`);
	if (facets.anchor) styleParts.push(`--frame-anchor: ${facets.anchor}`);
	if (facets.place) {
		const { x, y } = parsePlacement(facets.place);
		styleParts.push(`--frame-place-x: ${x}`, `--frame-place-y: ${y}`);
	}

	return { dataAttrs, styleParts, metaProps };
}

/** Merge chrome data attributes + style custom props onto a tag in place. */
function applyChromeToTag(tag: SerializedTag, dataAttrs: Record<string, string>, styleParts: string[]): void {
	tag.attributes = { ...tag.attributes, ...dataAttrs };
	if (styleParts.length) {
		const existing = tag.attributes.style ? String(tag.attributes.style) : '';
		tag.attributes.style = existing ? `${existing}; ${styleParts.join('; ')}` : styleParts.join('; ');
	}
}

/** Find the first `[data-section="media"]` element in a children tree. */
function findMediaZone(nodes: RendererNode[]): SerializedTag | undefined {
	for (const node of nodes) {
		if (!isTag(node)) continue;
		if (node.attributes?.['data-section'] === 'media') return node;
		const found = node.children ? findMediaZone(node.children) : undefined;
		if (found) return found;
	}
	return undefined;
}

/** Find the first descendant tag carrying `data-name === name`. */
function findByName(nodes: RendererNode[], name: string): SerializedTag | undefined {
	for (const node of nodes) {
		if (!isTag(node)) continue;
		if (node.attributes?.['data-name'] === name) return node;
		const found = node.children ? findByName(node.children, name) : undefined;
		if (found) return found;
	}
	return undefined;
}

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

const INTERACTIVE_GUEST_WARNED = new Set<string>();
/** SPEC-090 — warn once when an interactive guest sits in a linked tile (its
 *  controls are inert under the whole-tile link). Informative, not fatal. */
function warnInteractiveGuestInLink(container: string, guest: string): void {
	const key = `${container}:${guest}`;
	if (INTERACTIVE_GUEST_WARNED.has(key)) return;
	INTERACTIVE_GUEST_WARNED.add(key);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] interactive guest \`${guest}\` in a linked \`${container}\` — its controls are inert under the whole-tile link. Drop \`href\` or the interactivity.`);
}

const COVER_SANDBOX_ACTIVATION_WARNED = new Set<string>();

/** SPEC-101 — warn once when a non-eager sandbox serves as a cover backdrop:
 *  the posture demotion makes the backdrop inert, so `visible` is a no-op
 *  above the fold and `click`'s Run control is unreachable. Informative. */
function warnNonEagerCoverSandbox(container: string, activation: string): void {
	const key = `${container}:${activation}`;
	if (COVER_SANDBOX_ACTIVATION_WARNED.has(key)) return;
	COVER_SANDBOX_ACTIVATION_WARNED.add(key);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] \`activation="${activation}"\` on a sandbox serving as a \`${container}\` cover backdrop — the backdrop is inert (pointer-events: none), so the poster/Run affordance is unreachable. Drop \`activation\` (eager is the background mode).`);
}

const FRAME_NO_TARGET_WARNED = new Set<string>();
/** Warn once when `frame` is used on a rune with no resolvable frame target. */
function warnFrameNoTarget(rune: string): void {
	if (FRAME_NO_TARGET_WARNED.has(rune)) return;
	FRAME_NO_TARGET_WARNED.add(rune);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] \`frame\` on \`${rune}\` has no frame target — set \`frameTarget\` or give the rune a media section. Frame chrome ignored.`);
}

const FRAME_OVERFLOW_CLIP_WARNED = new Set<string>();
/** Warn once when `frame-overflow="bleed"` lands on a clip host — the media well
 *  crops the over-width, so the bleed has no effect (SPEC-116). */
function warnFrameOverflowClip(rune: string): void {
	if (FRAME_OVERFLOW_CLIP_WARNED.has(rune)) return;
	FRAME_OVERFLOW_CLIP_WARNED.add(rune);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] \`frame-overflow="bleed"\` has no effect on \`${rune}\` — a clip host crops its media guest. Use it on a bleed host (hero, feature), or drop it.`);
}

/** Resolved substrate fill — the markers + custom props for the target surface. */
interface SubstrateChrome {
	dataAttrs: Record<string, string>;
	styleParts: string[];
	metaProps: Set<string>;
	/** Per-instance `substrate-target` override (`self` | `media`), if any. */
	targetOverride?: string;
}

const SUBSTRATE_CELL: Record<string, string> = { sm: '12px', md: '16px', lg: '24px' };
const SUBSTRATE_OPACITY: Record<string, string> = { sm: '0.25', md: '0.5', lg: '0.85' };

/** SPEC-087 — read the `substrate` pattern + `substrate-*` facet metas and emit
 *  the markers-only contract: `data-substrate` (+ `data-substrate-fill`) and the
 *  `--substrate-*` custom props. CSS draws the pattern. Returns null when no
 *  substrate is present. */
function resolveSubstrate(tag: SerializedTag): SubstrateChrome | null {
	const metaProps = new Set<string>();
	const read = (field: string): string | undefined => {
		const v = readMeta(tag, field);
		if (v !== undefined && v !== null) metaProps.add(field);
		return v ?? undefined;
	};
	const pattern = read('substrate');
	const size = read('substrate-size');
	const opacity = read('substrate-opacity');
	const fill = read('substrate-fill');
	const targetOverride = read('substrate-target');

	if (!pattern) return null; // facets are meaningless without a pattern
	const dataAttrs: Record<string, string> = { 'data-substrate': pattern };
	if (fill) dataAttrs['data-substrate-fill'] = fill;
	const styleParts: string[] = [];
	if (size && SUBSTRATE_CELL[size]) styleParts.push(`--substrate-cell: ${SUBSTRATE_CELL[size]}`);
	if (opacity && SUBSTRATE_OPACITY[opacity]) styleParts.push(`--substrate-opacity: ${SUBSTRATE_OPACITY[opacity]}`);
	return { dataAttrs, styleParts, metaProps, targetOverride };
}

const SUBSTRATE_NO_MEDIA_WARNED = new Set<string>();
/** Warn once when `substrate-target="media"` targets a rune with no media section. */
function warnSubstrateNoMedia(rune: string): void {
	if (SUBSTRATE_NO_MEDIA_WARNED.has(rune)) return;
	SUBSTRATE_NO_MEDIA_WARNED.add(rune);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] \`substrate-target="media"\` on \`${rune}\` has no media section — substrate ignored.`);
}

const BG_GRADIENT_DIRECTIONS: Record<string, string> = {
	'to-t': 'to top', 'to-b': 'to bottom', 'to-l': 'to left', 'to-r': 'to right',
	'to-tr': 'to top right', 'to-br': 'to bottom right', 'to-bl': 'to bottom left', 'to-tl': 'to top left',
};

/** SPEC-088 — build a token-driven `bg` gradient. `stops` are semantic token
 *  names resolved to `var(--rf-color-*)` (colours stay token-owned); `direction`
 *  is a bounded named set; `type` is linear (default) | radial | conic. Returns
 *  null when there are fewer than two stops. */
/** Resolve a single gradient stop into a CSS colour expression.
 *
 *  Recognises three shapes:
 *  - `transparent` (the CSS keyword) → emits `transparent` verbatim, so
 *    `from="transparent" to="primary"` fades from clear to the theme colour.
 *  - `name/alpha` (Tailwind-style) → emits a `color-mix(... %, transparent)`
 *    wrapper so a token can be used at partial opacity. Alpha accepts a
 *    decimal (`0.5`) or a percent (`50` or `50%`); values outside `[0, 1]`
 *    after normalisation fall through to the plain token.
 *  - Bare token name → `var(--rf-color-{name})` (the original behaviour).
 */
function resolveBgStop(stop: string): string {
	if (stop === 'transparent') return 'transparent';
	const slashIdx = stop.indexOf('/');
	if (slashIdx > 0 && slashIdx < stop.length - 1) {
		const name = stop.slice(0, slashIdx);
		const alphaRaw = stop.slice(slashIdx + 1).replace(/%$/, '');
		const alpha = parseFloat(alphaRaw);
		if (Number.isFinite(alpha)) {
			const fraction = alpha > 1 ? alpha / 100 : alpha;
			if (fraction >= 0 && fraction <= 1) {
				return `color-mix(in srgb, var(--rf-color-${name}) ${fraction * 100}%, transparent)`;
			}
		}
	}
	return `var(--rf-color-${stop})`;
}

function buildBgGradient(opts: { type?: string; direction?: string; stops: (string | undefined)[] }): string | null {
	const stops = opts.stops.filter((s): s is string => !!s).map(resolveBgStop);
	if (stops.length < 2) return null;
	const type = opts.type ?? 'linear';
	if (type === 'radial') return `radial-gradient(${stops.join(', ')})`;
	if (type === 'conic') return `conic-gradient(${stops.join(', ')})`;
	const dir = BG_GRADIENT_DIRECTIONS[opts.direction ?? 'to-b'] ?? 'to bottom';
	return `linear-gradient(${dir}, ${stops.join(', ')})`;
}

/** SPEC-088 — gradient scrim strength (alpha of the tone colour). */
const SCRIM_STRENGTH: Record<string, string> = { sm: '0.3', md: '0.55', lg: '0.8' };

/** A bare token reference (`primary`, `surface`, …) vs raw CSS (`rgba(…)`, `#…`). */
const TOKEN_REF = /^[a-z][a-z0-9-]*$/;

/** SPEC-089 — explicit cover-scrim edge → CSS gradient direction (the heaviest
 *  edge is where the named edge sits). Overrides the content-place default. */
const COVER_SCRIM_DIR: Record<string, string> = {
	top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right',
};

const CONTENT_PLACE_WARNED = new Set<string>();
/** Warn once when `content-place` is set outside cover mode (it's inert there). */
function warnContentPlaceOutsideCover(rune: string): void {
	if (CONTENT_PLACE_WARNED.has(rune)) return;
	CONTENT_PLACE_WARNED.add(rune);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] \`content-place\` on \`${rune}\` is only active in \`media-position="cover"\` — it anchors the overlay, and there's no overlay outside cover. Ignored.`);
}

const RAW_OVERLAY_WARNED = new Set<string>();
/** Warn once when `overlay` carries raw CSS (deprecated — use a token wash or `scrim`). */
function warnRawOverlay(rune: string): void {
	if (RAW_OVERLAY_WARNED.has(rune)) return;
	RAW_OVERLAY_WARNED.add(rune);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] raw-CSS \`overlay\` on \`${rune}\` is deprecated (SPEC-088) — use \`overlay="dark|light|<token>"\` for a flat wash or \`scrim\` for a legibility gradient. The raw passthrough will be removed in a future minor.`);
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
			warnRequiresParent(dataRune ?? config.block, config.requiresParent, parentRune);
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

	// SPEC-089 — cover mode reroutes the scrim facet to the media well (below),
	// so it must be known before the bg layer (self surface) decides to claim it.
	const isCover = modifierValues['media-position'] === 'cover';

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

	// 1f-bis. Reading register (SPEC-108) — author `reading=` ▸ rune `defaultReading`
	// ▸ `ui`. (The region default applies only to the bare body, not runes.) Emitted
	// as `data-reading` on the rune's `[data-section="body"]` element; suppressed at
	// the `ui` default so unmarked content stays byte-identical.
	const readingValue = resolveReading({ authorAttr: tag.attributes?.reading, runeDefault: config.defaultReading });

	// dropcap (SPEC-108) — a per-instance opt-in honoured only on a prose body
	// (gated via READING_CAPABILITIES). Off-register it is dropped with a warn-once,
	// so it never renders where it is meaningless. Emitted as `data-dropcap` on the
	// same body section as `data-reading`; the theme owns the glyph.
	const dropcapRequested = Boolean(tag.attributes?.dropcap);
	const dropcapValue = dropcapRequested && READING_CAPABILITIES[readingValue]?.dropcap === true;
	if (dropcapRequested && !dropcapValue) {
		const runeName = tag.attributes?.['data-rune'] ?? block;
		console.warn(`[refrakt] dropcap is honoured only on a prose body — ignored on "${runeName}" (reading="${readingValue}").`);
	}
	// Content-measure (layout axis): page-section runes anchor their content to
	// the text measure when bled to the `wide` track — only the surface/bg
	// widens. Emitted as a data attribute (no BEM class); the default (`fill`)
	// lets content fill the wider track, so it's only emitted when anchored.
	if (config.contentMeasure === 'anchored') {
		modifierValues['content-measure'] = 'anchored';
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
	// elevation — universal chrome/depth axis (SPEC-107). Author attr or the
	// rune's `defaultElevation`; deprecated shadow-scale values are aliased with
	// a warning. Emits data-elevation; the skin maps each rung to a chrome
	// bundle. No BEM class — styled by attribute.
	const elevationValue = resolveElevation(tag.attributes?.elevation ?? config.defaultElevation);
	if (elevationValue) {
		modifierValues['elevation'] = elevationValue;
	}

	// prominence — header-emphasis axis (SPEC-107), gated to the page-section-
	// header family. Author attr or the rune's `defaultProminence`; emits
	// data-prominence (the skin maps it to a type register). On a rune with no
	// page-section header, prominence has nothing to scale, so it's ignored with
	// a dev warning rather than silently honoured.
	const prominenceValue = tag.attributes?.prominence ?? config.defaultProminence;
	if (prominenceValue) {
		if (hasPageSectionHeader(config.sections)) {
			modifierValues['prominence'] = String(prominenceValue);
		} else {
			const runeName = tag.attributes?.['data-rune'] ?? block;
			console.warn(`[refrakt] prominence is not supported on "${runeName}" — it applies only to runes with a page-section header. Ignored.`);
		}
	}

	// reveal / stagger — SPEC-105 motion facet. Pure intent → attributes: the
	// author declares the entrance character (closed `reveal` vocabulary, validated
	// at parse time by the schema's `matches`), the theme owns the choreography
	// (WORK-432), a behaviour owns the timing (WORK-433). Universal opt-in like
	// width/elevation — emits `data-reveal` (no BEM class; styled by attribute) and
	// `data-stagger`, and stamps `--rf-reveal-index` on the cascade items below.
	const revealValue = tag.attributes?.reveal;
	if (revealValue) {
		modifierValues['reveal'] = String(revealValue);
	}
	const staggerSet = Boolean(tag.attributes?.stagger);
	if (staggerSet) {
		modifierValues['stagger'] = '';
	}

	// 1f. Background processing — read bg-* meta tags and build background layer
	const bgMetaProps = new Set<string>();
	const bgDataAttrs: Record<string, string> = {};
	let bgElement: SerializedTag | null = null;

	// SPEC-104 — a `{% bg %}` body hoists a `data-bg-guest` element (a sandbox
	// backdrop) into the host's children. Capture it so §1f relocates it into the
	// bg layer (a sibling of the `bg-video` branch) and the flow drops it (below).
	const bgGuestNode = (tag.children ?? []).find(
		(c): c is SerializedTag => isTag(c) && (c as SerializedTag).attributes?.['data-bg-guest'] !== undefined,
	) ?? null;

	const bgPreset = readMeta(tag, 'bg-preset');
	const bgSrc = readMeta(tag, 'bg-src');
	const bgVideo = readMeta(tag, 'bg-video');

	// SPEC-088 — token-driven gradient fill (inline facets override a preset's
	// structured `gradient`). Built before the trigger so a gradient-only bg
	// (no image/video/preset-style) still raises the bg layer.
	const bgGradientDir = readMeta(tag, 'bg-gradient');
	const bgFrom = readMeta(tag, 'bg-from');
	const bgVia = readMeta(tag, 'bg-via');
	const bgTo = readMeta(tag, 'bg-to');
	const bgGradientType = readMeta(tag, 'bg-gradient-type');
	let presetGradient: { type?: string; direction?: string; stops: string[] } | undefined;
	if (bgPreset && backgrounds[bgPreset]) {
		let p = backgrounds[bgPreset];
		if (p.extends && backgrounds[p.extends]) p = { ...backgrounds[p.extends], ...p };
		presetGradient = p.gradient;
	}
	let bgGradient: string | null = null;
	if (bgGradientDir || bgFrom || bgVia || bgTo || bgGradientType) {
		// Inline facets override individual facets of the preset; stops fall back
		// to the preset's when the author didn't supply at least two inline.
		const inlineStops = [bgFrom, bgVia, bgTo].filter((s): s is string => !!s);
		bgGradient = buildBgGradient({
			type: bgGradientType ?? presetGradient?.type,
			direction: bgGradientDir ?? presetGradient?.direction,
			stops: inlineStops.length >= 2 ? inlineStops : (presetGradient?.stops ?? inlineStops),
		});
	} else if (presetGradient) {
		bgGradient = buildBgGradient(presetGradient);
	}

	// A scrim or a flat overlay can stand alone (a wash over the rune's own
	// content), so they also raise the bg/overlay layer.
	const scrimDir = readMeta(tag, 'scrim');
	const bgOverlay = readMeta(tag, 'bg-overlay');

	// In cover mode the scrim belongs to the media well (handled below), not the
	// self-surface bg layer — so it alone doesn't raise the bg layer here.
	const bgScrim = scrimDir && scrimDir !== 'none' && !isCover;
	if (bgPreset || bgSrc || bgVideo || bgGradient || bgScrim || bgOverlay || bgGuestNode) {
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
		// Image takes the base layer when present; otherwise the gradient fills it.
		if (bgSrc) bgStyleParts.push(`--bg-image: url(${bgSrc})`);
		else if (bgGradient) bgStyleParts.push(`--bg-image: ${bgGradient}`);
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

		// SPEC-104 — relocate a live sandbox backdrop into the bg layer, a sibling of
		// the `bg-video` branch: above the `--bg-image` boot frame, below the
		// overlay/scrim appended after it. The guest arrived tagged + postured by the
		// bg rune; the flow copy is dropped below (section 4).
		if (bgGuestNode) {
			bgChildren.push(bgGuestNode);
		}

		// overlay — a flat wash (SPEC-088 structured vocabulary): dark | light | a
		// token reference (+ overlay-opacity). Raw CSS still works but warns.
		if (bgOverlay) {
			const bgOverlayOpacity = readMeta(tag, 'bg-overlay-opacity');
			const overlayAttrs: Record<string, string> = { 'data-name': 'bg-overlay' };
			if (bgOverlay === 'dark' || bgOverlay === 'light') {
				overlayAttrs['data-bg-overlay'] = bgOverlay;
				if (bgOverlayOpacity) overlayAttrs.style = `opacity: ${bgOverlayOpacity}`;
			} else if (TOKEN_REF.test(bgOverlay)) {
				const parts = [`background: var(--rf-color-${bgOverlay})`];
				if (bgOverlayOpacity) parts.push(`opacity: ${bgOverlayOpacity}`);
				overlayAttrs.style = parts.join('; ');
			} else {
				warnRawOverlay(dataRune ?? config.block);
				overlayAttrs.style = `background: ${bgOverlay}`;
			}
			bgChildren.push(makeTag('div', overlayAttrs));
		}

		// scrim — a structured legibility treatment (SPEC-088). On the bg overlay
		// layer here; cover mode (SPEC-089) routes the same facet to the media well.
		if (bgScrim) {
			const scrimType = readMeta(tag, 'scrim-type') ?? 'gradient';
			const scrimTone = readMeta(tag, 'scrim-tone') ?? 'dark';
			const scrimAttrs: Record<string, string> = {
				'data-name': 'scrim', 'data-scrim': scrimType,
				'data-scrim-tone': scrimTone, 'data-scrim-dir': scrimDir,
			};
			const scrimStyle: string[] = [];
			if (scrimType === 'frost') {
				const scrimBlur = readMeta(tag, 'scrim-blur') ?? 'md';
				scrimStyle.push(`--scrim-blur: ${BLUR_PRESETS[scrimBlur] ?? BLUR_PRESETS.md}`);
			} else {
				const scrimStrength = readMeta(tag, 'scrim-strength') ?? 'md';
				scrimStyle.push(`--scrim-strength: ${SCRIM_STRENGTH[scrimStrength] ?? SCRIM_STRENGTH.md}`);
			}
			scrimAttrs.style = scrimStyle.join('; ');
			bgChildren.push(makeTag('div', scrimAttrs));

			// Foreground polarity (SPEC-088): the overlaid content's text/muted
			// follow the scrim, not the base surface — a dark scrim yields light
			// text. Reuse the colour-scheme lever (`data-color-scheme`), which
			// flips the full palette; an explicit tint scheme still wins.
			if (!tintDataAttrs['data-color-scheme']) {
				bgDataAttrs['data-color-scheme'] = scrimTone;
			}
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
		bgMetaProps.add('bg-gradient');
		bgMetaProps.add('bg-from');
		bgMetaProps.add('bg-via');
		bgMetaProps.add('bg-to');
		bgMetaProps.add('bg-gradient-type');
		bgMetaProps.add('bg-overlay-opacity');
		bgMetaProps.add('scrim');
		bgMetaProps.add('scrim-type');
		bgMetaProps.add('scrim-strength');
		bgMetaProps.add('scrim-blur');
		bgMetaProps.add('scrim-tone');
	}

	// SPEC-089 — in cover mode the scrim facet is consumed by the media well
	// (section 8), even when the bg layer above didn't run; mark its metas
	// consumed now so the strip pass (section 7) doesn't leak them to output.
	if (isCover) {
		bgMetaProps.add('scrim');
		bgMetaProps.add('scrim-type');
		bgMetaProps.add('scrim-blur');
		bgMetaProps.add('scrim-tone');
	}

	// 1g. Frame chrome (SPEC-086) — resolve the frame preset + facets and decide
	// which surface they decorate. `self` lands on the rune root; `media` lands
	// on the [data-section="media"] zone (applied after assembly, below).
	const frameChrome = resolveFrameChrome(tag, frames, config.guestFit);
	const frameMetaProps = new Set<string>(frameChrome?.metaProps ?? []);
	let frameTargetKind: 'media' | 'self' | null = null;
	if (frameChrome) {
		const hasMediaSection = config.sections ? Object.values(config.sections).includes('media') : false;
		frameTargetKind = config.frameTarget ?? (hasMediaSection ? 'media' : null);
		if (!frameTargetKind) warnFrameNoTarget(dataRune ?? config.block);
		// SPEC-116 — `frame-overflow="bleed"` only does anything on a bleed host
		// (the clip host's media well crops the over-width). On a clip host, strip
		// the inert marker so output stays clean, and warn once.
		if (frameChrome.dataAttrs['data-frame-overflow'] === 'bleed' && config.guestFit !== 'bleed') {
			delete frameChrome.dataAttrs['data-frame-overflow'];
			warnFrameOverflowClip(dataRune ?? config.block);
		}
	}
	const frameRootDataAttrs = frameChrome && frameTargetKind === 'self' ? frameChrome.dataAttrs : {};

	// 1h. Substrate fill (SPEC-087) — a generated pattern. Defaults to the self
	// surface (a background is "behind everything"); the media well is opted into
	// via `substrate-target="media"`. A per-instance override always wins.
	const substrateChrome = resolveSubstrate(tag);
	const substrateMetaProps = new Set<string>(substrateChrome?.metaProps ?? []);
	let substrateTargetKind: 'media' | 'self' | null = null;
	if (substrateChrome) {
		const hasMediaSection = config.sections ? Object.values(config.sections).includes('media') : false;
		const override = substrateChrome.targetOverride;
		substrateTargetKind = (override === 'self' || override === 'media')
			? override
			: (config.substrateTarget ?? 'self');
		if (substrateTargetKind === 'media' && !hasMediaSection) {
			warnSubstrateNoMedia(dataRune ?? config.block);
			substrateTargetKind = null;
		}
	}
	const substrateRootDataAttrs = substrateChrome && substrateTargetKind === 'self' ? substrateChrome.dataAttrs : {};

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
	// SPEC-104 — drop the bg guest from the flow: it was relocated into the bg
	// layer (§1f) and must not also render among the host's content.
	let children = bgGuestNode ? tag.children.filter(c => c !== bgGuestNode) : tag.children;
	if (config.autoLabel) {
		children = applyAutoLabel(children, config.autoLabel);
	}

	// 5. SPEC-080: block-and-layout assembly (metaFields + blocks + layout).
	//    Projects named metadata blocks and places them into the transform
	//    tree per `layout`. The legacy `slots + structure` shim was removed in
	//    WORK-313; the `structure`-only before/after path below survives for
	//    non-meta-projecting runes that just inject icons or badges.
	if (config.blocks || config.layout) {
		children = assembleWithBlocks(config, block, children, modifierValues, locale);
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

	// 5b. Prepend bg layer element if present (before content, after structural elements)
	if (bgElement) {
		children = [bgElement, ...children];
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

	// 6c. Frame chrome → media surface (SPEC-086). `self`-target chrome is merged
	// onto the root below; `media`-target chrome lands on the media zone here.
	if (frameChrome && frameTargetKind === 'media') {
		const mediaZone = findMediaZone(enhancedChildren);
		if (mediaZone) {
			applyChromeToTag(mediaZone, frameChrome.dataAttrs, frameChrome.styleParts);
		} else {
			warnFrameNoTarget(dataRune ?? config.block);
		}
	}
	if (substrateChrome && substrateTargetKind === 'media') {
		const mediaZone = findMediaZone(enhancedChildren);
		if (mediaZone) {
			applyChromeToTag(mediaZone, substrateChrome.dataAttrs, substrateChrome.styleParts);
		} else {
			warnSubstrateNoMedia(dataRune ?? config.block);
		}
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
				if (guest) warnInteractiveGuestInLink(dataRune ?? config.block, guest);
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
						warnNonEagerCoverSandbox(dataRune ?? config.block, String(activation));
					}
				}
			}
		}
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
		if (frameMetaProps.has(prop)) return false;
		if (substrateMetaProps.has(prop)) return false;
		return true;
	});

	// 7b. Annotate <ol> elements with data-sequence when config declares sequence style
	if (config.sequence) {
		const seqDirection = config.sequenceDirection
			? (modifierValues[config.sequenceDirection.fromModifier] ?? config.sequenceDirection.default)
			: undefined;
		annotateSequence(filteredChildren, config.sequence, seqDirection);
	}

	// 7c. SPEC-105 stagger — stamp `--rf-reveal-index` (document order) on the
	// rune's cascade items so the motion dimension can offset each child's entrance
	// from the container's single in-view trigger. Only when the author set
	// `stagger` and the rune declares its cascade items; otherwise a silent no-op.
	if (staggerSet && config.staggerItems) {
		stampStaggerIndex(filteredChildren, config.staggerItems, { n: 0 });
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
	// SPEC-089 content-place — the cover overlay anchor. 2-axis logical
	// (block × inline); `auto` is left to the container query in CSS. Active only
	// in cover mode; warns otherwise (it's inert outside an overlay).
	const contentPlace = modifierValues['content-place'];
	if (contentPlace) {
		if (!isCover) {
			warnContentPlaceOutsideCover(dataRune ?? config.block);
		} else if (contentPlace !== 'auto') {
			const [blockAxis, inlineAxis] = contentPlace.trim().split(/\s+/);
			if (blockAxis) styleParts.push(`--cover-place-block: ${blockAxis}`);
			if (inlineAxis) styleParts.push(`--cover-place-inline: ${inlineAxis}`);
			// Scrim follows the content edge. The default linear gradient handles
			// `start` (flip to `to bottom`) and `end` (the default `to top`). For
			// `center` a linear gradient can't centre a band, so emit a radial
			// scrim (and a radial mask for the frost variant) keyed off the same
			// percentage stops as the linear default — cover.css falls through
			// to the linear gradient via `var()` defaults when these aren't set.
			if (blockAxis === 'start') {
				styleParts.push('--cover-scrim-dir: to bottom');
			} else if (blockAxis === 'center') {
				// `farthest-side` extent makes 100% radius land on the box's edges
				// instead of the (much further) corners — without this, the default
				// `farthest-corner` shape leaves the outer ~30% of width on a wide
				// aspect (e.g. 16:9) entirely outside the gradient, so text near the
				// left/right edges gets no scrim coverage. The dark also stays
				// solid out to 40% radius (matching the linear's `0%, 62%` visual
				// weight without the dramatic falloff radial gives at the corners).
				styleParts.push('--cover-scrim-image: radial-gradient(ellipse farthest-side at center, rgb(0 0 0 / 0.55) 40%, transparent 100%)');
				styleParts.push('--cover-scrim-mask: radial-gradient(ellipse farthest-side at center, #000 50%, transparent 100%)');
			}
		}
	}
	// SPEC-089 — cover foreground + default-scrim opt-out. The overlaid content
	// reads against the darkened media, so default the cover region to a dark
	// colour-scheme (light text) unless a tint/scrim already set one; `scrim="none"`
	// disables the default scrim (signalled to CSS on the host).
	if (isCover) {
		const coverScrim = readMeta(tag, 'scrim');
		if (coverScrim === 'none') {
			bgDataAttrs['data-scrim'] = 'none';
		}
		// Scrim treatment: gradient (default) or frost (a frosted-glass blur over
		// the media). Both render on the media well's `::after` (cover.css); the
		// type + blur amount ride on the host as data attrs.
		const coverScrimType = readMeta(tag, 'scrim-type');
		if (coverScrimType && coverScrim !== 'none') {
			bgDataAttrs['data-scrim-type'] = coverScrimType;
			if (coverScrimType === 'frost') {
				const coverScrimBlur = readMeta(tag, 'scrim-blur');
				if (coverScrimBlur) bgDataAttrs['data-scrim-blur'] = coverScrimBlur;
			}
		}
		// Foreground polarity follows `scrim-tone` (a dark scrim wants light text
		// → a dark scheme; a light scrim wants dark text → a light scheme). The
		// scheme is scoped to the *overlay*, not the rune root, so the card's own
		// surface (the padded edge around the media well) keeps the page palette —
		// only the text sitting on the darkened media flips. Full scope flips the
		// `content` overlay; header scope flips the cover-band (the variant layout
		// carries the scheme via its `attrs`). An explicit tint/scheme wins.
		const coverScope = config.rootAttributes?.['data-cover-scope'];
		if (coverScrim !== 'none' && coverScope !== 'header'
			&& !bgDataAttrs['data-color-scheme'] && !tintDataAttrs['data-color-scheme']) {
			const overlay = findByName(filteredChildren, 'content');
			if (overlay) {
				overlay.attributes = { ...overlay.attributes, 'data-color-scheme': readMeta(tag, 'scrim-tone') ?? 'dark' };
			}
		}
		// An explicit scrim direction pins the default-scrim gradient, overriding
		// the content-place-derived direction set above.
		const dir = COVER_SCRIM_DIR[coverScrim ?? ''];
		if (dir) styleParts.push(`--cover-scrim-dir: ${dir}`);
	}
	// Frame chrome on the self surface contributes its custom props to the root.
	if (frameChrome && frameTargetKind === 'self') {
		styleParts.push(...frameChrome.styleParts);
	}
	// Substrate on the self surface likewise.
	if (substrateChrome && substrateTargetKind === 'self') {
		styleParts.push(...substrateChrome.styleParts);
	}
	if (styleParts.length) {
		inlineStyle = inlineStyle
			? `${inlineStyle}; ${styleParts.join('; ')}`
			: styleParts.join('; ');
	}

	// Strip consumed universal attributes from output (they're expressed via data-* / BEM instead).
	// `data-rune-fields` (SPEC-082) is the internal field-data channel — strip it from output so
	// the dual-emit in WORK-321 stays output-neutral; the engine begins *reading* it in WORK-322.
	const { width: _w, spacing: _s, inset: _i, elevation: _e, prominence: _p, reveal: _rv, stagger: _st, density: _d, 'data-rune': _dr, 'data-rune-fields': _drf, ...rawPassAttrs } = tag.attributes;
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
			...frameRootDataAttrs,
			...substrateRootDataAttrs,
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

/**
 * Stamp `--rf-reveal-index: N` (0,1,2,… in document order) on a staggered
 * container's cascade items — the elements whose `data-field` or `data-name`
 * equals `itemName` (SPEC-105). Mutates the array in place, merging onto any
 * existing inline style. A matched item is NOT descended into: a nested
 * same-named cascade belongs to that child rune's own stagger pass.
 */
function stampStaggerIndex(children: RendererNode[], itemName: string, counter: { n: number }): void {
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!isTag(child)) continue;
		const isItem = child.attributes?.['data-field'] === itemName
			|| child.attributes?.['data-name'] === itemName;
		if (isItem) {
			const existing = child.attributes?.style ? String(child.attributes.style) : '';
			const decl = `--rf-reveal-index: ${counter.n}`;
			children[i] = {
				...child,
				attributes: { ...child.attributes, style: existing ? `${existing}; ${decl}` : decl },
			};
			counter.n++;
		} else if (child.children.length > 0) {
			stampStaggerIndex(child.children, itemName, counter);
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
function buildLinkValue(f: ResolvedField, locale?: LocaleContext, config?: RuneConfig): SerializedTag {
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
function buildIconValue(f: ResolvedField, locale?: LocaleContext, config?: RuneConfig): SerializedTag {
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
		const dt = makeTag('dt', { 'data-meta-label': '' }, [f.field.label ?? f.name]);
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
		if (def.layout === 'bar') return renderBarLayout(name, items, def.wrap ?? true, locale, config);
		return renderDefListBlock(name, items.map(i => i.resolved), locale, config);
	};

	// No `layout` → render the transform tree verbatim (no projection).
	if (Object.keys(layout).length === 0) return contentChildren;
	const ctx: LayoutCtx = { layout, renderBlock };

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
}

const LAYOUT_CYCLE_WARNED = new Set<string>();
function warnLayoutCycle(name: string): void {
	if (LAYOUT_CYCLE_WARNED.has(name)) return;
	LAYOUT_CYCLE_WARNED.add(name);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] layout reference cycle at "${name}" — skipping to break the loop.`);
}

/** SPEC-084 (WORK-337) — runes whose output is structurally meaningless without
 *  their parent (kebab `data-rune`). A misplacement of these is an *error*; any
 *  other `requiresParent` violation is a *warning* (renders, but off-contract). */
const STRUCTURAL_CHILDREN = new Set<string>([
	'accordion-item', 'tab', 'tab-panel', 'breadcrumb-item', 'juxtapose-panel',
	'bento-cell', 'definition', 'step', 'tier', 'map-pin',
	'itinerary-day', 'itinerary-stop',
]);
const REQUIRES_PARENT_WARNED = new Set<string>();
/** Report a `requiresParent` violation once per (rune, actual-parent). */
function warnRequiresParent(rune: string, required: string, actual: string | undefined): void {
	const key = `${rune}<${actual ?? ''}`;
	if (REQUIRES_PARENT_WARNED.has(key)) return;
	REQUIRES_PARENT_WARNED.add(key);
	const where = actual ? `nested directly in \`${actual}\`` : 'at the top level';
	const msg = `[refrakt] \`${rune}\` requires parent \`${toKebabCase(required)}\` — found ${where}.`;
	// eslint-disable-next-line no-console
	if (STRUCTURAL_CHILDREN.has(rune)) console.error(msg);
	// eslint-disable-next-line no-console
	else console.warn(msg);
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
		if (ancestors.includes(name)) { warnLayoutCycle(name); continue; }

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
