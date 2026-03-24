import type { RuneConfig, ThemeConfig } from '@refrakt-md/transform';
import type { AuditResult } from './css-audit.js';
import type { MetaAuditResult } from './meta-audit.js';
import type { DimensionAuditResult, DimCssEntry } from './dimension-audit.js';

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

/** Format the "Config Applied" section showing what the identity transform does */
export function formatConfig(runeTypeof: string, config: ThemeConfig): string {
	const runeConfig = config.runes[runeTypeof];
	if (!runeConfig) {
		return `  ${DIM}No config found for ${runeTypeof}${RESET}`;
	}

	const lines: string[] = [];
	lines.push(`  ${DIM}block:${RESET}            ${runeConfig.block}`);

	// Modifiers
	if (runeConfig.modifiers && Object.keys(runeConfig.modifiers).length > 0) {
		const mods = Object.entries(runeConfig.modifiers)
			.map(([name, mod]) => {
				const def = mod.default ? ` (default: ${mod.default})` : '';
				return `${name} from ${mod.source}${def}`;
			})
			.join(', ');
		lines.push(`  ${DIM}modifiers:${RESET}        ${mods}`);
	} else {
		lines.push(`  ${DIM}modifiers:${RESET}        ${DIM}none${RESET}`);
	}

	// Structure
	if (runeConfig.structure && Object.keys(runeConfig.structure).length > 0) {
		const structs = Object.entries(runeConfig.structure)
			.map(([name, entry]) => {
				const children = entry.children
					? entry.children.map(c => typeof c === 'string' ? c : (c.ref ?? '?')).join(' + ')
					: name;
				const pos = entry.before ? 'before' : 'after';
				return `${name} → ${children} (${pos})`;
			})
			.join(', ');
		lines.push(`  ${DIM}structure:${RESET}        ${structs}`);
	} else {
		lines.push(`  ${DIM}structure:${RESET}        ${DIM}none${RESET}`);
	}

	// Content wrapper
	if (runeConfig.contentWrapper) {
		lines.push(`  ${DIM}contentWrapper:${RESET}   ${runeConfig.contentWrapper.tag}[ref=${runeConfig.contentWrapper.ref}]`);
	} else {
		lines.push(`  ${DIM}contentWrapper:${RESET}   ${DIM}none${RESET}`);
	}

	// Context modifiers
	if (runeConfig.contextModifiers && Object.keys(runeConfig.contextModifiers).length > 0) {
		const ctx = Object.entries(runeConfig.contextModifiers)
			.map(([parent, suffix]) => `${parent} → ${suffix}`)
			.join(', ');
		lines.push(`  ${DIM}contextModifiers:${RESET} ${ctx}`);
	}

	// Root attributes
	if (runeConfig.rootAttributes && Object.keys(runeConfig.rootAttributes).length > 0) {
		const attrs = Object.entries(runeConfig.rootAttributes)
			.map(([k, v]) => `${k}="${v}"`)
			.join(', ');
		lines.push(`  ${DIM}rootAttributes:${RESET}   ${attrs}`);
	}

	// Static modifiers
	if (runeConfig.staticModifiers && runeConfig.staticModifiers.length > 0) {
		lines.push(`  ${DIM}staticModifiers:${RESET}  ${runeConfig.staticModifiers.join(', ')}`);
	}

	// Styles mapping
	if (runeConfig.styles && Object.keys(runeConfig.styles).length > 0) {
		const styles = Object.entries(runeConfig.styles)
			.map(([mod, prop]) => `${mod} → ${prop}`)
			.join(', ');
		lines.push(`  ${DIM}styles:${RESET}           ${styles}`);
	}

	return lines.join('\n');
}

/** Format the selector list with visual grouping */
export function formatSelectors(selectors: string[]): string {
	return selectors.map(s => {
		if (s.startsWith('[')) return `  ${YELLOW}${s}${RESET}`;
		if (s.includes('__')) return `  ${CYAN}${s}${RESET}`;
		if (s.includes('--')) return `  ${GREEN}${s}${RESET}`;
		return `  ${BOLD}${s}${RESET}`;
	}).join('\n');
}

