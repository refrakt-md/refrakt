/**
 * Flatten `refrakt.config.schema.json` into the data the configuration
 * reference renders (SPEC-126).
 *
 * The script emits **data, not prose**: `site/content/_data/config-fields.json`
 * is a committed, diffable list of field rows, and the page renders it with
 * `{% data %}` plus a per-row body. So there is no generated Markdoc to review,
 * no do-not-edit banner, and no byte-stability concern about wording — only
 * stable key ordering, which the freshness test depends on.
 *
 * Why a script rather than a CLI command: a renderer that keys off schema
 * keywords *we* invented would not be generic, it would be this repo's
 * conventions wearing a product command's clothes. `scripts/check-rune-docs.mjs`
 * is the local precedent for a repo-shaped drift guard, and it is the only one
 * with a track record — the two `--check` flags in this repo do not run in CI.
 *
 * Usage:
 *   node scripts/generate-config-reference.mjs           # write the artifact
 *   node scripts/generate-config-reference.mjs --check   # exit 1 if stale
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SCHEMA_PATH = join(ROOT, 'packages/transform/refrakt.config.schema.json');
export const ARTIFACT_PATH = join(ROOT, 'site/content/_data/config-fields.json');
export const REGENERATE_COMMAND = 'npm run config:reference';

/**
 * Which group each field belongs to, and the order groups render in.
 *
 * Lives here rather than in the published schema: this is our editorial
 * arrangement of the docs page, not something a JSON Schema consumer should
 * see. Keeping it out means the published schema carries no non-standard
 * keywords. The cost is a second edit when a field is added, which
 * `everyPropertyIsGrouped` makes impossible to forget.
 */
export const GROUPS = [
	{
		slug: 'content-theme',
		name: 'Content and theme',
		blurb: 'What the site is built from.',
		fields: ['contentDir', 'theme', 'target'],
	},
	{
		slug: 'site-identity',
		name: 'Site identity',
		blurb: 'Used for canonical links, social cards and structured data.',
		fields: ['baseUrl', 'siteName', 'logo', 'defaultImage'],
	},
	{
		slug: 'routing',
		name: 'Routing and entities',
		blurb: 'How pages map to layouts, and which become registry entities.',
		fields: ['routeRules', 'entityRoutes'],
	},
	{
		slug: 'runes-plugins',
		name: 'Runes and plugins',
		blurb: 'Which runes exist, and which package wins when names collide.',
		fields: ['plugins', 'runes', 'overrides'],
	},
	{
		slug: 'presentation',
		name: 'Presentation',
		blurb: 'Cross-cutting visual configuration.',
		fields: ['icons', 'tints', 'backgrounds', 'highlight', 'sandbox', 'search'],
	},
	{
		slug: 'content-sources',
		name: 'Content sources',
		blurb: 'Where source links and file-reading runes resolve from.',
		fields: ['repoUrl', 'repoBranch'],
	},
	{
		slug: 'i18n',
		name: 'Internationalisation',
		blurb: 'Locale selection and string overrides.',
		fields: ['locale', 'strings'],
	},
];

/**
 * Fields a theme's `ThemeManifest` can also supply.
 *
 * A reference derived from the config schema alone would describe
 * `SiteConfig.baseUrl` and say nothing about a theme being able to provide it —
 * accurate and still misleading. The precedence is real but written down in
 * exactly one place (`packages/create-refrakt/template-html/build.ts`), so it is
 * restated here and tied to `ThemeManifest` by a test.
 */
export const THEME_DEFAULTABLE = ['siteName', 'baseUrl', 'defaultImage', 'logo', 'routeRules'];

