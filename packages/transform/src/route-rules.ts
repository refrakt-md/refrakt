import type { RouteRule } from '@refrakt-md/types';

/**
 * Match a URL against an ordered list of route rules.
 * Returns the layout name from the first matching rule, or 'default' if none match.
 *
 * Pattern syntax:
 * - "docs/**" matches /docs/anything and /docs/nested/deep
 * - "blog/*" matches /blog/post but not /blog/nested/deep
 * - "**" matches everything (catch-all)
 * - "about" matches /about exactly
 */
export function matchRouteRule(url: string, rules: RouteRule[]): string {
	const normalized = url.startsWith('/') ? url.slice(1) : url;

	for (const rule of rules) {
		if (matchPattern(normalized, rule.pattern)) {
			return rule.layout;
		}
	}
	return 'default';
}

/**
 * Return the `entity` type of the first matching rule that declares one, or
 * undefined. Used to register pages as typed registry entities (SPEC-092).
 */
export function matchRouteEntity(url: string, rules: RouteRule[]): string | undefined {
	const normalized = url.startsWith('/') ? url.slice(1) : url;
	for (const rule of rules) {
		if (rule.entity && matchPattern(normalized, rule.pattern)) {
			return rule.entity;
		}
	}
	return undefined;
}

function matchPattern(url: string, pattern: string): boolean {
	const regexStr = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')  // escape regex special chars (except * and ?)
		.replace(/\*\*/g, '{{GLOBSTAR}}')
		.replace(/\*/g, '[^/]*')
		.replace(/\{\{GLOBSTAR\}\}/g, '.*');
	return new RegExp(`^${regexStr}$`).test(url);
}
