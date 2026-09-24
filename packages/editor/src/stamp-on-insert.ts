/**
 * Stamp-on-insert (SPEC-134 phase 3, WORK-593).
 *
 * A snippet inserted by a human who just looked at the code is the one moment
 * when a marker is unambiguously honest — it costs nothing and it is the only
 * stamping that needs no review step.
 *
 * **It happens on save, not on template insertion.** The editor's rune
 * templates are skeletons: at the moment a `{% snippet %}` is dropped into the
 * document it has no `path=` yet, so there is no slice to hash. The first point
 * at which the invocation names a real region is when the page is written, so
 * that is where this runs.
 *
 * **It reuses the review CLI's stamping path rather than recomputing a hash
 * here.** The normalization must not have two implementations: a marker written
 * by the editor and one written by `refrakt snippet review` have to be the same
 * value for the same content, or `--check` would fire on everything the editor
 * touched.
 *
 * `expand` is never stamped — it embeds a whole document rather than a region,
 * so there is nothing of the right shape to hash.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	BASE_LANGUAGES,
	formatMarker,
	hashSlice,
	maskSource,
	reindent,
	resolveAnchor,
	resolveLanguage,
	shouldReindent,
} from '@refrakt-md/runes';

const TAG = /\{%\s*(snippet|file-ref)\b([^%]*?)(\/?)%\}/g;

function attr(attrs: string, name: string): string | undefined {
	return new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attrs)?.[1];
}

/** Resolve an invocation's slice against the current file, or undefined when
 *  it cannot be resolved — in which case nothing is stamped. */
function sliceFor(projectRoot: string, path: string, attrs: string): string | undefined {
	let source: string;
	try {
		source = readFileSync(join(projectRoot, path), 'utf8');
	} catch {
		return undefined;
	}

	const symbol = attr(attrs, 'symbol');
	const match = attr(attrs, 'match');
	const lines = attr(attrs, 'lines');

	if (symbol || match) {
		try {
			const resolved = resolveAnchor(
				source,
				resolveLanguage(path),
				{
					symbol,
					match,
					extent: attr(attrs, 'extent') as never,
					until: attr(attrs, 'until'),
					through: attr(attrs, 'through'),
				},
				path,
			);
			const raw = source
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
		const all = source.split('\n');
		const start = m[1] ? Number(m[1]) : 1;
		const end = m[2] ? Number(m[2]) : start;
		return all.slice(start - 1, end).join('\n');
	}

	return source;
}

/**
 * Add a `reviewed` marker to any unmarked `snippet` / `file-ref` invocation
 * whose slice resolves.
 *
 * Existing markers are left alone: re-stamping on save would silently clear a
 * marker that was asking for a review, which is the one thing this feature
 * cannot do.
 *
 * Fenced invocations are skipped — they are examples of the syntax rather than
 * references, and stamping one would claim a review nobody performed.
 */
export function stampOnInsert(source: string, projectRoot: string): string {
	const maskedLines = maskSource(source, BASE_LANGUAGES.markdoc).split('\n');
	const lines = source.split('\n');

	const out = lines.map((line, i) => {
		if (maskedLines[i] !== line) return line;

		TAG.lastIndex = 0;
		return line.replace(TAG, (raw, _rune, attrs: string, selfClose: string) => {
			if (attr(attrs, 'reviewed') !== undefined) return raw;
			const path = attr(attrs, 'path');
			if (!path) return raw;

			const slice = sliceFor(projectRoot, path, attrs);
			if (slice === undefined) return raw;

			const marker = ` reviewed="${formatMarker(hashSlice(slice))}"`;
			// Rebuild rather than string-splice so the self-closing form is
			// preserved exactly.
			return `{%${attrs.replace(/\s+$/, '')}${marker} ${selfClose}%}`.replace(/\{%(\S)/, '{% $1');
		});
	});

	return out.join('\n');
}
