import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import type { ThemeConfig } from '@refrakt-md/transform';

/** Surface group assignment */
export interface SurfaceGroup {
	name: string;
	runes: string[];
}

/** Dimension CSS coverage entry */
export interface DimCssEntry {
	styled: boolean;
	file?: string;
	line?: number;
}

/** Full dimension audit result */
export interface DimensionAuditResult {
	/** Surface assignments: runes grouped by surface type */
	surfaces: SurfaceGroup[];
	/** Runes with no surface assignment in CSS */
	unassignedRunes: string[];

	/** Density: which levels are declared in configs */
	densityLevels: Record<string, number>;

	/** Section anatomy: which roles are declared in configs */
	sectionRoles: Record<string, number>;

	/** Interactive state: runes with data-state in rootAttributes */
	interactiveRunes: string[];

	/** Media slots: which slot types are declared and by which runes */
	mediaSlots: Record<string, string[]>;

	/** Sequential items: which sequence styles are declared and by which runes */
	sequenceStyles: Record<string, string[]>;

	/** CSS coverage for dimension selectors */
	css?: DimensionCssCoverage;
}

/** CSS coverage for all dimension selectors */
export interface DimensionCssCoverage {
	density: Record<string, DimCssEntry>;
	sections: Record<string, DimCssEntry>;
	states: Record<string, DimCssEntry>;
	media: Record<string, DimCssEntry>;
	sequence: Record<string, DimCssEntry>;
}

const DENSITY_LEVELS = ['full', 'compact', 'minimal'] as const;
const SECTION_ROLES = ['header', 'title', 'description', 'body', 'footer', 'media'] as const;
const STATE_VALUES = ['open', 'closed', 'active', 'inactive', 'selected', 'disabled'] as const;
const MEDIA_SLOTS = ['portrait', 'cover', 'thumbnail', 'hero', 'icon'] as const;
const SEQUENCE_VALUES = ['numbered', 'connected', 'plain'] as const;

/** Collect dimension declarations from all rune configs */
export function collectDimensions(config: ThemeConfig): Omit<DimensionAuditResult, 'css' | 'surfaces' | 'unassignedRunes'> {
	const densityLevels: Record<string, number> = {};
	const sectionRoles: Record<string, number> = {};
	const interactiveRunes: string[] = [];
	const mediaSlots: Record<string, string[]> = {};
	const sequenceStyles: Record<string, string[]> = {};

	for (const [runeKey, runeConfig] of Object.entries(config.runes)) {
		// Density
		const density = runeConfig.defaultDensity ?? 'full';
		densityLevels[density] = (densityLevels[density] || 0) + 1;

		// Section anatomy
		if (runeConfig.sections) {
			for (const role of Object.values(runeConfig.sections)) {
				sectionRoles[role] = (sectionRoles[role] || 0) + 1;
			}
		}

		// Interactive state (rootAttributes with data-state)
		if (runeConfig.rootAttributes?.['data-state']) {
			interactiveRunes.push(runeKey);
		}

		// Media slots
		if (runeConfig.mediaSlots) {
			for (const [ref, slotType] of Object.entries(runeConfig.mediaSlots)) {
				if (!mediaSlots[slotType]) mediaSlots[slotType] = [];
				mediaSlots[slotType].push(`${runeKey}.${ref}`);
			}
		}

		// Sequence styles
		if (runeConfig.sequence) {
			if (!sequenceStyles[runeConfig.sequence]) sequenceStyles[runeConfig.sequence] = [];
			sequenceStyles[runeConfig.sequence].push(runeKey);
		}
	}

	return { densityLevels, sectionRoles, interactiveRunes, mediaSlots, sequenceStyles };
}

