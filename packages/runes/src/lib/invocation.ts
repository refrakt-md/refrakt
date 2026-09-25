/**
 * The slice an embedded-source invocation resolves to (SPEC-131, SPEC-134).
 *
 * Shared because two features have to agree on it byte for byte: the review
 * marker hashes this slice, and the staleness ranking decides whether a stored
 * marker still certifies the current content. If the two ever resolved a
 * `symbol=` anchor differently, a marker would read as stale on one side and
 * current on the other, and nobody would be able to say which was right.
 *
 * Deliberately string-in, string-out — no filesystem, no git — so it stays in
 * `packages/runes`, which the editor bundles for the browser.
 */

import { reindent, shouldReindent } from './present.js';
import { resolveAnchor } from './anchor.js';
import { resolveLanguage } from './languages.js';

/** Read one double-quoted attribute out of a raw Markdoc attribute string. */
export function attrValue(attrs: string, name: string): string | undefined {
	return new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attrs)?.[1];
}

/**
 * Resolve an invocation's attribute string against the target's source.
 *
 * Returns `undefined` when the anchor refuses — the refusal is SPEC-131's to
 * report, and a caller that treated it as "no content" would double-report it.
 */
export function sliceForInvocation(
	attrs: string,
	path: string,
	fileSource: string,
): string | undefined {
	const symbol = attrValue(attrs, 'symbol');
	const match = attrValue(attrs, 'match');
	const lines = attrValue(attrs, 'lines');

	if (symbol || match) {
		const occurrence = attrValue(attrs, 'occurrence');
		try {
			const resolved = resolveAnchor(
				fileSource,
				resolveLanguage(path),
				{
					symbol,
					match,
					occurrence: occurrence ? Number(occurrence) : undefined,
					extent: attrValue(attrs, 'extent') as never,
					until: attrValue(attrs, 'until'),
					through: attrValue(attrs, 'through'),
					doc: /\bdoc\s*=\s*true/.test(attrs)
						? true
						: /\bdoc\s*=\s*false/.test(attrs)
							? false
							: undefined,
				},
				path,
			);
			const raw = fileSource
				.split('\n')
				.slice(resolved.start - 1, resolved.end)
				.join('\n');
			return shouldReindent(true, undefined) ? reindent(raw) : raw;
		} catch {
			return undefined;
		}
	}

	if (lines) {
		const m = /^(\d*)-?(\d*)$/.exec(lines.trim());
		if (!m) return undefined;
		const all = fileSource.split('\n');
		const start = m[1] ? Number(m[1]) : 1;
		const end = m[2] ? Number(m[2]) : start;
		return all.slice(start - 1, end).join('\n');
	}

	return fileSource;
}
