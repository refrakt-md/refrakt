/**
 * Shared field-match grammar (SPEC-070 canonical).
 *
 * One parser + matcher for the `field:value` selector used by `collection`'s
 * `filter`, `entityRoutes`' `filter` (SPEC-069), and `backlog`.
 *
 *   filter   := clause (WS clause)*
 *   clause   := field ":" value        // split on the FIRST colon
 *   value    := bareword | '"' .* '"'  // double-quotes carry spaces
 *
 * Operator is selected by the value's shape:
 *   - exact (default):  status:ready
 *   - glob:             url:/blog/*     ( * → any run of chars, anchored full-match )
 *   - regex:            id:/^SPEC-\d+$/  ( wrapped in slashes + optional flags )
 *
 * Same field repeated → OR; different fields → AND. Matching is case-sensitive.
 */

/** Minimal entity shape the matcher resolves fields from. */
export interface MatchableEntity {
	id: string;
	type: string;
	sourceUrl?: string;
	sourceFile?: string;
	data: Record<string, unknown>;
}

export interface FieldMatchClause {
	field: string;
	/** Values OR'd together for this field. */
	values: string[];
}

export interface ParsedFieldMatch {
	clauses: FieldMatchClause[];
	warnings: string[];
}

const TOP_LEVEL_FIELDS = new Set(['id', 'type', 'sourceFile', 'sourceUrl']);

/** Split an expression into tokens, honoring double-quoted spans. */
function tokenize(expr: string): string[] {
	const tokens: string[] = [];
	let cur = '';
	let inQuotes = false;
	for (const ch of expr) {
		if (ch === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		if (!inQuotes && /\s/.test(ch)) {
			if (cur) {
				tokens.push(cur);
				cur = '';
			}
			continue;
		}
		cur += ch;
	}
	if (cur) tokens.push(cur);
	return tokens;
}

/** Parse a filter expression into clauses, collecting warnings for malformed input. */
export function parseFieldMatch(expr: string | undefined | null): ParsedFieldMatch {
	const warnings: string[] = [];
	const byField = new Map<string, string[]>();
	if (!expr || !expr.trim()) return { clauses: [], warnings };

	for (const token of tokenize(expr)) {
		const colon = token.indexOf(':');
		if (colon === -1) {
			warnings.push(`Ignored filter clause "${token}": expected field:value`);
			continue;
		}
		const field = token.slice(0, colon);
		if (!field) {
			warnings.push(`Ignored filter clause "${token}": empty field name`);
			continue;
		}
		const value = token.slice(colon + 1);
		const existing = byField.get(field);
		if (existing) existing.push(value);
		else byField.set(field, [value]);
	}

	return {
		clauses: [...byField.entries()].map(([field, values]) => ({ field, values })),
		warnings,
	};
}

/** Resolve a field name against an entity: top-level first, then `data`; `url` is an alias. */
export function resolveEntityField(entity: MatchableEntity, field: string): unknown {
	if (field === 'url') return entity.sourceUrl ?? (entity.data.url as unknown) ?? '';
	if (TOP_LEVEL_FIELDS.has(field)) return (entity as unknown as Record<string, unknown>)[field];
	return entity.data[field];
}

function globToRegExp(value: string): RegExp {
	const parts = value.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
	return new RegExp('^' + parts.join('.*') + '$');
}

const REGEX_LITERAL = /^\/(.+)\/([gimsuy]*)$/;
const REGEX_METACHAR = /[\\^$.+?()[\]{}|]/;

/** Does a single candidate string satisfy a clause value (operator chosen by value shape)?
 *  Exported so consumers with their own field resolver (e.g. the SPEC-103 `data`
 *  rune's row-shaped resolver) reuse the exact exact/glob/regex semantics. */
export function matchValue(candidate: string, value: string): boolean {
	const m = value.match(REGEX_LITERAL);
	if (m && (m[2].length > 0 || REGEX_METACHAR.test(m[1]))) {
		try {
			return new RegExp(m[1], m[2]).test(candidate);
		} catch {
			return candidate === value; // malformed regex → treat literally
		}
	}
	if (value.includes('*')) return globToRegExp(value).test(candidate);
	return candidate === value;
}

/** Normalize a resolved field value to candidate strings (arrays / comma-joined → members). */
function candidates(resolved: unknown): string[] {
	if (Array.isArray(resolved)) return resolved.map((v) => String(v ?? ''));
	const s = String(resolved ?? '');
	return s.includes(',') ? s.split(',').map((p) => p.trim()) : [s];
}

/** Test whether an entity matches all clauses (AND across fields, OR within a field). */
export function matchesFieldMatch(entity: MatchableEntity, parsed: ParsedFieldMatch): boolean {
	for (const clause of parsed.clauses) {
		const cands = candidates(resolveEntityField(entity, clause.field));
		const fieldMatches = clause.values.some((value) => cands.some((c) => matchValue(c, value)));
		if (!fieldMatches) return false;
	}
	return true;
}

/** Convenience: parse + match in one call. */
export function matchesFilterExpr(entity: MatchableEntity, expr: string | undefined | null): boolean {
	return matchesFieldMatch(entity, parseFieldMatch(expr));
}
