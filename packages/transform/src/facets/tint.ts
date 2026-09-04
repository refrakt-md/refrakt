import { readMeta } from '../helpers.js';
import type { Facet, FacetStyle } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-053 — the six tint colour tokens.
 *
 *  Each maps to a matching `--rf-color-*` token via the same dot-to-dash rule
 *  the token contract uses. See `TintTokens` in `../types.ts` for the
 *  field-to-token mapping table. */
export const TINT_TOKENS = ['bg', 'surface', 'text', 'muted', 'primary', 'border'] as const;

export type TintToken = (typeof TINT_TOKENS)[number];

/** `tint` — SPEC-053 per-rune colour override.
 *
 *  Resolves a named tint from the theme registry, layers inline `tint-<token>`
 *  metas on top, and emits the `--tint-*` custom properties plus the markers
 *  the cascade reads (`data-tint`, `data-color-scheme`, `data-tint-dark`).
 *
 *  Publishes `color-scheme` as facet state — not as an emitted axis, since the
 *  attribute is set directly — so that `cover` (and the background layer, once
 *  it migrates) can tell whether the scheme has already been claimed rather
 *  than clobbering it. */
export const tintFacet: Facet = {
	name: 'tint',

	appliesTo: (ctx) => Boolean(readMeta(ctx.tag, 'tint') || readMeta(ctx.tag, 'tint-mode')),

	resolve(ctx) {
		const tintName = readMeta(ctx.tag, 'tint');
		const tintMode = readMeta(ctx.tag, 'tint-mode');

		const lightTokens: Record<string, string> = {};
		const darkTokens: Record<string, string> = {};
		let resolvedMode = tintMode;

		// A named definition seeds the token sets; `custom` means "inline only".
		const definition = tintName && tintName !== 'custom' ? ctx.theme.tints[tintName] : undefined;
		if (definition) {
			for (const [k, v] of Object.entries(definition.light ?? {})) {
				if (v) lightTokens[k] = v;
			}
			for (const [k, v] of Object.entries(definition.dark ?? {})) {
				if (v) darkTokens[k] = v;
			}
			if (!resolvedMode && definition.lockMode) resolvedMode = definition.lockMode;
		}

		// Inline token metas override the preset's values, token by token.
		const consumes = ['tint', 'tint-mode'];
		for (const token of TINT_TOKENS) {
			const light = readMeta(ctx.tag, `tint-${token}`);
			if (light) {
				lightTokens[token] = light;
				consumes.push(`tint-${token}`);
			}
			const dark = readMeta(ctx.tag, `tint-dark-${token}`);
			if (dark) {
				darkTokens[token] = dark;
				consumes.push(`tint-dark-${token}`);
			}
		}

		const hasTokens = Object.keys(lightTokens).length > 0;

		const dataAttrs: Record<string, string> = {};
		if (tintName || hasTokens) dataAttrs['data-tint'] = tintName || 'custom';
		// `auto` is the absence of a lock, so it is not worth an attribute.
		if (resolvedMode && resolvedMode !== 'auto') dataAttrs['data-color-scheme'] = resolvedMode;
		if (Object.keys(darkTokens).length > 0) dataAttrs['data-tint-dark'] = '';

		const styles: FacetStyle[] = [];
		for (const [token, value] of Object.entries(lightTokens)) styles.push([`--tint-${token}`, value]);
		for (const [token, value] of Object.entries(darkTokens)) styles.push([`--tint-dark-${token}`, value]);

		return {
			consumes,
			dataAttrs,
			styles,
			// Only when colour tokens actually resolved — a bare `tint-mode` locks
			// the scheme without tinting anything, and should not read as tinted.
			...(hasTokens || definition ? { classes: [`${ctx.block}--tinted`] } : {}),
			...(dataAttrs['data-color-scheme'] ? { state: { 'color-scheme': dataAttrs['data-color-scheme'] } } : {}),
		};
	},
};

/** Contract description (WORK-527). `{token}` expands over
 *  {@link TINT_TOKENS} — the same list the facet resolves against. */
export const tintAxis: UniversalAxisFacet = {
	axis: 'tint',
	describeAxis: () => ({
		description: 'Per-rune colour override (SPEC-053): a named tint from the theme registry, with inline per-token overrides layered on top.',
		source: 'meta',
		inputs: ['tint', 'tint-mode', 'tint-{token}', 'tint-dark-{token}'],
		tokens: TINT_TOKENS,
		selectors: ['.{block}--tinted'],
		dataAttributes: ['data-tint', 'data-color-scheme', 'data-tint-dark'],
		customProperties: ['--tint-{token}', '--tint-dark-{token}'],
		condition: 'the `--tinted` class only when colour tokens actually resolve — a bare `tint-mode` locks the colour scheme without tinting anything',
	}),
	describeForRune: (_config, block) => ({ selectors: [`.${block}--tinted`] }),
};
