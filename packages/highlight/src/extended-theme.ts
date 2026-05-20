import { createCssVariablesTheme } from 'shiki';

/**
 * Extended CSS-variables theme for refrakt.
 *
 * Builds on Shiki's `createCssVariablesTheme` (which emits ~9 `token-*`
 * variables — link, string, comment, constant, keyword, parameter,
 * function, string-expression, punctuation) and appends scope→variable
 * mappings for the SPEC-056 extended roles that the stock theme doesn't
 * route to dedicated variables today.
 *
 * Audit (against `@shikijs/core` createCssVariablesTheme as of v3.x):
 *
 * | Role | In stock theme? | Notes |
 * |---|---|---|
 * | `link`, `string`, `comment`, `constant`, `keyword`, `parameter`, `function`, `string-expression`, `punctuation` | ✓ | Emitted by stock theme — refrakt gets them for free. |
 * | `type` | ✗ | `entity.name.type` etc. currently route to `token-function`. We override. |
 * | `property` | ✗ | `variable.other.property` etc. not mapped. We add. |
 * | `tag` | ✗ | `entity.name.tag` currently routes to `token-string-expression` (yes, really). We override to a dedicated `token-tag`. |
 * | `attribute` | ✗ | `entity.other.attribute-name` currently routes to `token-function`. We override. |
 * | `operator` | ✗ | `keyword.operator` falls through to `token-keyword`. We override. |
 * | `number` | ✗ | `constant.numeric` falls into the broader `token-constant` scope list. We split it out. |
 * | `regex` | ✗ | `string.regexp` currently routes to `token-string-expression`. We override. |
 *
 * The override mechanism is TextMate scope matching: an entry later in
 * `tokenColors` with an equally-or-more-specific scope wins over earlier
 * entries. Our overrides target the same scope strings the stock theme
 * uses (or more specific children) so the routing changes deterministically.
 *
 * Variable values for the new roles default to the matching core role
 * via the CSS generator's broad-mapping pattern (see
 * `packages/transform/src/token-stylesheet.ts` `SYNTAX_TO_SHIKI_ALIASES`).
 * A preset that doesn't set the extended role renders identically to
 * stock Shiki; a preset that *does* set it picks up the dedicated colour.
 */
export function createExtendedCssVariablesTheme(options: { variablePrefix?: string } = {}) {
	const { variablePrefix = '--rf-syntax-' } = options;
	const base = createCssVariablesTheme({ variablePrefix });

	const v = (name: string) => `var(${variablePrefix}${name})`;

	const extendedTokenColors = [
		// ── type ──────────────────────────────────────────────────────────
		// Type names, class names, interface names. Stock theme currently
		// routes these to token-function; we split them off.
		{
			scope: [
				'entity.name.type',
				'entity.name.class',
				'entity.other.inherited-class',
				'support.type',
				'support.class',
				'meta.type.declaration entity.name',
				'meta.interface.declaration entity.name',
				'storage.type.class',
				'storage.type.interface',
			],
			settings: { foreground: v('token-type') },
		},

		// ── tag ───────────────────────────────────────────────────────────
		// JSX/HTML/XML element tag names. Stock theme routes these to
		// token-string-expression (surprisingly); we split them off.
		{
			scope: [
				'entity.name.tag',
				'meta.tag entity.name',
				'support.class.component',
			],
			settings: { foreground: v('token-tag') },
		},

		// ── attribute ─────────────────────────────────────────────────────
		// JSX/HTML/XML attribute names. Stock theme routes these to
		// token-function; we split them off.
		{
			scope: [
				'entity.other.attribute-name',
				'meta.attribute entity.other.attribute-name',
			],
			settings: { foreground: v('token-attribute') },
		},

		// ── property ──────────────────────────────────────────────────────
		// Object property access, property keys. Stock theme doesn't emit a
		// dedicated variable for these.
		{
			scope: [
				'variable.other.property',
				'variable.other.object.property',
				'support.variable.property',
				'meta.property.object',
				'meta.object-literal.key',
				'support.type.property-name',
			],
			settings: { foreground: v('token-property') },
		},

		// ── parameter (broader) ───────────────────────────────────────────
		// Stock theme only matches `variable.parameter.function` (narrow).
		// Broaden to all parameter-like positions.
		{
			scope: [
				'variable.parameter',
				'variable.parameter.function-call',
				'meta.function.parameters variable',
			],
			settings: { foreground: v('token-parameter') },
		},

		// ── operator ──────────────────────────────────────────────────────
		// Arithmetic, comparison, logical operators. Stock theme falls
		// through to token-keyword via `keyword.operator → keyword`.
		// Note: `keyword.operator.accessor` is already reset to `foreground`
		// in stock theme (intentionally), so we don't override that one.
		{
			scope: [
				'keyword.operator.assignment',
				'keyword.operator.arithmetic',
				'keyword.operator.comparison',
				'keyword.operator.logical',
				'keyword.operator.bitwise',
				'keyword.operator.relational',
				'keyword.operator.ternary',
				'keyword.operator.new',
				'keyword.operator.delete',
				'keyword.operator.spread',
				'keyword.operator.rest',
				'keyword.operator.optional',
				'keyword.operator.expression',
			],
			settings: { foreground: v('token-operator') },
		},

		// ── number ────────────────────────────────────────────────────────
		// Numeric literals — split out from the broader token-constant
		// group when a palette wants distinct number colouring.
		{
			scope: [
				'constant.numeric',
				'constant.numeric.integer',
				'constant.numeric.float',
				'constant.numeric.hex',
				'constant.numeric.binary',
				'constant.numeric.octal',
			],
			settings: { foreground: v('token-number') },
		},

		// ── regex ─────────────────────────────────────────────────────────
		// Regular expression literals. Stock theme routes string.regexp to
		// token-string-expression; we split them off.
		{
			scope: [
				'string.regexp',
				'string.regex',
				'string.quoted.regex',
			],
			settings: { foreground: v('token-regex') },
		},
	];

	return {
		...base,
		tokenColors: [...(base.tokenColors ?? []), ...extendedTokenColors],
	};
}