/** Format a section heading */
export function heading(text: string): string {
	return `\n${BOLD}${text}${RESET}`;
}

/** Format the input Markdoc source (indented) */
export function formatInput(source: string): string {
	return source.split('\n').map(line => `  ${DIM}${line}${RESET}`).join('\n');
}

/** Format the HTML output (indented, already pretty-printed) */
export function formatHtml(html: string): string {
	return html.split('\n').map(line => `  ${line}`).join('\n');
}

/** Format the rune list for --list mode */
export function formatRuneList(runes: Array<{ name: string; aliases: string[]; description: string; variants: Record<string, string[]> }>): string {
	const lines: string[] = [];

	for (const rune of runes) {
		const aliasStr = rune.aliases.length > 0 ? ` ${DIM}(${rune.aliases.join(', ')})${RESET}` : '';
		lines.push(`  ${BOLD}${rune.name}${RESET}${aliasStr}`);

		if (rune.description) {
			lines.push(`    ${rune.description}`);
		}

		if (Object.keys(rune.variants).length > 0) {
			for (const [attr, values] of Object.entries(rune.variants)) {
				lines.push(`    ${DIM}${attr}:${RESET} ${values.join(', ')}`);
			}
		}

		lines.push('');
	}

	return lines.join('\n');
}

/** Build JSON output matching the spec format */
export function buildJsonOutput(opts: {
	rune: string;
	theme: string;
	input: string;
	config: RuneConfig | undefined;
	html: string;
	selectors: string[];
}): object {
	return {
		rune: opts.rune,
		theme: opts.theme,
		input: opts.input,
		config: opts.config ? {
			block: opts.config.block,
			modifiers: opts.config.modifiers ?? {},
			structure: opts.config.structure ?? {},
			contentWrapper: opts.config.contentWrapper ?? null,
			contextModifiers: opts.config.contextModifiers ?? {},
			rootAttributes: opts.config.rootAttributes ?? {},
			staticModifiers: opts.config.staticModifiers ?? [],
			styles: opts.config.styles ?? {},
		} : null,
		html: opts.html,
		selectors: opts.selectors,
	};
}

/** Format a single-rune audit result */
export function formatAuditResult(result: AuditResult, theme: string): string {
	const lines: string[] = [];
	lines.push(heading(`CSS Coverage: ${result.rune} (${theme})`));
	lines.push('');

	// Find the longest selector for alignment
	const selectors = Object.keys(result.selectors);
	const maxLen = Math.max(...selectors.map(s => s.length));

	for (const [sel, info] of Object.entries(result.selectors)) {
		const padded = sel.padEnd(maxLen + 2);
		if (info.styled) {
			lines.push(`  ${GREEN}\u2713${RESET} ${padded} ${DIM}\u2192 ${info.file}:${info.line}${RESET}`);
		} else {
			lines.push(`  ${RED}\u2717${RESET} ${padded} ${RED}NOT STYLED${RESET}`);
		}
	}

	lines.push('');
	const pct = result.total > 0 ? Math.round((result.styled / result.total) * 100) : 0;
	const statusIcon = result.status === 'complete' ? `${GREEN}\u2713 complete${RESET}`
		: result.status === 'partial' ? `${YELLOW}\u26a0 ${result.total - result.styled} unstyled${RESET}`
		: `${RED}\u2717 not started${RESET}`;
	lines.push(`  Coverage: ${result.styled}/${result.total} selectors (${pct}%)  ${statusIcon}`);

	return lines.join('\n');
}

