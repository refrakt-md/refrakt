import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import type { ThemeConfig, StructureEntry } from '@refrakt-md/transform';

/** A single metadata field found in a rune config */
export interface MetaField {
	rune: string;
	block: string;
	ref: string;
	metaType: string;
	metaRank?: string;
	hasSentiment: boolean;
	sentimentValues?: string[];
}

/** CSS coverage for metadata selectors */
export interface MetaCssCoverage {
	types: Record<string, { styled: boolean; file?: string; line?: number }>;
	sentiments: Record<string, { styled: boolean; file?: string; line?: number }>;
	ranks: Record<string, { styled: boolean; file?: string; line?: number }>;
}

/** Full metadata audit result */
export interface MetaAuditResult {
	fields: MetaField[];
	typeCount: Record<string, number>;
	rankCount: Record<string, number>;
	withSentiment: number;
	withoutSentiment: number;
	css?: MetaCssCoverage;
}

/** Walk all rune configs and collect structure entries with metadata annotations */
export function collectMetadata(config: ThemeConfig): Omit<MetaAuditResult, 'css'> {
	const fields: MetaField[] = [];
	const typeCount: Record<string, number> = {};
	const rankCount: Record<string, number> = {};
	let withSentiment = 0;
	let withoutSentiment = 0;

	for (const [runeKey, runeConfig] of Object.entries(config.runes)) {
		if (!runeConfig.structure) continue;

		for (const [key, entry] of Object.entries(runeConfig.structure)) {
			collectFromEntry(entry, key, runeKey, runeConfig.block, fields);
		}
	}

	for (const field of fields) {
		typeCount[field.metaType] = (typeCount[field.metaType] || 0) + 1;
		if (field.metaRank) {
			rankCount[field.metaRank] = (rankCount[field.metaRank] || 0) + 1;
		}
		if (field.hasSentiment) {
			withSentiment++;
		} else {
			withoutSentiment++;
		}
	}

	return { fields, typeCount, rankCount, withSentiment, withoutSentiment };
}

/** Recursively collect metadata fields from a structure entry and its children */
function collectFromEntry(
	entry: StructureEntry,
	key: string,
	runeKey: string,
	block: string,
	fields: MetaField[],
): void {
	if (entry.metaType) {
		fields.push({
			rune: runeKey,
			block,
			ref: entry.ref ?? key,
			metaType: entry.metaType,
			metaRank: entry.metaRank,
			hasSentiment: !!entry.sentimentMap,
			sentimentValues: entry.sentimentMap ? Object.keys(entry.sentimentMap) : undefined,
		});
	}

	if (entry.children) {
		for (const child of entry.children) {
			if (typeof child !== 'string') {
				collectFromEntry(child, child.ref ?? '', runeKey, block, fields);
			}
		}
	}
}

const META_ATTR_RE = /\[data-meta-[\w-]+(?:="[^"]*")?\]/g;

/** Check CSS files for metadata dimension selectors */
export function checkMetaCss(cssDir: string): MetaCssCoverage {
	const selectors = new Map<string, { file: string; line: number }>();

	// Check both runes/ and dimensions/ directories
	const dirs = [cssDir];
	const dimensionsDir = join(dirname(cssDir), 'dimensions');
	if (existsSync(dimensionsDir)) {
		dirs.push(dimensionsDir);
	}

	// Also try resolving from @refrakt-md/lumina
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
				for (const m of rule.selector.matchAll(META_ATTR_RE)) {
					if (!selectors.has(m[0])) {
						selectors.set(m[0], { file, line });
					}
				}
			});
		}
	}

	const EXPECTED_TYPES = ['status', 'category', 'quantity', 'temporal', 'tag', 'id'];
	const EXPECTED_SENTIMENTS = ['positive', 'negative', 'caution', 'neutral'];
	const EXPECTED_RANKS = ['primary', 'secondary'];

	const types: MetaCssCoverage['types'] = {};
	for (const type of EXPECTED_TYPES) {
		const sel = `[data-meta-type="${type}"]`;
		const match = selectors.get(sel);
		types[type] = match ? { styled: true, file: match.file, line: match.line } : { styled: false };
	}

	const sentiments: MetaCssCoverage['sentiments'] = {};
	for (const sentiment of EXPECTED_SENTIMENTS) {
		const sel = `[data-meta-sentiment="${sentiment}"]`;
		const match = selectors.get(sel);
		sentiments[sentiment] = match ? { styled: true, file: match.file, line: match.line } : { styled: false };
	}

	const ranks: MetaCssCoverage['ranks'] = {};
	for (const rank of EXPECTED_RANKS) {
		const sel = `[data-meta-rank="${rank}"]`;
		const match = selectors.get(sel);
		ranks[rank] = match ? { styled: true, file: match.file, line: match.line } : { styled: false };
	}

	return { types, sentiments, ranks };
}
