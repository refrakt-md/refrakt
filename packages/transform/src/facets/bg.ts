import type { RendererNode, SerializedTag } from '@refrakt-md/types';
import { isTag, makeTag, readMeta } from '../helpers.js';
import type { BgPresetDefinition } from '../types.js';
import type { Facet, FacetContext, FacetWarning } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-088 — the bounded set of named gradient directions. */
const BG_GRADIENT_DIRECTIONS: Record<string, string> = {
	'to-t': 'to top', 'to-b': 'to bottom', 'to-l': 'to left', 'to-r': 'to right',
	'to-tr': 'to top right', 'to-br': 'to bottom right', 'to-bl': 'to bottom left', 'to-tl': 'to top left',
};

/** SPEC-088 — gradient scrim strength (alpha of the tone colour).
 *
 *  A theme decision hard-coded in a framework-agnostic engine: a theme cannot
 *  change what `scrim-strength="md"` means. Kept with the facet rather than
 *  hoisted into a shared constants module, which would entrench it. SPEC-124
 *  files turning these into design tokens as follow-on work. */
const SCRIM_STRENGTH: Record<string, string> = { sm: '0.3', md: '0.55', lg: '0.8' };

/** Blur radius scale, shared by `bg-blur` and the frost scrim. Same caveat. */
const BLUR_PRESETS: Record<string, string> = { sm: '4px', md: '8px', lg: '16px' };

/** A bare token reference (`primary`, `surface`, …) vs raw CSS (`rgba(…)`, `#…`). */
const TOKEN_REF = /^[a-z][a-z0-9-]*$/;

/** Every meta field the background layer claims once it is raised. */
const BG_META = [
	'bg-preset', 'bg-src', 'bg-video', 'bg-overlay', 'bg-blur', 'bg-position',
	'bg-fit', 'bg-opacity', 'bg-fixed', 'bg-gradient', 'bg-from', 'bg-via', 'bg-to',
	'bg-gradient-type', 'bg-overlay-opacity',
	'scrim', 'scrim-type', 'scrim-strength', 'scrim-blur', 'scrim-tone',
];

/** Resolve a single gradient stop into a CSS colour expression.
 *
 *  Recognises three shapes:
 *  - `transparent` (the CSS keyword) → emits `transparent` verbatim, so
 *    `from="transparent" to="primary"` fades from clear to the theme colour.
 *  - `name/alpha` (Tailwind-style) → emits a `color-mix(... %, transparent)`
 *    wrapper so a token can be used at partial opacity. Alpha accepts a
 *    decimal (`0.5`) or a percent (`50` or `50%`); values outside `[0, 1]`
 *    after normalisation fall through to the plain token.
 *  - Bare token name → `var(--rf-color-{name})`.
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

/** SPEC-088 — build a token-driven `bg` gradient. `stops` are semantic token
 *  names resolved to `var(--rf-color-*)` (colours stay token-owned); `direction`
 *  is a bounded named set; `type` is linear (default) | radial | conic. Returns
 *  null when there are fewer than two stops. */
export function buildBgGradient(opts: { type?: string; direction?: string; stops: (string | undefined)[] }): string | null {
	const stops = opts.stops.filter((s): s is string => !!s).map(resolveBgStop);
	if (stops.length < 2) return null;
	const type = opts.type ?? 'linear';
	if (type === 'radial') return `radial-gradient(${stops.join(', ')})`;
	if (type === 'conic') return `conic-gradient(${stops.join(', ')})`;
	const dir = BG_GRADIENT_DIRECTIONS[opts.direction ?? 'to-b'] ?? 'to bottom';
	return `linear-gradient(${dir}, ${stops.join(', ')})`;
}

/** Resolve a background preset, following one level of `extends`. */
function resolvePreset(name: string | undefined, presets: Record<string, BgPresetDefinition>): BgPresetDefinition | undefined {
	if (!name || !presets[name]) return undefined;
	const preset = presets[name];
	if (preset.extends && presets[preset.extends]) {
		const base = presets[preset.extends];
		return { ...base, params: { ...base.params, ...preset.params }, style: { ...base.style, ...preset.style } };
	}
	return preset;
}

/** `bg` — SPEC-088 background layer.
 *
 *  The only facet that builds its own element subtree: a `[data-name="bg"]`
 *  layer holding, in order, the image/gradient base, an optional video, a
 *  relocated sandbox guest, a flat overlay wash, and a legibility scrim.
 *
 *  Declares `after: ['cover', 'tint']` — cover reroutes the scrim to the media
 *  well, and the scrim's foreground polarity yields to a scheme tint already
 *  claimed. */
