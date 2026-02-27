import { describe, it, expect } from 'vitest';
import { matchRouteRule } from '../src/route-rules.js';

describe('matchRouteRule', () => {
	it('should match exact pattern', () => {
		const rules = [{ pattern: 'about', layout: 'page' }];
		expect(matchRouteRule('/about', rules)).toBe('page');
	});

	it('should match single-star glob (one segment)', () => {
		const rules = [{ pattern: 'blog/*', layout: 'post' }];
		expect(matchRouteRule('/blog/hello', rules)).toBe('post');
	});

	it('should not match single-star glob across segments', () => {
		const rules = [{ pattern: 'blog/*', layout: 'post' }];
		expect(matchRouteRule('/blog/nested/deep', rules)).toBe('default');
	});

	it('should match double-star glob across segments', () => {
		const rules = [{ pattern: 'docs/**', layout: 'docs' }];
		expect(matchRouteRule('/docs/getting-started', rules)).toBe('docs');
		expect(matchRouteRule('/docs/api/reference/method', rules)).toBe('docs');
	});

	it('should match catch-all pattern', () => {
		const rules = [{ pattern: '**', layout: 'default' }];
		expect(matchRouteRule('/anything/at/all', rules)).toBe('default');
		expect(matchRouteRule('/single', rules)).toBe('default');
	});

	it('should return first matching rule', () => {
		const rules = [
			{ pattern: 'docs/**', layout: 'docs' },
			{ pattern: '**', layout: 'default' },
		];
		expect(matchRouteRule('/docs/page', rules)).toBe('docs');
	});

	it('should return default when no rules match', () => {
		const rules = [{ pattern: 'blog/*', layout: 'post' }];
		expect(matchRouteRule('/about', rules)).toBe('default');
	});

	it('should return default for empty rules array', () => {
		expect(matchRouteRule('/anything', [])).toBe('default');
	});

	it('should handle URLs without leading slash', () => {
		const rules = [{ pattern: 'about', layout: 'page' }];
		expect(matchRouteRule('about', rules)).toBe('page');
	});
});