const SURFACE_RE = /\.rf-[\w-]+/g;
const DIM_ATTR_RE = /\[data-(?:density|section|state|media|sequence(?:-direction)?)(?:="[^"]*")?\]/g;

/** Scan CSS for surface assignments and dimension selectors */
export function checkDimensionCss(cssDir: string): { surfaces: SurfaceGroup[]; unassignedRunes: string[]; css: DimensionCssCoverage } {
	const dimSelectors = new Map<string, { file: string; line: number }>();

	// Surface detection: track which runes appear in which surface-like rule groups
	const surfaceRunes = new Map<string, Set<string>>();
	const allStyledRunes = new Set<string>();

	// Collect CSS directories to scan
	const dirs = [cssDir];
	const dimensionsDir = join(dirname(cssDir), 'dimensions');
	if (existsSync(dimensionsDir)) {
		dirs.push(dimensionsDir);
	}

	try {
		const require = createRequire(import.meta.url);
		const luminaPkg = require.resolve('@refrakt-md/lumina/package.json');
		const luminaDimDir = join(dirname(luminaPkg), 'styles', 'dimensions');
		if (existsSync(luminaDimDir) && !dirs.includes(luminaDimDir)) {
			dirs.push(luminaDimDir);
		}
	} catch {
		// Package not found
	}

	for (const dir of dirs) {
		if (!existsSync(dir)) continue;
		const files = readdirSync(dir).filter(f => f.endsWith('.css'));
		for (const file of files) {
			const content = readFileSync(join(dir, file), 'utf-8');
			const root = postcss.parse(content);
			root.walkRules((rule) => {
				const line = rule.source?.start?.line ?? 0;

				// Collect dimension attribute selectors
				for (const m of rule.selector.matchAll(DIM_ATTR_RE)) {
					if (!dimSelectors.has(m[0])) {
						dimSelectors.set(m[0], { file, line });
					}
				}

				// Detect surface groupings (rules in surfaces.css with multiple .rf-* selectors)
				if (file === 'surfaces.css') {
					const runeClasses = [...rule.selector.matchAll(SURFACE_RE)].map(m => m[0]);
					if (runeClasses.length > 0) {
						// Determine surface type from CSS properties
						const surfaceName = detectSurfaceType(rule);
						for (const cls of runeClasses) {
							const runeName = cls.replace(/^\.rf-/, '');
							allStyledRunes.add(runeName);
							if (surfaceName) {
								const set = surfaceRunes.get(surfaceName) ?? new Set();
								set.add(runeName);
								surfaceRunes.set(surfaceName, set);
							}
						}
					}
				}
			});
		}
	}

	// Build surface groups
	const surfaces: SurfaceGroup[] = [];
	for (const [name, runes] of surfaceRunes.entries()) {
		surfaces.push({ name, runes: [...runes].sort() });
	}

	// Build CSS coverage
	const density: DimensionCssCoverage['density'] = {};
	for (const level of DENSITY_LEVELS) {
		const sel = `[data-density="${level}"]`;
		const match = dimSelectors.get(sel);
		density[level] = match ? { styled: true, file: match.file, line: match.line } : { styled: false };
	}

	const sections: DimensionCssCoverage['sections'] = {};
	for (const role of SECTION_ROLES) {
		const sel = `[data-section="${role}"]`;
		const match = dimSelectors.get(sel);
		sections[role] = match ? { styled: true, file: match.file, line: match.line } : { styled: false };
	}

	const states: DimensionCssCoverage['states'] = {};
	for (const state of STATE_VALUES) {
		const sel = `[data-state="${state}"]`;
		const match = dimSelectors.get(sel);
		states[state] = match ? { styled: true, file: match.file, line: match.line } : { styled: false };
	}

	const media: DimensionCssCoverage['media'] = {};
	for (const slot of MEDIA_SLOTS) {
		const sel = `[data-media="${slot}"]`;
		const match = dimSelectors.get(sel);
		media[slot] = match ? { styled: true, file: match.file, line: match.line } : { styled: false };
	}

	const sequence: DimensionCssCoverage['sequence'] = {};
	for (const seq of SEQUENCE_VALUES) {
		const sel = `[data-sequence="${seq}"]`;
		const match = dimSelectors.get(sel);
		sequence[seq] = match ? { styled: true, file: match.file, line: match.line } : { styled: false };
	}

	return {
		surfaces,
		unassignedRunes: [], // Filled in by the caller after comparing with config
		css: { density, sections, states, media, sequence },
	};
}

/** Detect surface type from CSS rule properties */
function detectSurfaceType(rule: postcss.Rule): string | null {
	const selector = rule.selector;
	// Use comment before the rule or the rule itself to detect
	const prevNode = rule.prev();
	const comment = prevNode && prevNode.type === 'comment' ? prevNode.text.toLowerCase() : '';

	if (comment.includes('card') || selector.includes('card')) return 'card';
	if (comment.includes('inline')) return 'inline';
	if (comment.includes('banner')) return 'banner';
	if (comment.includes('inset')) return 'inset';

	// Fallback: detect from properties
	let hasBorder = false;
	let hasBorderRadius = false;
	let hasPaddingZero = false;

	rule.walkDecls((decl) => {
		if (decl.prop === 'border' && decl.value.includes('solid')) hasBorder = true;
		if (decl.prop === 'border-radius') hasBorderRadius = true;
		if (decl.prop === 'padding' && decl.value.endsWith(' 0')) hasPaddingZero = true;
	});

	if (hasBorder && hasBorderRadius) return 'card';
	if (hasPaddingZero && !hasBorder) return 'banner';
	if (hasBorderRadius && !hasBorder) return 'inset';
	if (!hasBorder && !hasBorderRadius) return 'inline';

	return null;
}
