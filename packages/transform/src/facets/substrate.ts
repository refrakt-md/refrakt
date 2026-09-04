import type { SerializedTag } from '@refrakt-md/types';
import { readMeta, findMediaZone } from '../helpers.js';
import type { Facet, FacetStyle } from './types.js';
import { applyChromeToTag, hasMediaSection, type Chrome, type ChromeCarry, type ChromeTarget } from './chrome.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-087 — the substrate size and opacity scales.
 *
 *  These are theme decisions currently hard-coded in a framework-agnostic
 *  engine: a theme cannot change what `substrate-size="md"` means. Moved here
 *  with the facet rather than into a shared constants module, which would
 *  entrench them by making the hard-coding look deliberate. SPEC-124 files
 *  turning them into design tokens as follow-on work. */
const SUBSTRATE_CELL: Record<string, string> = { sm: '12px', md: '16px', lg: '24px' };
const SUBSTRATE_OPACITY: Record<string, string> = { sm: '0.25', md: '0.5', lg: '0.85' };

/** Read the `substrate` pattern + `substrate-*` facet metas and build the
 *  markers-only contract: `data-substrate` (+ `data-substrate-fill`) and the
 *  `--substrate-*` custom props. CSS draws the pattern. */
function resolveSubstrateChrome(tag: SerializedTag): { chrome: Chrome; targetOverride?: string } | null {
	const consumes: string[] = [];
	const read = (field: string): string | undefined => {
		const v = readMeta(tag, field);
		if (v !== undefined && v !== null) consumes.push(field);
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
	const styles: FacetStyle[] = [];
	if (size && SUBSTRATE_CELL[size]) styles.push(['--substrate-cell', SUBSTRATE_CELL[size]]);
	if (opacity && SUBSTRATE_OPACITY[opacity]) styles.push(['--substrate-opacity', SUBSTRATE_OPACITY[opacity]]);

	return { chrome: { dataAttrs, styles, consumes }, targetOverride };
}

const noMediaWarning = (rune: string) => ({
	code: 'substrate-no-media',
	message: `[refrakt] \`substrate-target="media"\` on \`${rune}\` has no media section — substrate ignored.`,
	dedupeKey: rune,
});

/** `substrate` — SPEC-087 generated pattern fills.
 *
 *  Defaults to the self surface (a background is "behind everything"); the
 *  media well is opted into via `substrate-target="media"`, and a per-instance
 *  override always beats the rune's configured default. Like `frame`, it
 *  resolves early and applies to a surface chosen at resolve time. */
export const substrateFacet: Facet = {
	name: 'substrate',

	resolve(ctx) {
		const resolved = resolveSubstrateChrome(ctx.tag);
		if (!resolved) return null;
		const { chrome, targetOverride } = resolved;

		let target: ChromeTarget = (targetOverride === 'self' || targetOverride === 'media')
			? targetOverride
			: (ctx.config.substrateTarget ?? 'self');

		const warnings = [];
		if (target === 'media' && !hasMediaSection(ctx.config.sections)) {
			warnings.push(noMediaWarning(ctx.rune));
			target = null;
		}

		return {
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
		if (!mediaZone) return [noMediaWarning(ctx.rune)];
		applyChromeToTag(mediaZone, chrome);
	},
};

/** Contract description (WORK-527). Unlike `frame`, substrate always has a
 *  surface — it defaults to the rune root — so it is never unavailable; only
 *  its configured target varies. */
export const substrateAxis: UniversalAxisFacet = {
	axis: 'substrate',
	contract: {
		description: 'Generated pattern fills (SPEC-087). Markers only — the engine sets the attributes and cell/opacity custom properties, CSS draws the pattern.',
		source: 'meta',
		inputs: ['substrate', 'substrate-size', 'substrate-opacity', 'substrate-fill', 'substrate-target'],
		dataAttributes: ['data-substrate', 'data-substrate-fill'],
		customProperties: ['--substrate-cell', '--substrate-opacity'],
		condition: 'defaults to the rune root. `substrate-target="media"` moves it to the media zone, and is dropped with a warning on a rune with no media section. The facets are inert without a `substrate` pattern.',
	},
	describeForRune: (config) => {
		if (config.substrateTarget !== 'media') return null;
		if (!hasMediaSection(config.sections)) return 'this rune targets the media zone but declares no media section';
		return { target: '[data-section="media"]' };
	},
};
