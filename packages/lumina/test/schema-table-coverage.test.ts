import { describe, it, expect } from 'vitest';
import type { Schema } from '@markdoc/markdoc';
import type { PluginRune } from '@refrakt-md/types';
import { tags, schemaTables, pluginRuneSchema, validateSchemaTable } from '@refrakt-md/runes';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// WORK-632 / SPEC-145 D27 (c) — every shipped schema table, core, plugin and
// composed, passes the full table check against the attributes its rune
// declares: a `by` table's rows and its attribute's `matches` correspond
// exactly. Construction already throws on a failing table, so a broken one
// would stop the import above; this sweep says so by name, and proves the
// tables it expects to see were actually reached.

const plugins = { marketing, docs, storytelling, places, business, design, learning, media, plan };

const schemas: Array<[string, Schema]> = Object.entries(tags as Record<string, Schema>);
for (const plugin of Object.values(plugins)) {
	for (const [name, entry] of Object.entries(plugin.runes as Record<string, PluginRune>)) {
		const schema = pluginRuneSchema(name, entry);
		if (schema) schemas.push([name, schema]);
	}
}

const tables = schemas.flatMap(([name, schema]) => {
	const table = schemaTables.get(schema);
	return table ? [[name, table, schema] as const] : [];
});

describe('shipped schema tables cover their selecting attribute', () => {
	it('reaches every hand-written `by` table', () => {
		const selected = new Set(tables.filter(([, t]) => t.by !== undefined).map(([n]) => n));
		expect(selected).toEqual(new Set(['playlist', 'track', 'organization']));
	});

	it.each(tables.map(([name, table, schema]) => [name, table, schema]))(
		'%s',
		(_name, table, schema) => {
			expect(validateSchemaTable(table, schema.attributes ?? {})).toEqual([]);
		},
	);
});
