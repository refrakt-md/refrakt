// The anchoring slice: typescript only, `symbol` + `auto`, doc comments, review hashes. From riviere/docs/concepts/anchoring.md.

export function digest(input: string): string {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < input.length; i++) {
		const ch = input.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	const value = 4294967296 * (2097151 & h2) + (h1 >>> 0);
	return value.toString(16).padStart(12, '0').slice(-12);
}

export function strict(text: string): string {
	let lines = text.replace(/\r\n?/g, '\n').split('\n');
	// 1. reindent: remove the indentation all non-blank lines share (literal prefix), and empty whitespace-only lines
	const nonBlank = lines.filter((l) => l.trim() !== '');
	let prefix = nonBlank.length ? (/^[ \t]*/.exec(nonBlank[0])![0]) : '';
	for (const l of nonBlank) while (prefix && !l.startsWith(prefix)) prefix = prefix.slice(0, -1);
	lines = lines.map((l) => (l.trim() === '' ? '' : l.slice(prefix.length)));
	// 3. trailing spaces and tabs
	lines = lines.map((l) => l.replace(/[ \t]+$/, ''));
	// 4. trailing newlines
	return lines.join('\n').replace(/\n+$/, '');
}
export function loose(text: string): string {
	return strict(text).split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter((l) => l !== '').join('\n');
}

const TS = {
	keywords: ['interface', 'type', 'class', 'const', 'let', 'var', 'function', 'enum', 'namespace'],
	modifiers: ['export', 'default', 'declare', 'async', 'abstract', 'static', 'public', 'private', 'protected', 'readonly'],
};

/** Blank comments, strings and template literals, keeping newlines. Returns masked text and a comment-only mask. */
function mask(src: string): { all: string; comments: boolean[] } {
	const out = src.split('');
	const comments = Array(src.length).fill(false);
	let i = 0;
	const blank = (a: number, b: number, isComment: boolean) => { for (let k = a; k < b; k++) { if (out[k] !== '\n') out[k] = ' '; if (isComment) comments[k] = true; } };
	const stack: number[] = []; // template depth: brace counts inside ${ }
	while (i < src.length) {
		const c = src[i];
		if (c === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); const e = j < 0 ? src.length : j; blank(i, e, true); i = e; continue; }
		if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); const e = j < 0 ? src.length : j + 2; blank(i, e, true); i = e; continue; }
		if (c === '"' || c === "'") { let j = i + 1; while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1; blank(i + 1, j, false); i = j + 1; continue; }
		if (c === '`' || (c === '}' && stack.length && stack[stack.length - 1] === 0)) {
			if (c === '}') stack.pop();
			let j = i + 1;
			while (j < src.length && src[j] !== '`' && !(src[j] === '$' && src[j + 1] === '{')) j += src[j] === '\\' ? 2 : 1;
			blank(i + 1, j, false);
			if (src[j] === '$') { stack.push(0); i = j + 2; } else i = j + 1;
			continue;
		}
		if (stack.length) { if (c === '{') stack[stack.length - 1]++; else if (c === '}') stack[stack.length - 1]--; }
		i++;
	}
	return { all: out.join(''), comments };
}

export type Region = { ok: true; startLine: number; endLine: number; text: string; warnings: string[] } | { ok: false; reason: string };

export function findSymbol(path: string, src: string, name: string): Region {
	if (!/\.(ts|tsx|mts|cts)$/.test(path)) return { ok: false, reason: `${path}: \`symbol\` needs a language with keywords; this slice knows typescript only` };
	const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`^([ \\t]*)((${TS.modifiers.join('|')})\\s+)*(${TS.keywords.join('|')})\\s*\\*?\\s+${esc}\\b`);
	const lines = src.split('\n');
	const { all, comments } = mask(src);
	const mlines = all.split('\n');
	let offset = 0;
	const hits: number[] = [];
	lines.forEach((l, n) => { if (re.test(l) && !comments[offset + (/^[ \t]*/.exec(l)![0].length)]) hits.push(n); offset += l.length + 1; });
	if (!hits.length) return { ok: false, reason: `${path}: no line matches symbol \`${name}\`; fall back to until/through or a line range` };
	const warnings = hits.length > 1 ? [`symbol \`${name}\` matches lines ${hits.map((h) => h + 1).join(', ')}; the first is taken`] : [];
	const a = hits[0];
	// auto: depth from the anchor line
	let depth = 0, opened = false, end = -1;
	outer: for (let n = a; n < mlines.length; n++) {
		const l = mlines[n];
		for (let k = 0; k < l.length; k++) {
			const ch = l[k];
			if ('{(['.includes(ch)) { depth++; if (ch === '{') opened = true; }
			else if ('})]'.includes(ch)) { depth--; if (ch === '}' && depth === 0 && opened) { end = n; break outer; } }
			else if (ch === ';' && depth === 0) { end = n; break outer; }
		}
		// GAP-22: the brace-less statement rule ("ends at the first line back at the anchor's depth whose next line does
		// not start with a continuation") is not implemented; a statement without `;` or a block refuses here.
	}
	if (end < 0) return { ok: false, reason: `${path}: \`auto\` reached the end of the file without its terminator; try extent="dedent"` };
	const sliceM = mlines.slice(a, end + 1).join('\n');
	const bal = (o: string, c: string) => [...sliceM].filter((x) => x === o).length === [...sliceM].filter((x) => x === c).length;
	if (!bal('{', '}') || !bal('(', ')') || !bal('[', ']')) return { ok: false, reason: `${path}: the slice does not balance` };
	// head: annotations always; doc comment (on for `symbol`) up to the first blank line
	let start = a;
	while (start > 0 && /^\s*@/.test(lines[start - 1]) && !/\{\s*$/.test(lines[start - 1])) start--;
	let s2 = start;
	while (s2 > 0 && lines[s2 - 1].trim() !== '' && /^\s*(\/\/|\/\*|\*)/.test(lines[s2 - 1])) s2--;
	start = s2;
	return { ok: true, startLine: start + 1, endLine: end + 1, text: lines.slice(start, end + 1).join('\n'), warnings };
}

export function reviewHash(text: string): { strict: string; loose: string } {
	return { strict: digest(strict(text)), loose: digest(loose(text)) };
}

/** Compare a `reviewed` marker with the region now. Each half compares on the length written (8..12). */
export function verdict(marker: string, text: string): 'current' | 'formatting-only' | 'stale' {
	const [s, l] = marker.split(':');
	const now = reviewHash(text);
	if (now.strict.startsWith(s)) return 'current';
	if (l && now.loose.startsWith(l)) return 'formatting-only';
	return 'stale';
}