export const bgFacet: Facet = {
	name: 'bg',
	after: ['cover', 'tint'],

	resolve(ctx: FacetContext) {
		const { tag } = ctx;
		const presets = ctx.theme.backgrounds;

		// SPEC-104 — a `{% bg %}` body hoists a `data-bg-guest` element (a sandbox
		// backdrop) into the host's children. It is relocated into the bg layer
		// and dropped from the flow via `absorbs`.
		const guest = (tag.children ?? []).find(
			(c): c is SerializedTag => isTag(c) && c.attributes?.['data-bg-guest'] !== undefined,
		) ?? null;

		const preset = readMeta(tag, 'bg-preset');
		const src = readMeta(tag, 'bg-src');
		const video = readMeta(tag, 'bg-video');

		// SPEC-088 — token-driven gradient fill (inline facets override a preset's
		// structured `gradient`). Built before the trigger so a gradient-only bg
		// (no image/video/preset-style) still raises the layer.
		const gradientDir = readMeta(tag, 'bg-gradient');
		const from = readMeta(tag, 'bg-from');
		const via = readMeta(tag, 'bg-via');
		const to = readMeta(tag, 'bg-to');
		const gradientType = readMeta(tag, 'bg-gradient-type');
		const presetGradient = resolvePreset(preset, presets)?.gradient;

		let gradient: string | null = null;
		if (gradientDir || from || via || to || gradientType) {
			// Inline facets override individual facets of the preset; stops fall back
			// to the preset's when the author didn't supply at least two inline.
			const inlineStops = [from, via, to].filter((s): s is string => !!s);
			gradient = buildBgGradient({
				type: gradientType ?? presetGradient?.type,
				direction: gradientDir ?? presetGradient?.direction,
				stops: inlineStops.length >= 2 ? inlineStops : (presetGradient?.stops ?? inlineStops),
			});
		} else if (presetGradient) {
			gradient = buildBgGradient(presetGradient);
		}

		// A scrim or a flat overlay can stand alone (a wash over the rune's own
		// content), so they also raise the bg/overlay layer. In cover mode the
		// scrim belongs to the media well, so it alone doesn't raise it here.
		const scrimDir = readMeta(tag, 'scrim');
		const overlay = readMeta(tag, 'bg-overlay');
		const isCover = ctx.axis('cover') === 'true';
		const scrim = scrimDir && scrimDir !== 'none' && !isCover;

		if (!(preset || src || video || gradient || scrim || overlay || guest)) return null;

		// Layer style — preset styles first, then explicit overrides.
		const presetStyles = resolvePreset(preset, presets)?.style ?? {};
		const styleParts: string[] = [];
		for (const [prop, value] of Object.entries(presetStyles)) styleParts.push(`${prop}: ${value}`);
		// Image takes the base layer when present; otherwise the gradient fills it.
		if (src) styleParts.push(`--bg-image: url(${src})`);
		else if (gradient) styleParts.push(`--bg-image: ${gradient}`);
		const position = readMeta(tag, 'bg-position');
		const blur = readMeta(tag, 'bg-blur');
		const fit = readMeta(tag, 'bg-fit');
		const opacity = readMeta(tag, 'bg-opacity');
		if (position) styleParts.push(`--bg-position: ${position}`);
		if (blur) styleParts.push(`--bg-blur: ${BLUR_PRESETS[blur] ?? blur}`);
		if (fit) styleParts.push(`--bg-fit: ${fit}`);
		if (opacity) styleParts.push(`--bg-opacity: ${opacity}`);

		const layerAttrs: Record<string, any> = { 'data-name': 'bg' };
		if (preset) layerAttrs['data-bg-preset'] = preset;
		if (styleParts.length) layerAttrs.style = styleParts.join('; ');
		if (readMeta(tag, 'bg-fixed')) layerAttrs['data-bg-fixed'] = '';

		const layerChildren: RendererNode[] = [];
		const warnings: FacetWarning[] = [];
		const dataAttrs: Record<string, string> = {};
		const state: Record<string, string> = {};

		if (video) {
			layerChildren.push(makeTag('video', {
				'data-name': 'bg-video',
				autoplay: '', muted: '', loop: '', playsinline: '',
				src: video,
				...(styleParts.length ? { style: styleParts.filter(s => !s.startsWith('--bg-image')).join('; ') } : {}),
			}));
		}

		// SPEC-104 — the relocated sandbox backdrop sits as a sibling of the
		// `bg-video` branch: above the `--bg-image` boot frame, below the
		// overlay/scrim appended after it.
		if (guest) layerChildren.push(guest);

		// overlay — a flat wash (SPEC-088 structured vocabulary): dark | light | a
		// token reference (+ overlay-opacity). Raw CSS still works but warns.
		if (overlay) {
			const overlayOpacity = readMeta(tag, 'bg-overlay-opacity');
			const overlayAttrs: Record<string, string> = { 'data-name': 'bg-overlay' };
			if (overlay === 'dark' || overlay === 'light') {
				overlayAttrs['data-bg-overlay'] = overlay;
				if (overlayOpacity) overlayAttrs.style = `opacity: ${overlayOpacity}`;
			} else if (TOKEN_REF.test(overlay)) {
				const parts = [`background: var(--rf-color-${overlay})`];
				if (overlayOpacity) parts.push(`opacity: ${overlayOpacity}`);
				overlayAttrs.style = parts.join('; ');
			} else {
				warnings.push({
					code: 'raw-css-overlay',
					message: `[refrakt] raw-CSS \`overlay\` on \`${ctx.rune}\` is deprecated (SPEC-088) — use \`overlay="dark|light|<token>"\` for a flat wash or \`scrim\` for a legibility gradient. The raw passthrough will be removed in a future minor.`,
					dedupeKey: ctx.rune,
				});
				overlayAttrs.style = `background: ${overlay}`;
			}
			layerChildren.push(makeTag('div', overlayAttrs));
		}

		// scrim — a structured legibility treatment (SPEC-088). On the bg overlay
		// layer here; cover mode (SPEC-089) routes the same facet to the media well.
		if (scrim) {
			const scrimType = readMeta(tag, 'scrim-type') ?? 'gradient';
			const scrimTone = readMeta(tag, 'scrim-tone') ?? 'dark';
			const scrimAttrs: Record<string, string> = {
				'data-name': 'scrim', 'data-scrim': scrimType,
				'data-scrim-tone': scrimTone, 'data-scrim-dir': scrimDir,
			};
			if (scrimType === 'frost') {
				const scrimBlur = readMeta(tag, 'scrim-blur') ?? 'md';
				scrimAttrs.style = `--scrim-blur: ${BLUR_PRESETS[scrimBlur] ?? BLUR_PRESETS.md}`;
			} else {
				const scrimStrength = readMeta(tag, 'scrim-strength') ?? 'md';
				scrimAttrs.style = `--scrim-strength: ${SCRIM_STRENGTH[scrimStrength] ?? SCRIM_STRENGTH.md}`;
			}
			layerChildren.push(makeTag('div', scrimAttrs));

			// Foreground polarity (SPEC-088): the overlaid content's text/muted
			// follow the scrim, not the base surface — a dark scrim yields light
			// text. Reuse the colour-scheme lever, which flips the full palette; a
			// scheme tint already claimed still wins.
			if (!ctx.axis('color-scheme')) {
				dataAttrs['data-color-scheme'] = scrimTone;
				state['color-scheme'] = scrimTone;
			}
		}

		dataAttrs['data-bg'] = '';

		return {
			classes: [`${ctx.block}--has-bg`],
			dataAttrs,
			consumes: BG_META,
			layers: [{ placement: 'before-content', element: makeTag('div', layerAttrs, layerChildren) }],
			...(guest ? { absorbs: [guest] } : {}),
			...(Object.keys(state).length ? { state } : {}),
			...(warnings.length ? { warnings } : {}),
		};
	},
};