/** Format the full-theme audit summary */
export function formatAuditSummary(results: AuditResult[], theme: string): string {
	const lines: string[] = [];
	lines.push(heading(`Theme Audit: ${theme}`));
	lines.push('');

	// Find the longest rune name for alignment
	const maxNameLen = Math.max(...results.map(r => r.rune.length));

	for (const r of results) {
		const name = r.rune.padEnd(maxNameLen + 2);
		const fraction = `${r.styled}/${r.total}`.padStart(7);
		const statusIcon = r.status === 'complete' ? `${GREEN}\u2713 complete${RESET}`
			: r.status === 'partial' ? `${YELLOW}\u26a0 ${r.total - r.styled} unstyled${RESET}`
			: `${RED}\u2717 not started${RESET}`;
		lines.push(`  ${name} ${fraction}  selectors   ${statusIcon}`);
	}

	// Summary
	const totalSelectors = results.reduce((sum, r) => sum + r.total, 0);
	const totalStyled = results.reduce((sum, r) => sum + r.styled, 0);
	const complete = results.filter(r => r.status === 'complete').length;
	const partial = results.filter(r => r.status === 'partial').length;
	const notStarted = results.filter(r => r.status === 'not-started').length;
	const pct = totalSelectors > 0 ? Math.round((totalStyled / totalSelectors) * 100) : 0;

	lines.push('');
	lines.push(`  ${DIM}${'─'.repeat(40)}${RESET}`);
	lines.push(`  Overall: ${totalStyled}/${totalSelectors} selectors styled (${pct}%)`);
	lines.push(`  Complete: ${complete} runes`);
	if (partial > 0) lines.push(`  Partial: ${partial} runes`);
	if (notStarted > 0) lines.push(`  Not started: ${notStarted} runes`);

	return lines.join('\n');
}

/** Build JSON output for an audit */
export function buildAuditJson(results: AuditResult[], theme: string): object {
	const totalSelectors = results.reduce((sum, r) => sum + r.total, 0);
	const totalStyled = results.reduce((sum, r) => sum + r.styled, 0);

	return {
		theme,
		totalSelectors,
		styledSelectors: totalStyled,
		coverage: totalSelectors > 0 ? Math.round((totalStyled / totalSelectors) * 100) / 100 : 0,
		runes: Object.fromEntries(results.map(r => [r.rune, {
			total: r.total,
			styled: r.styled,
			status: r.status,
			selectors: r.selectors,
		}])),
	};
}

