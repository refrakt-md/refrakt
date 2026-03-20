#!/usr/bin/env tsx
/**
 * Generate VSCode snippets from rune definitions.
 *
 * For runes with a `snippet` field: use the hand-crafted body.
 * For runes without: auto-generate from schema attributes.
 *
 * Run: npx tsx src/generate-snippets.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import rune definitions
import { runes } from '@refrakt-md/runes';
import type { Rune } from '@refrakt-md/runes';

// Community packages
import { marketing } from '@refrakt-md/marketing';
import { docs } from '@refrakt-md/docs';
import { storytelling } from '@refrakt-md/storytelling';
import { places } from '@refrakt-md/places';
import { business } from '@refrakt-md/business';
import { design } from '@refrakt-md/design';
import { learning } from '@refrakt-md/learning';
import { media } from '@refrakt-md/media';

import type { RunePackage } from '@refrakt-md/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '..', 'snippets', 'runes.json');

interface SnippetEntry {
	prefix: string | string[];
	body: string[];
	description: string;
}

/** Static snippets that don't come from rune definitions */
const STATIC_SNIPPETS: Record<string, SnippetEntry> = {
	'Generic Rune': {
		prefix: 'rune',
		body: [
			'{% ${1:tagName} %}',
			'$0',
			'{% /${1:tagName} %}',
		],
		description: 'Generic rune tag pair',
	},
	'Frontmatter': {
		prefix: 'frontmatter',
		body: [
			'---',
			'title: ${1:Page Title}',
			'description: ${2:Short description}',
			'---',
			'$0',
		],
		description: 'YAML frontmatter block',
	},
	'Blog Frontmatter': {
		prefix: 'frontmatter:blog',
		body: [
			'---',
			'title: ${1:Post Title}',
			'description: ${2:Short description}',
			'date: ${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DATE}',
			'author: ${3:Author Name}',
			'tags: [${4:tag1, tag2}]',
			'---',
			'$0',
		],
		description: 'YAML frontmatter for blog posts',
	},
};

/**
 * Auto-generate a basic snippet body from a rune's schema attributes.
 */
function generateSnippetFromSchema(name: string, rune: Rune): string[] {
	const attrs = rune.schema.attributes ?? {};
	const selfClosing = rune.schema.selfClosing ?? false;

	let placeholderIndex = 1;
	const attrParts: string[] = [];

	for (const [attrName, attr] of Object.entries(attrs)) {
		if ((attr as any).deprecated) continue;
		if (!attr.required) continue;

		const matches = Array.isArray(attr.matches) ? attr.matches.map(String) : null;
		if (matches && matches.length > 0) {
			attrParts.push(`${attrName}="\${${placeholderIndex}|${matches.join(',')}|}"`);
		} else {
			const defaultVal = attr.default ?? '';
			attrParts.push(`${attrName}="\${${placeholderIndex}:${defaultVal}}"`);
		}
		placeholderIndex++;
	}

	const attrStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';

	if (selfClosing) {
		return [`{% ${name}${attrStr} /%}`];
	}
	return [
		`{% ${name}${attrStr} %}`,
		'$0',
		`{% /${name} %}`,
	];
}

/**
 * Build display name for the snippet entry key.
 */
function displayName(name: string): string {
	return name
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Build prefix(es) for a rune snippet.
 */
function buildPrefix(name: string, aliases: string[]): string | string[] {
	const prefixes = [`rune:${name}`, ...aliases.map(a => `rune:${a}`)];
	return prefixes.length === 1 ? prefixes[0] : prefixes;
}

// ── Build snippets ────────────────────────────────────────

const snippets: Record<string, SnippetEntry> = { ...STATIC_SNIPPETS };

// Core runes
for (const rune of Object.values(runes) as Rune[]) {
	const body = rune.snippet ?? generateSnippetFromSchema(rune.name, rune);
	const entry: SnippetEntry = {
		prefix: buildPrefix(rune.name, rune.aliases),
		body,
		description: rune.description,
	};
	snippets[displayName(rune.name)] = entry;
}

// Community packages
const packages: RunePackage[] = [marketing, docs, storytelling, places, business, design, learning, media];

for (const pkg of packages) {
	for (const [name, runeEntry] of Object.entries(pkg.runes)) {
		// Skip if already defined by core (shouldn't happen, but defensive)
		if (snippets[displayName(name)]) continue;

		const body = runeEntry.snippet ?? [
			`{% ${name} %}`,
			'$0',
			`{% /${name} %}`,
		];
		const aliases = runeEntry.aliases ?? [];
		const entry: SnippetEntry = {
			prefix: buildPrefix(name, aliases),
			body,
			description: runeEntry.description ?? `${displayName(name)} rune`,
		};
		snippets[displayName(name)] = entry;
	}
}

// Write output
writeFileSync(outputPath, JSON.stringify(snippets, null, '\t') + '\n');
console.log(`Generated ${Object.keys(snippets).length} snippets → ${outputPath}`);
