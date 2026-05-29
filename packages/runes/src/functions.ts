/**
 * Shared markdoc formatter functions (SPEC-070 / WORK-265).
 *
 * Author-facing value formatters usable anywhere markdoc transforms run:
 * collection cells/templates, `entityRoutes` render strings, ordinary content.
 * Keeps value formatting out of `fields` projection and out of any bespoke DSL.
 *
 *   {% currency($item.data.price, "EUR") %}   →  €1,234.00
 *   {% date($item.data.published) %}          →  Jan 15, 2024
 *   {% number($item.data.views) %}            →  1,234,567
 *   {% join($item.data.tags, " · ") %}        →  a · b · c
 *   concat("milestone:", $item.id)            →  "milestone:v0.16.0"
 */
import type { ConfigFunction } from '@markdoc/markdoc';

const LOCALE = 'en-US';

export const currency: ConfigFunction = {
	transform(parameters) {
		const amount = Number(parameters[0]);
		const code = String(parameters[1] ?? 'USD');
		if (!Number.isFinite(amount)) return String(parameters[0] ?? '');
		try {
			return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: code }).format(amount);
		} catch {
			return `${code} ${amount}`;
		}
	},
};

export const date: ConfigFunction = {
	transform(parameters) {
		const raw = parameters[0];
		const d = new Date(String(raw));
		if (Number.isNaN(d.getTime())) return String(raw ?? '');
		return new Intl.DateTimeFormat(LOCALE, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
	},
};

export const number: ConfigFunction = {
	transform(parameters) {
		const n = Number(parameters[0]);
		if (!Number.isFinite(n)) return String(parameters[0] ?? '');
		return new Intl.NumberFormat(LOCALE).format(n);
	},
};

export const join: ConfigFunction = {
	transform(parameters) {
		const value = parameters[0];
		const sep = parameters[1] != null ? String(parameters[1]) : ', ';
		if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join(sep);
		return String(value ?? '');
	},
};

/**
 * String concatenation of all positional arguments. Each is stringified
 * (null/undefined → empty string) and concatenated without a separator.
 * Fills the gap Markdoc's string-literal grammar leaves — `"foo:$bar"`
 * doesn't interpolate, so use `concat("foo:", $bar)` to compose dynamic
 * attribute values like `filter` / `url` from variables at transform time.
 */
export const concat: ConfigFunction = {
	transform(parameters) {
		return Object.values(parameters).map((v) => (v == null ? '' : String(v))).join('');
	},
};

/**
 * Title-case a slug/enum-ish token: split camelCase, turn `-`/`_` into spaces,
 * capitalize each word. `blocked-by` → "Blocked By", `prepTime` → "Prep Time".
 * Shared by collection's `fields` headers and the relationships rune's kind
 * labels, and exposed as the `humanize` markdoc function.
 */
export function humanize(value: string): string {
	return String(value ?? '')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.trim();
}

const humanizeFn: ConfigFunction = {
	transform(parameters) {
		return humanize(String(parameters[0] ?? ''));
	},
};

/** The shared formatter-function set, keyed by their markdoc name. */
export const functions: Record<string, ConfigFunction> = { currency, date, number, join, concat, humanize: humanizeFn };