/** Format metadata audit result for terminal output */
export function formatMetaAuditResult(result: MetaAuditResult): string {
	const lines: string[] = [];
	lines.push(heading('Metadata Dimension Audit'));

	// Meta types in use
	lines.push('');
	lines.push(`  ${BOLD}Meta Types in Use${RESET}`);
	for (const [type, count] of Object.entries(result.typeCount).sort(([,a], [,b]) => b - a)) {
		lines.push(`    ${type.padEnd(12)} ${count} field${count !== 1 ? 's' : ''}`);
	}
	if (Object.keys(result.typeCount).length === 0) {
		lines.push(`    ${DIM}none${RESET}`);
	}

	// Rank distribution
	lines.push('');
	lines.push(`  ${BOLD}Ranks${RESET}`);
	for (const [rank, count] of Object.entries(result.rankCount)) {
		lines.push(`    ${rank.padEnd(12)} ${count} field${count !== 1 ? 's' : ''}`);
	}

	// Sentiment coverage
	lines.push('');
	lines.push(`  ${BOLD}Sentiment Coverage${RESET}`);
	lines.push(`    With sentiment map:    ${result.withSentiment} field${result.withSentiment !== 1 ? 's' : ''}`);
	lines.push(`    Without sentiment map: ${result.withoutSentiment} field${result.withoutSentiment !== 1 ? 's' : ''}`);

	// Fields grouped by rune
	lines.push('');
	lines.push(`  ${BOLD}Fields by Rune${RESET}`);
	const byRune = new Map<string, typeof result.fields>();
	for (const field of result.fields) {
		const arr = byRune.get(field.rune) ?? [];
		arr.push(field);
		byRune.set(field.rune, arr);
	}
	for (const [rune, fields] of [...byRune.entries()].sort(([a], [b]) => a.localeCompare(b))) {
		lines.push(`    ${CYAN}${rune}${RESET}`);
		for (const f of fields) {
			const sentiment = f.hasSentiment ? `${GREEN}\u2713 sentiment${RESET}` : `${DIM}no sentiment${RESET}`;
			const rank = f.metaRank ? ` ${DIM}(${f.metaRank})${RESET}` : '';
			lines.push(`      ${f.ref.padEnd(20)} ${f.metaType.padEnd(10)} ${sentiment}${rank}`);
		}
	}

	// CSS coverage
	if (result.css) {
		lines.push('');
		lines.push(`  ${BOLD}Theme CSS Coverage${RESET}`);

		const allChecks = [
			...Object.entries(result.css.types).map(([k, v]) => [`[data-meta-type="${k}"]`, v] as const),
			...Object.entries(result.css.sentiments).map(([k, v]) => [`[data-meta-sentiment="${k}"]`, v] as const),
			...Object.entries(result.css.ranks).map(([k, v]) => [`[data-meta-rank="${k}"]`, v] as const),
		];

		const warnings: string[] = [];
		for (const [sel, info] of allChecks) {
			if (info.styled) {
				lines.push(`    ${GREEN}\u2713${RESET} ${sel}  ${DIM}\u2192 ${info.file}:${info.line}${RESET}`);
			} else {
				lines.push(`    ${RED}\u2717${RESET} ${sel}  ${RED}MISSING${RESET}`);
				warnings.push(sel);
			}
		}

		if (warnings.length > 0) {
			lines.push('');
			lines.push(`  ${YELLOW}\u26a0 ${warnings.length} missing CSS rule${warnings.length !== 1 ? 's' : ''}${RESET}`);
		} else {
			lines.push('');
			lines.push(`  ${GREEN}\u2713 All metadata CSS rules present${RESET}`);
		}
	}

	// Summary
	lines.push('');
	lines.push(`  ${DIM}${'─'.repeat(40)}${RESET}`);
	lines.push(`  Total: ${result.fields.length} annotated fields across ${byRune.size} runes`);

	return lines.join('\n');
}

/** Build JSON output for metadata audit */
export function buildMetaAuditJson(result: MetaAuditResult): object {
	return {
		fields: result.fields,
		summary: {
			totalFields: result.fields.length,
			typeCount: result.typeCount,
			rankCount: result.rankCount,
			withSentiment: result.withSentiment,
			withoutSentiment: result.withoutSentiment,
		},
		css: result.css ?? null,
	};
}

