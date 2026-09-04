import type { SerializedTag } from '@refrakt-md/types';
import { readMeta, resolveOffset, parsePlacement, findMediaZone } from '../helpers.js';
import type { FramePresetDefinition } from '../types.js';
import type { Facet, FacetContext, FacetStyle } from './types.js';
import { applyChromeToTag, hasMediaSection, type Chrome, type ChromeCarry, type ChromeTarget } from './chrome.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-086 — the frame facet vocabulary: the inline `frame-*` overrides that
 *  sit beside a named `frame` preset. */
export const FRAME_FACET_META = [
	'frame-aspect', 'frame-displace', 'frame-displace-mode', 'frame-offset',
	'frame-oversize', 'frame-place', 'frame-anchor', 'frame-overflow', 'frame-shadow',
] as const;

/** Read the `frame` preset + `frame-*` facet metas, resolve the preset (one
 *  `extends` level) with inline overrides on top, and build the chrome
 *  contract. Returns null when no frame meta is present at all. */
function resolveFrameChrome(
	tag: SerializedTag,
	frames: Record<string, FramePresetDefinition>,
	guestFit?: string,
): Chrome | null {
	const consumes: string[] = [];
	const read = (field: string): string | undefined => {
		const v = readMeta(tag, field);
		if (v !== undefined && v !== null) consumes.push(field);
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

	if (consumes.length === 0) return null;

	// A displaced guest defaults to its host's containment mode: a bleed host
	// (guestFit: 'bleed', e.g. hero/feature) spills, a clip host crops to a peek.
	// An explicit `frame-displace-mode=` still wins. This is the displace face of
	// the same clip-vs-bleed axis as `data-guest-fit`, so a hero no longer needs
	// `frame-displace-mode="bleed"` spelled out.
	if (facets.displace && !(facets as Record<string, string>).displaceMode && guestFit === 'bleed') {
		(facets as Record<string, string>).displaceMode = 'bleed';
	}

	const dataAttrs: Record<string, string> = {};
	const styles: FacetStyle[] = [];
	if (presetName) dataAttrs['data-frame'] = presetName;
	if (facets.displace) dataAttrs['data-displace'] = facets.displace;
	if ((facets as Record<string, string>).displaceMode) dataAttrs['data-displace-mode'] = (facets as Record<string, string>).displaceMode;
	if (facets.shadow) dataAttrs['data-frame-shadow'] = facets.shadow;
	// `frame-overflow="bleed"` — a content-overflow policy on the media frame.
	// Only meaningful on a bleed host (the clip host's media well crops the
	// over-width); the facet strips it + warns on a clip host.
	if (facets.overflow === 'bleed') dataAttrs['data-frame-overflow'] = 'bleed';
	if (facets.aspect) styles.push(['--frame-aspect', facets.aspect]);
	if (facets.offset) styles.push(['--frame-offset', resolveOffset(facets.offset)]);
	if (facets.oversize) styles.push(['--frame-oversize', facets.oversize]);
	if (facets.anchor) styles.push(['--frame-anchor', facets.anchor]);
	if (facets.place) {
		const { x, y } = parsePlacement(facets.place);
		styles.push(['--frame-place-x', x], ['--frame-place-y', y]);
	}

	return { dataAttrs, styles, consumes };
}

const noTargetWarning = (rune: string) => ({
	code: 'frame-no-target',
	message: `[refrakt] \`frame\` on \`${rune}\` has no frame target — set \`frameTarget\` or give the rune a media section. Frame chrome ignored.`,
	dedupeKey: rune,
});

/** `frame` — SPEC-086 surface chrome.
 *
 *  Resolves early against the rune tag but applies to a surface chosen at
 *  resolve time: `self` lands on the rune root (available now, so emitted from
 *  `resolve`), `media` lands on the `[data-section="media"]` zone, which does
 *  not exist until the children are assembled — hence `postAssemble`. */
export const frameFacet: Facet = {
	name: 'frame',

	resolve(ctx: FacetContext) {
		const chrome = resolveFrameChrome(ctx.tag, ctx.theme.frames, ctx.config.guestFit);
		if (!chrome) return null;

		const warnings = [];
		let target: ChromeTarget = ctx.config.frameTarget ?? (hasMediaSection(ctx.config.sections) ? 'media' : null);
		if (!target) warnings.push(noTargetWarning(ctx.rune));

		// SPEC-116 — `frame-overflow="bleed"` only does anything on a bleed host
		// (the clip host's media well crops the over-width). On a clip host, strip
		// the inert marker so output stays clean, and warn once.
		if (chrome.dataAttrs['data-frame-overflow'] === 'bleed' && ctx.config.guestFit !== 'bleed') {
			delete chrome.dataAttrs['data-frame-overflow'];
			warnings.push({
				code: 'frame-overflow-on-clip-host',
				message: `[refrakt] \`frame-overflow="bleed"\` has no effect on \`${ctx.rune}\` — a clip host crops its media guest. Use it on a bleed host (hero, feature), or drop it.`,
				dedupeKey: ctx.rune,
			});
		}

		return {
			// Consumed whether or not the chrome lands anywhere, so an untargeted
			// frame's metas cannot leak into output.
			consumes: chrome.consumes,
			...(target === 'self' ? { dataAttrs: chrome.dataAttrs, styles: chrome.styles } : {}),
			...(warnings.length ? { warnings } : {}),
			carry: { chrome, target } satisfies ChromeCarry,
		};
	},

	postAssemble(ctx, children, carry) {
		const { chrome, target } = (carry ?? {}) as Partial<ChromeCarry>;
		if (!chrome || target !== 'media') return;

		const mediaZone = findMediaZone(children);
		if (!mediaZone) return [noTargetWarning(ctx.rune)];
		applyChromeToTag(mediaZone, chrome);
	},
};

/** Contract description (WORK-527). The rune-level half is the *target*: which
 *  surface the chrome lands on is entirely a config decision, and a rune with
 *  neither a `frameTarget` nor a media section can carry no frame at all. */
export const frameAxis: UniversalAxisFacet = {
	axis: 'frame',
	describeAxis: () => ({
		description: 'Surface chrome (SPEC-086): a named preset from the theme registry with inline `frame-*` overrides layered on top.',
		source: 'meta',
		inputs: ['frame', ...FRAME_FACET_META],
		dataAttributes: ['data-frame', 'data-displace', 'data-displace-mode', 'data-frame-shadow', 'data-frame-overflow'],
		customProperties: ['--frame-aspect', '--frame-offset', '--frame-oversize', '--frame-anchor', '--frame-place-x', '--frame-place-y'],
		condition: 'lands on the surface named by `frameTarget`, defaulting to the media zone when the rune declares one. With no target the metas are still consumed but the chrome is dropped with a warning. `data-frame-overflow="bleed"` is stripped with a warning on a clip host.',
	}),
	describeForRune: (config) => {
		const target = config.frameTarget ?? (hasMediaSection(config.sections) ? 'media' : null);
		if (!target) return 'this rune declares neither a `frameTarget` nor a media section';
		return { target: target === 'self' ? 'the rune root' : '[data-section="media"]' };
	},
};
