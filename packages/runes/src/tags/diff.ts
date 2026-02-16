import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const modeType = ['unified', 'split', 'inline'] as const;

interface DiffHunk {
	type: 'equal' | 'add' | 'remove';
	text: string;
}

/**
 * Compute line-level diff using LCS (Longest Common Subsequence).
 * Returns an array of hunks with type and raw text.
 * Highlighting is deferred to the pipeline's highlight transform.
 */
function computeLineDiff(before: string, after: string): DiffHunk[] {
	const a = before.split('\n');
	const b = after.split('\n');

	// Build LCS table
	const m = a.length, n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] = a[i - 1] === b[j - 1]
				? dp[i - 1][j - 1] + 1
				: Math.max(dp[i - 1][j], dp[i][j - 1]);
		}
	}

	// Backtrack to produce hunks
	let i = m, j = n;
	const stack: DiffHunk[] = [];

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
			stack.push({ type: 'equal', text: a[i - 1] });
			i--; j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			stack.push({ type: 'add', text: b[j - 1] });
			j--;
		} else {
			stack.push({ type: 'remove', text: a[i - 1] });
			i--;
		}
	}

	stack.reverse();
	return stack;
}

/** Align hunks into paired split lines (before/after) */
function getSplitLines(hunks: DiffHunk[]): { before: (DiffHunk | null)[]; after: (DiffHunk | null)[] } {
	const before: (DiffHunk | null)[] = [];
	const after: (DiffHunk | null)[] = [];
	let i = 0;
	while (i < hunks.length) {
		if (hunks[i].type === 'equal') {
			before.push(hunks[i]);
			after.push(hunks[i]);
			i++;
		} else {
			const removes: DiffHunk[] = [];
			const adds: DiffHunk[] = [];
			while (i < hunks.length && hunks[i].type === 'remove') {
				removes.push(hunks[i]);
				i++;
			}
			while (i < hunks.length && hunks[i].type === 'add') {
				adds.push(hunks[i]);
				i++;
			}
			const maxLen = Math.max(removes.length, adds.length);
			for (let j = 0; j < maxLen; j++) {
				before.push(j < removes.length ? removes[j] : null);
				after.push(j < adds.length ? adds[j] : null);
			}
		}
	}
	return { before, after };
}

/** Compute unified line numbers for each hunk */
function getUnifiedLines(hunks: DiffHunk[]): { hunk: DiffHunk; beforeNum: number | null; afterNum: number | null }[] {
	const lines: { hunk: DiffHunk; beforeNum: number | null; afterNum: number | null }[] = [];
	let bNum = 1, aNum = 1;
	for (const hunk of hunks) {
		if (hunk.type === 'equal') {
			lines.push({ hunk, beforeNum: bNum, afterNum: aNum });
			bNum++; aNum++;
		} else if (hunk.type === 'remove') {
			lines.push({ hunk, beforeNum: bNum, afterNum: null });
			bNum++;
		} else if (hunk.type === 'add') {
			lines.push({ hunk, beforeNum: null, afterNum: aNum });
			aNum++;
		}
	}
	return lines;
}

/** Build unified diff renderable — pre with line spans, gutter numbers, and prefix */
function buildUnifiedRenderable(hunks: DiffHunk[], lang: string) {
	const lines = getUnifiedLines(hunks);
	const lineNodes = lines.map(({ hunk, beforeNum, afterNum }) => {
		const prefix = hunk.type === 'remove' ? '-' : hunk.type === 'add' ? '+' : ' ';
		return new Tag('span', { 'data-name': 'line', 'data-type': hunk.type }, [
			new Tag('span', { 'data-name': 'gutter-num' }, [beforeNum != null ? String(beforeNum) : ' ']),
			new Tag('span', { 'data-name': 'gutter-num' }, [afterNum != null ? String(afterNum) : ' ']),
			new Tag('span', { 'data-name': 'gutter-prefix' }, [prefix]),
			new Tag('span', { 'data-name': 'line-content', ...(lang ? { 'data-language': lang } : {}) }, [hunk.text]),
		]);
	});

	return [new Tag('pre', { 'data-name': 'code' }, lineNodes)];
}

/** Build split diff renderable — side-by-side panels with before/after lines */
function buildSplitRenderable(hunks: DiffHunk[], lang: string) {
	const { before, after } = getSplitLines(hunks);

	function buildPanelLines(lines: (DiffHunk | null)[]) {
		return lines.map(line => {
			const type = line ? line.type : 'empty';
			return new Tag('span', { 'data-name': 'line', 'data-type': type }, [
				new Tag('span', { 'data-name': 'gutter' }, [line ? '' : ' ']),
				new Tag('span', { 'data-name': 'line-content', ...(line && lang ? { 'data-language': lang } : {}) }, [
					line ? line.text : '\u00a0',
				]),
			]);
		});
	}

	return [new Tag('div', { 'data-name': 'split-container' }, [
		new Tag('div', { 'data-name': 'panel' }, [
			new Tag('div', { 'data-name': 'header' }, ['Before']),
			new Tag('pre', { 'data-name': 'code' }, buildPanelLines(before)),
		]),
		new Tag('div', { 'data-name': 'panel' }, [
			new Tag('div', { 'data-name': 'header-after' }, ['After']),
			new Tag('pre', { 'data-name': 'code' }, buildPanelLines(after)),
		]),
	])];
}

class DiffModel extends Model {
	@attribute({ type: String, required: false, matches: modeType.slice() })
	mode: typeof modeType[number] = 'unified';

	@attribute({ type: String, required: false })
	language: string = '';

	transform(): RenderableTreeNodes {
		const modeMeta = new Tag('meta', { content: this.mode });
		const languageMeta = new Tag('meta', { content: this.language });

		// Extract raw source directly from AST
		const fences: { content: string; language: string }[] = [];
		for (const child of this.node.children) {
			if (child.type === 'fence') {
				fences.push({
					content: child.attributes.content || '',
					language: child.attributes.language || '',
				});
			}
		}

		const beforeSource = fences.length > 0 ? fences[0].content.replace(/\n$/, '') : '';
		const afterSource = fences.length > 1 ? fences[1].content.replace(/\n$/, '') : '';
		const lang = this.language || (fences.length > 0 ? fences[0].language : '');

		// Compute line-level diff (highlighting deferred to highlight transform)
		const hunks = computeLineDiff(beforeSource, afterSource);

		// Build expanded renderable AST
		const expanded = this.mode === 'split'
			? buildSplitRenderable(hunks, lang)
			: buildUnifiedRenderable(hunks, lang);

		return createComponentRenderable(schema.Diff, {
			tag: 'div',
			properties: {
				mode: modeMeta,
				language: languageMeta,
			},
			children: [modeMeta, languageMeta, ...expanded],
		});
	}
}

export const diff = createSchema(DiffModel);
