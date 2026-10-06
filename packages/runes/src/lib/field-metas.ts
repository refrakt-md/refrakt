import Markdoc from '@markdoc/markdoc';
import type { Config, Tag } from '@markdoc/markdoc';

/** A value source: an attribute of the rune, or a file variable (`config.variables.file`). */
export type FieldMetaSource = `attrs.${string}` | `file.${string}`;

/**
 * One field: a bare string is the default for the attribute of the same name
 * (`attrs[key] ?? default`); `{ from, default }` takes the first non-empty value
 * among the listed sources, else the literal default.
 */
export type FieldMetaEntry = string | { from: FieldMetaSource[]; default: string };

/**
 * A `fieldMetas` declaration. Plain data — no entry is a function — so a spec
 * can cross a JSON boundary unchanged.
 */
export type FieldMetaSpec = Record<string, FieldMetaEntry>;

const ROOTS = ['attrs', 'file'] as const;

function readSource(
	source: string,
	attrs: Record<string, unknown>,
	file: Record<string, unknown> | undefined,
): unknown {
	const dot = source.indexOf('.');
	const root = dot === -1 ? source : source.slice(0, dot);
	const key = dot === -1 ? '' : source.slice(dot + 1);
	if (!(ROOTS as readonly string[]).includes(root) || key === '') {
		throw new Error(
			`fieldMetas: unknown source "${source}" — sources are "attrs.<name>" or "file.<name>".`,
		);
	}
	return root === 'attrs' ? attrs[key] : file?.[key];
}

/**
 * Build a rune's property metas from a declaration, for use directly as
 * `properties` on `createComponentRenderable`:
 *
 * ```ts
 * properties: fieldMetas(attrs, config, {
 *   status: 'draft',
 *   created: { from: ['attrs.created', 'file.created'], default: '' },
 * }),
 * ```
 *
 * Keys come out in declaration order, which is the order of the
 * `data-rune-fields` bag. For a meta that is conditional, or that must render
 * outside `properties`, build the tag by hand — this covers the bulk case only.
 */
export function fieldMetas(
	attrs: Record<string, unknown>,
	config: Config,
	spec: FieldMetaSpec,
): Record<string, Tag> {
	const file = config.variables?.file as Record<string, unknown> | undefined;
	const out: Record<string, Tag> = {};
	for (const [key, entry] of Object.entries(spec)) {
		let content: unknown;
		if (typeof entry === 'string') {
			content = attrs[key] ?? entry;
		} else {
			// Read every source before choosing, so a bad one is rejected even
			// when an earlier source already has a value.
			const values = entry.from.map((source) => readSource(source, attrs, file));
			content = values.find((v) => v != null && v !== '') ?? entry.default;
		}
		out[key] = new Markdoc.Tag('meta', { content });
	}
	return out;
}
