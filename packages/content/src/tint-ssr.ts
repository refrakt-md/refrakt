import type { ResolvedTintCascade } from './tint-cascade.js';

/**
 * Build the attribute string adapters should put on the `<html>` element at
 * SSR time, per SPEC-052. Reads the resolved cascade tuple from a SitePage
 * and emits `data-theme`, `data-tint`, `data-tint-lock`, plus the matching
 * `color-scheme` declaration when locked.
 *
 * The returned string is just the attributes (no leading/trailing space) —
 * adapters interpolate it into their HTML shell however suits them best.
 * For example, in a SvelteKit `hooks.server.ts` `transformPageChunk`:
 *
 *   ```ts
 *   html.replace('<html', `<html ${htmlTintAttributes(cascade)}`)
 *   ```
 *
 * If the cascade has no opinions (default `'auto'`, no locked mode, no
 * named tint), returns the empty string — `<html>` stays clean and the
 * pre-paint script handles user / system preference at runtime.
 */
export function htmlTintAttributes(cascade: ResolvedTintCascade): string {
	const parts: string[] = [];
	if (cascade.tintMode === 'light' || cascade.tintMode === 'dark') {
		parts.push(`data-theme="${cascade.tintMode}"`);
	}
	if (cascade.tint !== null) {
		parts.push(`data-tint="${escapeAttr(cascade.tint)}"`);
	}
	if (cascade.locked) {
		parts.push('data-tint-lock="true"');
	}
	return parts.join(' ');
}

/**
 * Build the `<meta name="color-scheme">` content value adapters should
 * emit. `'light dark'` when unlocked (browser may pick); explicit when
 * locked.
 */
export function colorSchemeMetaContent(cascade: ResolvedTintCascade): string {
	if (cascade.locked && (cascade.tintMode === 'light' || cascade.tintMode === 'dark')) {
		return cascade.tintMode;
	}
	return 'light dark';
}

/**
 * The canonical anti-FOIT pre-paint script. Drop this inline into `<head>`
 * before any stylesheets so it runs before first paint and there's no flash
 * of incorrect theme.
 *
 * Behaviour per SPEC-052:
 *   - On a locked page (`data-tint-lock="true"`), do nothing — the SSR
 *     output is final.
 *   - On an unlocked page, apply the user's saved preference from
 *     localStorage (key `rf-theme`); fall back to system
 *     `prefers-color-scheme` if no preference is saved.
 *   - The toggle component (separate concern) writes the same localStorage
 *     key on click. Saved preference is preserved across visits to locked
 *     pages.
 *
 * Returns the raw JavaScript string (no `<script>` wrapper) so adapters
 * can inline it however their templating system prefers.
 */
export function prePaintScript(): string {
	return `(function(){var d=document.documentElement;if(d.dataset.tintLock==='true')return;var s=null;try{s=localStorage.getItem('rf-theme')}catch(e){}var m=s&&s!=='auto'?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');d.setAttribute('data-theme',m)})();`;
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
