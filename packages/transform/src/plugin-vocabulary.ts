/**
 * ADR-044 (WORK-673) — two reports on a plugin rune's own structure.
 *
 * A plugin rune speaks the theme vocabulary, and only its genuinely novel parts
 * bring structure of their own, written in theme tokens (tier 3). Neither
 * report is an error: a novel part is legitimate, and a literal in a plugin's
 * stylesheet is a step away from portability, not a fault.
 */
import type { RuneContract } from './contracts.js';
import type { RuneConfig } from './types.js';

/** Elements a rune's own `data-name` gives no vocabulary role, so no theme
 *  styles them unless it targets this rune: its novel parts.
 *
 *  An element carries vocabulary when it is a `blocks` zone (its layout is
 *  `data-zone-layout`), a section role (`sections`, `data-section`), a media
 *  slot (`mediaSlots`, `data-media`), or the ordinal a sequence numbers. */
export function novelElements(contract: RuneContract, config: RuneConfig): string[] {
	const roles = new Set<string>([
		...Object.keys(config.sections ?? {}),
		...Object.keys(config.mediaSlots ?? {}),
		'ordinal',
	]);
	const out: string[] = [];
	for (const [name, el] of Object.entries(contract.elements ?? {})) {
		if ((el as { source?: string }).source === 'block') continue;
		if (roles.has(name)) continue;
		out.push(name);
	}
	return out;
}

export type TokenFindingKind = 'colour' | 'size' | 'font';

export interface TokenFinding {
	kind: TokenFindingKind;
	/** 1-based line in the stylesheet. */
	line: number;
	/** The property the literal sits in. */
	property: string;
	/** The literal. */
	value: string;
}

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/gi;
const SIZE = /(?<![\w.-])(?:\d*\.)?\d+(?:px|rem|em|pt|vw|vh|ch)\b/g;

/** Strip `var(--x, fallback)` fallbacks: a literal there is a default the
 *  token overrides, not a value the stylesheet sets. */
function withoutFallbacks(value: string): string {
	let out = value;
	for (let prev = ''; prev !== out; ) {
		prev = out;
		out = out.replace(/var\(\s*--[\w-]+\s*,[^()]*\)/g, 'var()');
	}
	return out;
}

/**
 * ADR-044 — literal colours, sizes and font stacks in a stylesheet. A
 * stylesheet with none is written only in theme tokens, so it follows any
 * theme: a plugin that passes can say it is theme-portable. `0`, keywords and
 * `var()` fallbacks are not literals; a hairline (`1px`) border is.
 */
export function lintTokenOnly(css: string): TokenFinding[] {
	const findings: TokenFinding[] = [];
	const text = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
	const decl = /([\w-]+)\s*:\s*([^;{}]+)[;}]/g;
	for (let m = decl.exec(text); m; m = decl.exec(text)) {
		const property = m[1];
		if (property.startsWith('--')) continue; // defining a token is the point
		const value = withoutFallbacks(m[2]);
		const line = text.slice(0, m.index).split('\n').length;
		if (property === 'font-family' && !/^\s*(var\(|inherit|initial|unset)/.test(value)) {
			findings.push({ kind: 'font', line, property, value: value.trim() });
			continue;
		}
		for (const c of value.match(COLOUR) ?? []) {
			findings.push({ kind: 'colour', line, property, value: c });
		}
		for (const s of value.match(SIZE) ?? []) {
			findings.push({ kind: 'size', line, property, value: s });
		}
	}
	return findings;
}