/** Contract description (WORK-527).
 *
 *  `dataAttributes` lists what lands on the *rune root*. The injected elements
 *  carry their own (`data-bg-preset` and `data-bg-fixed` on the layer,
 *  `data-bg-overlay` on the wash, `data-scrim`/`data-scrim-tone`/`data-scrim-dir`
 *  on the scrim); the contract names the elements and leaves their internals to
 *  the elements themselves rather than flattening two surfaces into one list. */
export const bgAxis: UniversalAxisFacet = {
	axis: 'bg',
	describeAxis: () => ({
		description: 'The background layer (SPEC-088): image, video, gradient, flat overlay wash and legibility scrim, in a single injected layer behind the rune\'s content.',
		source: 'meta',
		inputs: BG_META,
		selectors: ['.{block}--has-bg'],
		dataAttributes: ['data-bg', 'data-color-scheme'],
		customProperties: ['--bg-image', '--bg-position', '--bg-blur', '--bg-fit', '--bg-opacity', '--scrim-strength', '--scrim-blur'],
		elements: ['[data-name="bg"]', '[data-name="bg-video"]', '[data-name="bg-overlay"]', '[data-name="scrim"]'],
		condition: 'the layer is raised only when a preset, image, video, gradient, overlay, scrim or `{% bg %}` sandbox guest resolves. In cover mode the scrim is routed to the media well instead, and `data-color-scheme` yields to a scheme a tint already claimed.',
	}),
	describeForRune: (_config, block) => ({ selectors: [`.${block}--has-bg`] }),
};
