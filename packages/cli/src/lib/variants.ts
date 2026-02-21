import type { Schema } from '@markdoc/markdoc';

/**
 * Discover variant values for a rune's attributes from its Markdoc schema.
 *
 * Reads the `matches` array from each schema attribute to find enumerations.
 * Returns a map of attribute name → array of valid values.
 */
export function discoverVariants(schema: Schema): Record<string, string[]> {
	const variants: Record<string, string[]> = {};

	if (!schema.attributes) return variants;

	for (const [name, attr] of Object.entries(schema.attributes)) {
		if (attr.matches && Array.isArray(attr.matches) && attr.matches.length > 0) {
			variants[name] = attr.matches.map(String);
		}
	}

	return variants;
}

/**
 * Check if any flag value is the special "all" keyword requesting variant expansion.
 * Returns the attribute name that should be expanded, or null.
 */
export function findExpandedVariant(flags: Record<string, string>): { attr: string; values: string[] } | null {
	// This is called after variant discovery — we look for flags with value "all"
	// The caller resolves the actual values from discoverVariants()
	for (const [key, value] of Object.entries(flags)) {
		if (value === 'all') {
			return { attr: key, values: [] }; // values filled in by caller
		}
	}
	return null;
}
