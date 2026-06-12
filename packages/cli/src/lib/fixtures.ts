/**
 * Fixture resolution for the inspect/gallery commands.
 *
 * The example content itself is the unified, generated `RUNE_EXAMPLES` manifest
 * from `@refrakt-md/runes` (source: `packages/runes/fixtures/*.md` — SPEC-102 /
 * WORK-411). Plugin fixtures layer on top at the call site; this module just
 * resolves a rune name to a source string and applies attribute overrides.
 */
import { RUNE_EXAMPLES } from '@refrakt-md/runes';

/** Built-in fixture strings, keyed by rune name. Generated from fixtures/*.md. */
export const fixtures: Record<string, string> = RUNE_EXAMPLES;

/** Whether a rune has a real fixture (plugin fixture or the unified manifest),
 *  i.e. `getFixture` would return authored content rather than the stub. */
export function hasFixture(runeName: string, packageFixtures?: Record<string, string>): boolean {
	return Boolean(packageFixtures?.[runeName] ?? fixtures[runeName]);
}

/** Get a fixture for a rune, with optional attribute overrides applied to the source */
export function getFixture(runeName: string, attrOverrides?: Record<string, string>): string {
	const source = fixtures[runeName];
	if (!source) {
		// Generate a minimal fixture for unknown runes
		return `{% ${runeName} %}\nSample content for the ${runeName} rune.\n{% /${runeName} %}`;
	}

	if (!attrOverrides || Object.keys(attrOverrides).length === 0) {
		return source;
	}

	// Apply attribute overrides by modifying the opening tag
	return applyOverrides(source, runeName, attrOverrides);
}

/** Replace or add attributes in the opening tag of a fixture */
function applyOverrides(source: string, tagName: string, overrides: Record<string, string>): string {
	// Match the opening tag: {% tagName ... %} or {% tagName ... /%}
	const openTagPattern = new RegExp(`(\\{%\\s*${escapeRegex(tagName)})([^%]*?)(/?%\\})`);
	const match = source.match(openTagPattern);
	if (!match) return source;

	// Strip any trailing slash from the attr capture so we don't put attributes after it
	let attrString = match[2].replace(/\s*\/\s*$/, ' ');
	const closing = match[3];

	for (const [key, value] of Object.entries(overrides)) {
		// Try to replace existing attribute
		const attrPattern = new RegExp(`${escapeRegex(key)}="[^"]*"`);
		if (attrPattern.test(attrString)) {
			attrString = attrString.replace(attrPattern, `${key}="${value}"`);
		} else {
			// Add new attribute
			attrString = attrString.trimEnd() + ` ${key}="${value}" `;
		}
	}

	return source.replace(openTagPattern, `${match[1]}${attrString}${closing}`);
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
