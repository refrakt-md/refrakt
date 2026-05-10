/**
 * Sanitisation primitives for runes that handle raw author HTML/CSS/JS.
 *
 * The transform pipeline assumes its input is trusted by default. When a
 * `SecurityPolicy` resolves to `untrusted` mode with `allowJs: false`, runes
 * that surface raw content to the client (sandbox, future custom-element
 * runes) call `sanitizeSandboxContent` to strip executable attack surface
 * before the content is stuffed into a meta tag and shipped to the iframe.
 *
 * This is a regex-based pass — fast, dependency-free, and intentionally
 * conservative. It is **not** a substitute for the iframe's sandbox attribute
 * or the meta-CSP layer; it is defence-in-depth on top of those. When you
 * need stronger guarantees (DOM-aware sanitisation, CSS expression
 * filtering, SVG-namespace hardening), reach for a vetted library at the
 * application boundary.
 */

import type { ResolvedSecurityPolicy } from '@refrakt-md/types';

/** Strip `<script>…</script>` blocks (case-insensitive, multiline). */
function stripScripts(html: string): string {
	// Greedy-match content; `[^]` covers newlines without the /s flag for older targets.
	return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
}

/** Strip on*-prefixed event-handler attributes (onclick, onerror, onload, …).
 *  Matches both quoted and unquoted forms. */
function stripEventHandlers(html: string): string {
	// Quoted: on...="..." or on...='...'
	let out = html.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '');
	out = out.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '');
	// Unquoted: on...=value (terminated by whitespace or >)
	out = out.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '');
	return out;
}

/** Strip `javascript:` URLs from href/src/action/formaction/xlink:href. */
function stripJavascriptUrls(html: string): string {
	return html.replace(
		/(\s(?:href|src|action|formaction|xlink:href)\s*=\s*)(["'])\s*javascript:[^"']*\2/gi,
		'$1$2$2',
	);
}

/** Strip `<iframe>`, `<object>`, `<embed>` tags entirely.
 *  These can host executable content even when scripts are removed. */
function stripDangerousTags(html: string): string {
	let out = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '');
	out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, '');
	out = out.replace(/<embed\b[^>]*\/?>/gi, '');
	// Self-closing iframe variants
	out = out.replace(/<iframe\b[^>]*\/>/gi, '');
	out = out.replace(/<object\b[^>]*\/>/gi, '');
	return out;
}

/** Sanitise raw HTML/CSS/JS destined for a sandbox iframe.
 *
 *  - In `trusted` mode (or when `allowJs` is true), returns input unchanged.
 *  - In `untrusted` mode with `allowJs: false`, strips:
 *    - `<script>` blocks (including those inside SVG)
 *    - `on*=` event-handler attributes
 *    - `javascript:` URLs
 *    - `<iframe>`, `<object>`, `<embed>` tags
 */
export function sanitizeSandboxContent(content: string, policy: ResolvedSecurityPolicy): string {
	if (policy.trust === 'trusted' || policy.allowJs) return content;
	let out = stripScripts(content);
	out = stripEventHandlers(out);
	out = stripJavascriptUrls(out);
	out = stripDangerousTags(out);
	return out;
}
