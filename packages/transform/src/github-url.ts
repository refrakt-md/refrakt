/**
 * GitHub blob URL builder (SPEC-078).
 *
 * Turns a `(repoUrl, repoBranch, path, lines?)` tuple into a deep-link URL
 * of the form `{repoUrl}/blob/{ref}/{path}#L{start}-L{end}`. Used by the
 * `file-ref` rune for the "View source on GitHub" link both inline (no
 * preview) and as the chrome footer link inside a hoisted preview drawer.
 *
 * Returns `null` when `repoUrl` is missing — callers (`file-ref` rune,
 * chrome-footer rendering) fall back to no-href / in-page anchors and
 * emit a build warning when this happens.
 *
 * Path segment encoding: each `/`-separated segment is encoded
 * individually so the path's `/` separators round-trip while special
 * characters inside segment names (spaces, parens, etc.) become
 * percent-escaped. Trailing slashes on `repoUrl` are tolerated.
 */
export function buildGithubBlobUrl(
	repoUrl: string | undefined,
	repoBranch: string | undefined,
	path: string,
	lines?: string,
): string | null {
	if (!repoUrl) return null;
	const trimmedRepo = repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl;
	const ref = repoBranch && repoBranch.length > 0 ? repoBranch : 'main';
	const encodedPath = path
		.split('/')
		.map(segment => encodeURIComponent(segment))
		.join('/');
	const anchor = lines ? `#${formatLineAnchor(lines)}` : '';
	return `${trimmedRepo}/blob/${ref}/${encodedPath}${anchor}`;
}

/** Turn a `lines` attribute value (`"42-58"`, `"42"`, or `42-58` with
 *  whitespace) into the GitHub anchor fragment (`L42-L58` / `L42`). Used
 *  internally by {@link buildGithubBlobUrl}; exposed so `file-ref`'s
 *  inline-link path can produce a matching `#L42-L58` fragment when no
 *  `repoUrl` is configured and the rune falls back to an in-page anchor
 *  pointing at a snippet of the same file. */
export function formatLineAnchor(lines: string): string {
	const trimmed = lines.trim();
	const dash = trimmed.indexOf('-');
	if (dash < 0) return `L${trimmed}`;
	const start = trimmed.slice(0, dash).trim();
	const end = trimmed.slice(dash + 1).trim();
	if (!end) return `L${start}`;
	return `L${start}-L${end}`;
}