/** Render a JSON Schema type into something a reader recognises. */
export function readableType(prop, schema) {
	if (prop.$ref) {
		const target = refName(prop.$ref);
		return target ?? 'object';
	}
	if (prop.oneOf) {
		const parts = prop.oneOf.map((variant) => readableType(variant, schema));
		return [...new Set(parts)].join(' | ');
	}
	if (prop.enum) return prop.enum.map((v) => JSON.stringify(v)).join(' | ');
	if (prop.type === 'array') {
		const items = prop.items ? readableType(prop.items, schema) : 'unknown';
		return `${items}[]`;
	}
	if (prop.type === 'object' && prop.additionalProperties) {
		return `Record<string, ${readableType(prop.additionalProperties, schema)}>`;
	}
	return prop.type ?? 'unknown';
}

function refName(ref) {
	const m = /^#\/definitions\/(.+)$/.exec(ref);
	return m ? m[1] : undefined;
}

/**
 * A `$ref` property carries no description of its own — both type and prose
 * live on the definition it points at. Inherit rather than duplicating, so the
 * two cannot disagree.
 */
export function resolveProperty(name, prop, schema, required) {
	const target = prop.$ref ? schema.definitions?.[refName(prop.$ref)] : undefined;
	const description = prop.description ?? target?.description ?? '';
	return {
		name,
		type: readableType(prop, schema),
		required: required.includes(name),
		description,
		...(prop.default !== undefined ? { default: JSON.stringify(prop.default) } : {}),
		...(prop.deprecated ? { deprecated: true } : {}),
		...(THEME_DEFAULTABLE.includes(name) ? { themeDefaultable: true } : {}),
	};
}

/** Flatten `SiteConfig` into grouped, renderable rows. */
export function flatten(schema) {
	const site = schema.definitions.SiteConfig;
	const required = site.required ?? [];
	const rows = [];
	for (const group of GROUPS) {
		for (const field of group.fields) {
			const prop = site.properties[field];
			if (!prop) continue;
			// `group` is the slug, not the display name: the `where` grammar splits
			// clauses on whitespace, so a multi-word value cannot be filtered on.
			rows.push({ group: group.slug, groupName: group.name, ...resolveProperty(field, prop, schema, required) });
		}
	}
	return rows;
}

/** Property names the grouping map does not place. */
export function ungrouped(schema) {
	const placed = new Set(GROUPS.flatMap((g) => g.fields));
	return Object.keys(schema.definitions.SiteConfig.properties).filter((n) => !placed.has(n));
}

/** Grouped field names that no longer exist in the schema. */
export function staleGroupEntries(schema) {
	const real = new Set(Object.keys(schema.definitions.SiteConfig.properties));
	return GROUPS.flatMap((g) => g.fields).filter((n) => !real.has(n));
}

export function render(schema) {
	// Key order is fixed by construction, so the freshness check below is a
	// stable equality comparison rather than something that flaps.
	return JSON.stringify(
		{ groups: GROUPS.map(({ slug, name, blurb }) => ({ slug, name, blurb })), fields: flatten(schema) },
		null,
		'\t',
	) + '\n';
}

export function readSchema() {
	return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
}

function main(argv) {
	const schema = readSchema();

	const missing = ungrouped(schema);
	const stale = staleGroupEntries(schema);
	if (missing.length > 0 || stale.length > 0) {
		if (missing.length) console.error(`Fields with no group: ${missing.join(', ')}`);
		if (stale.length) console.error(`Grouped fields that no longer exist: ${stale.join(', ')}`);
		console.error(`\nEdit GROUPS in ${'scripts/generate-config-reference.mjs'}.`);
		return 1;
	}

	const rendered = render(schema);

	if (argv.includes('--check')) {
		let current = '';
		try {
			current = readFileSync(ARTIFACT_PATH, 'utf8');
		} catch {
			/* missing counts as stale */
		}
		if (current !== rendered) {
			console.error('site/content/_data/config-fields.json is out of date.');
			console.error(`Run \`${REGENERATE_COMMAND}\` and commit the result.`);
			return 1;
		}
		console.log('✓ config-fields.json is up to date');
		return 0;
	}

	mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
	writeFileSync(ARTIFACT_PATH, rendered);
	console.log(`Wrote ${flatten(schema).length} fields to site/content/_data/config-fields.json`);
	return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)));
}
