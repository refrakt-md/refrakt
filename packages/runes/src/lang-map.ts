/**
 * Extension → language map for code-block syntax highlighting.
 *
 * Shared across the snippet rune, the inspect tool, the contracts generator,
 * and any future rune that needs to infer a syntax-highlighting language
 * from a file extension. Lives in `@refrakt-md/runes` (not in a plugin)
 * because every consumer already depends on this package and plugins
 * cannot be depended on by core.
 *
 * Authors can always override inferred languages with explicit `lang=`
 * attributes; inference is the default, not the only path.
 */

/** Lowercase file extension (with leading dot) → highlight-language identifier. */
export const LANG_MAP: Readonly<Record<string, string>> = Object.freeze({
	'.ts': 'typescript',
	'.tsx': 'typescript',
	'.js': 'javascript',
	'.jsx': 'javascript',
	'.mjs': 'javascript',
	'.cjs': 'javascript',
	'.svelte': 'svelte',
	'.vue': 'vue',
	'.md': 'markdoc',
	'.markdoc': 'markdoc',
	'.json': 'json',
	'.jsonc': 'jsonc',
	'.html': 'html',
	'.css': 'css',
	'.yml': 'yaml',
	'.yaml': 'yaml',
	'.toml': 'toml',
	'.sh': 'bash',
	'.bash': 'bash',
});

/** Fallback language for extensions not covered by {@link LANG_MAP}. */
export const FALLBACK_LANG = 'text';

/**
 * Infer the highlight-language identifier from a file path or extension.
 *
 * Accepts a full path (`"src/lib/foo.ts"`), a bare extension with the dot
 * (`".ts"`), or a bare extension without (`"ts"`). Unknown extensions
 * return {@link FALLBACK_LANG}.
 *
 * @example
 * ```ts
 * inferLanguage('src/lib/foo.ts');   // 'typescript'
 * inferLanguage('.svelte');           // 'svelte'
 * inferLanguage('config.unknown');    // 'text'
 * ```
 */
export function inferLanguage(pathOrExt: string): string {
	if (typeof pathOrExt !== 'string' || pathOrExt.length === 0) return FALLBACK_LANG;

	// Reduce to the trailing extension. Three accepted shapes:
	// - `"foo/bar.ts"` → last segment is `bar.ts`; extension is `.ts`
	// - `".ts"` → already an extension
	// - `"ts"` → bare extension, no dot
	let ext: string;
	const lastSlash = Math.max(pathOrExt.lastIndexOf('/'), pathOrExt.lastIndexOf('\\'));
	const lastSegment = lastSlash >= 0 ? pathOrExt.slice(lastSlash + 1) : pathOrExt;
	const lastDot = lastSegment.lastIndexOf('.');
	if (lastDot === -1) {
		// No dot anywhere — treat the whole string as a bare extension.
		ext = '.' + lastSegment.toLowerCase();
	} else if (lastDot === 0) {
		// Leading dot only — `".ts"` style.
		ext = lastSegment.toLowerCase();
	} else {
		// Normal `name.ext`.
		ext = lastSegment.slice(lastDot).toLowerCase();
	}

	return LANG_MAP[ext] ?? FALLBACK_LANG;
}