/** Format human-readable dimension audit output */
export function formatDimensionAuditResult(result: DimensionAuditResult): string {
	const lines: string[] = [];
	lines.push(heading('Dimension Audit'));

	// Surface assignments
	lines.push('');
	lines.push(`  ${BOLD}Surface Assignments${RESET}`);
	if (result.surfaces.length > 0) {
		for (const group of result.surfaces) {
			lines.push(`    ${CYAN}${group.name}${RESET} (${group.runes.length} rune${group.runes.length !== 1 ? 's' : ''})`);
			for (const rune of group.runes) {
				lines.push(`      ${DIM}${rune}${RESET}`);
			}
		}
	} else {
		lines.push(`    ${DIM}No surface CSS found${RESET}`);
	}

	if (result.unassignedRunes.length > 0) {
		lines.push('');
		lines.push(`  ${YELLOW}\u26a0 Unassigned runes (${result.unassignedRunes.length}):${RESET}`);
		for (const rune of result.unassignedRunes) {
			lines.push(`    ${YELLOW}${rune}${RESET}`);
		}
	}

	// Density
	lines.push('');
	lines.push(`  ${BOLD}Density Coverage${RESET}`);
	for (const [level, count] of Object.entries(result.densityLevels).sort(([,a], [,b]) => b - a)) {
		lines.push(`    ${level.padEnd(12)} ${count} rune${count !== 1 ? 's' : ''}`);
	}

	// Section anatomy
	lines.push('');
	lines.push(`  ${BOLD}Section Anatomy${RESET}`);
	for (const [role, count] of Object.entries(result.sectionRoles).sort(([,a], [,b]) => b - a)) {
		lines.push(`    ${role.padEnd(14)} ${count} rune${count !== 1 ? 's' : ''}`);
	}

	// Interactive state
	lines.push('');
	lines.push(`  ${BOLD}Interactive State${RESET}`);
	if (result.interactiveRunes.length > 0) {
		lines.push(`    ${result.interactiveRunes.length} rune${result.interactiveRunes.length !== 1 ? 's' : ''} with initial data-state:`);
		for (const rune of result.interactiveRunes.sort()) {
			lines.push(`      ${DIM}${rune}${RESET}`);
		}
	} else {
		lines.push(`    ${DIM}none${RESET}`);
	}

	// Media slots
	lines.push('');
	lines.push(`  ${BOLD}Media Slots${RESET}`);
	if (Object.keys(result.mediaSlots).length > 0) {
		for (const [slot, refs] of Object.entries(result.mediaSlots).sort()) {
			lines.push(`    ${CYAN}${slot}${RESET} (${refs.length})`);
			for (const ref of refs.sort()) {
				lines.push(`      ${DIM}${ref}${RESET}`);
			}
		}
	} else {
		lines.push(`    ${DIM}none${RESET}`);
	}

	// CSS coverage
	if (result.css) {
		lines.push('');
		lines.push(`  ${BOLD}Theme CSS Coverage${RESET}`);

		const allChecks: [string, DimCssEntry][] = [
			...Object.entries(result.css.density).map(([k, v]) => [`[data-density="${k}"]`, v] as [string, DimCssEntry]),
			...Object.entries(result.css.sections).map(([k, v]) => [`[data-section="${k}"]`, v] as [string, DimCssEntry]),
			...Object.entries(result.css.states).map(([k, v]) => [`[data-state="${k}"]`, v] as [string, DimCssEntry]),
			...Object.entries(result.css.media).map(([k, v]) => [`[data-media="${k}"]`, v] as [string, DimCssEntry]),
		];

		const warnings: string[] = [];
		for (const [sel, info] of allChecks) {
			if (info.styled) {
				lines.push(`    ${GREEN}\u2713${RESET} ${sel}  ${DIM}\u2192 ${info.file}:${info.line}${RESET}`);
			} else {
				lines.push(`    ${RED}\u2717${RESET} ${sel}  ${RED}MISSING${RESET}`);
				warnings.push(sel);
			}
		}

		if (warnings.length > 0) {
			lines.push('');
			lines.push(`  ${YELLOW}\u26a0 ${warnings.length} missing CSS rule${warnings.length !== 1 ? 's' : ''}${RESET}`);
		} else {
			lines.push('');
			lines.push(`  ${GREEN}\u2713 All dimension CSS rules present${RESET}`);
		}
	}

	// Summary
	const totalSlots = Object.values(result.mediaSlots).reduce((sum, refs) => sum + refs.length, 0);
	const totalSections = Object.values(result.sectionRoles).reduce((sum, c) => sum + c, 0);
	lines.push('');
	lines.push(`  ${DIM}${'─'.repeat(40)}${RESET}`);
	lines.push(`  ${totalSections} section assignments, ${result.interactiveRunes.length} interactive runes, ${totalSlots} media slots`);

	return lines.join('\n');
}

/** Build JSON output for dimension audit */
export function buildDimensionAuditJson(result: DimensionAuditResult): object {
	return {
		surfaces: result.surfaces,
		unassignedRunes: result.unassignedRunes,
		density: result.densityLevels,
		sections: result.sectionRoles,
		interactiveRunes: result.interactiveRunes,
		mediaSlots: result.mediaSlots,
		css: result.css ?? null,
	};
}
