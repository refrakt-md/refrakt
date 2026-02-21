import type { RuneConfig, ThemeConfig } from '@refrakt-md/transform';

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
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
