import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';

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

type SplitLine = { hunk: DiffHunk; num: number } | null;

/** Align hunks into paired split lines (before/after) with line numbers. */
function getSplitLines(hunks: DiffHunk[]): { before: SplitLine[]; after: SplitLine[] } {
	const before: SplitLine[] = [];
	const after: SplitLine[] = [];
	let bNum = 1, aNum = 1;
	let i = 0;
	while (i < hunks.length) {
		if (hunks[i].type === 'equal') {
			before.push({ hunk: hunks[i], num: bNum++ });
			after.push({ hunk: hunks[i], num: aNum++ });
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
				before.push(j < removes.length ? { hunk: removes[j], num: bNum++ } : null);
				after.push(j < adds.length ? { hunk: adds[j], num: aNum++ } : null);
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

/** Build unified diff renderable — pre with line spans + before/after gutters.
 *  The "missing" gutter number on the off-side (after-num for a remove line,
 *  before-num for an add line) takes the place of the old `+`/`-` prefix as
 *  the directional cue: combined with the change-tinted number colour and
 *  the line's left-edge border, the absence/presence pattern says which way
 *  the change goes without a dedicated prefix column.
 *
 *  WORK-304 — line spans carry `data-line-status` (was `data-type`) to
 *  share the row primitive with code-block line highlighting and any
 *  future per-line state. Values: `equal | add | remove`. */
function buildUnifiedRenderable(hunks: DiffHunk[], lang: string, beforeOffset = 0, afterOffset = 0) {
	const lines = getUnifiedLines(hunks);
	const lineNodes = lines.map(({ hunk, beforeNum, afterNum }) => {
		return new Tag('span', { 'data-name': 'line', 'data-line-status': hunk.type }, [
			new Tag('span', { 'data-name': 'gutter-num', 'data-side': 'before' }, [beforeNum != null ? String(beforeNum + beforeOffset) : '']),
			new Tag('span', { 'data-name': 'gutter-num', 'data-side': 'after' }, [afterNum != null ? String(afterNum + afterOffset) : '']),
			new Tag('span', { 'data-name': 'line-content', ...(lang ? { 'data-language': lang } : {}) }, [hunk.text]),
		]);
	});

	return [new Tag('pre', { 'data-name': 'code', 'data-copy-selector': '[data-name="line-content"]' }, lineNodes)];
}

/** Build split diff renderable — side-by-side panels with one numbered
 *  gutter per panel. Placeholder rows (where the matching side has the
 *  add/remove) render an empty gutter + empty content; the fixed gutter
 *  width keeps the column rigid so rows align across panels.
 *
 *  WORK-304 — same `data-line-status` rename + per-side offset support
 *  as the unified renderable. `beforeOffset` / `afterOffset` are the
 *  `lines=` start minus one, so a fence with `lines="50-100"` adds 49
 *  to its 1-indexed `num` to produce gutter values starting at 50. */
function buildSplitRenderable(hunks: DiffHunk[], lang: string, beforeOffset = 0, afterOffset = 0) {
	const { before, after } = getSplitLines(hunks);

	function buildPanelLines(lines: SplitLine[], side: 'before' | 'after', offset: number) {
		return lines.map(line => {
			const type = line ? line.hunk.type : 'empty';
			return new Tag('span', { 'data-name': 'line', 'data-line-status': type }, [
				new Tag('span', { 'data-name': 'gutter-num', 'data-side': side }, [line ? String(line.num + offset) : '']),
				new Tag('span', { 'data-name': 'line-content', ...(line && lang ? { 'data-language': lang } : {}) }, [
					line ? line.hunk.text : '',
				]),
			]);
		});
	}

	return [new Tag('div', { 'data-name': 'split-container' }, [
		new Tag('div', { 'data-name': 'panel' }, [
			new Tag('pre', { 'data-name': 'code', 'data-copy-selector': '[data-name="line-content"]' }, buildPanelLines(before, 'before', beforeOffset)),
		]),
		new Tag('div', { 'data-name': 'panel' }, [
			new Tag('pre', { 'data-name': 'code', 'data-copy-selector': '[data-name="line-content"]' }, buildPanelLines(after, 'after', afterOffset)),
		]),
	])];
}

/** Parse the leading integer of a `lines="N-M"` (or `"N"`) annotation and
 *  return `N - 1` as the gutter offset, or 0 when the annotation is
 *  missing / malformed. Diff uses this per side so each panel's gutter
 *  reflects the file's actual coordinates rather than always starting at 1. */
function gutterOffsetFromLines(linesAttr: unknown): number {
	if (typeof linesAttr !== 'string' || linesAttr.length === 0) return 0;
	const m = /^(\d+)/.exec(linesAttr.trim());
	if (!m) return 0;
	const n = Number(m[1]);
	return Number.isFinite(n) && n > 0 ? n - 1 : 0;
}

/** Build the diff header: explicit `title` attribute wins, otherwise the
 *  fence `source` annotations form the header. When both sides share a
 *  source they collapse to a single label; differing sources render as
 *  `before → after`. Falls back to no header when nothing is set. */
function deriveHeader(
	title: string,
	beforeSource: string | undefined,
	afterSource: string | undefined,
): InstanceType<typeof Tag>[] {
	if (title) return [new Tag('div', { 'data-name': 'header' }, [title])];
	if (beforeSource && afterSource) {
		if (beforeSource === afterSource) {
			return [new Tag('div', { 'data-name': 'header' }, [beforeSource])];
		}
		return [new Tag('div', { 'data-name': 'header' }, [`${beforeSource} → ${afterSource}`])];
	}
	const single = beforeSource || afterSource;
	if (single) return [new Tag('div', { 'data-name': 'header' }, [single])];
	return [];
}

export const diff = createContentModelSchema({
	attributes: {
		mode: { type: String, required: false, matches: modeType.slice(), description: 'Diff display style: unified, split, or inline' },
		language: { type: String, required: false, description: 'Programming language for syntax highlighting' },
		title: { type: String, required: false, description: 'Optional title or filename displayed above the diff' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'fences', match: 'fence', greedy: true },
		],
	},
	transform(resolved, attrs) {
		const mode = attrs.mode ?? 'unified';
		const language = attrs.language ?? '';
		const title = attrs.title ?? '';

		const modeMeta = new Tag('meta', { content: mode });
		const languageMeta = new Tag('meta', { content: language });

		// Extract raw source directly from resolved AST nodes
		const fences = asNodes(resolved.fences);
		const beforeSource = fences.length > 0 ? (fences[0].attributes.content || '').replace(/\n$/, '') : '';
		const afterSource = fences.length > 1 ? (fences[1].attributes.content || '').replace(/\n$/, '') : '';
		const lang = language || (fences.length > 0 ? fences[0].attributes.language || '' : '');

		// WORK-304 — per-fence annotations:
		//   - `source` populates the diff header (and collapses to a single
		//     label when both sides share it; renders `before → after`
		//     otherwise).
		//   - `lines` derives per-side gutter offsets so each panel's
		//     line numbers reflect the file's real coordinates.
		//   - `highlight` is intentionally ignored — diff's add/remove
		//     status IS the primary line-level signal, and emphasis on
		//     top would muddy the +/- channel. Silent no-op; no warning.
		const beforeFenceSource = fences.length > 0 && typeof fences[0].attributes.source === 'string'
			? fences[0].attributes.source as string
			: undefined;
		const afterFenceSource = fences.length > 1 && typeof fences[1].attributes.source === 'string'
			? fences[1].attributes.source as string
			: undefined;
		const beforeOffset = fences.length > 0 ? gutterOffsetFromLines(fences[0].attributes.lines) : 0;
		const afterOffset = fences.length > 1 ? gutterOffsetFromLines(fences[1].attributes.lines) : 0;

		// Compute line-level diff (highlighting deferred to highlight transform)
		const hunks = computeLineDiff(beforeSource, afterSource);

		// Build expanded renderable AST
		const expanded = mode === 'split'
			? buildSplitRenderable(hunks, lang, beforeOffset, afterOffset)
			: buildUnifiedRenderable(hunks, lang, beforeOffset, afterOffset);

		const header = deriveHeader(title, beforeFenceSource, afterFenceSource);

		const renderable = createComponentRenderable({ rune: 'diff',
			tag: 'div',
			properties: {
				mode: modeMeta,
				language: languageMeta,
			},
			children: [modeMeta, languageMeta, ...header, ...expanded],
		});
		// Opt in to the highlight transform's `theme.code.colorScheme` cascade:
		// the override stamps `data-color-scheme` on `data-code-host` wrappers
		// so the entire diff (chrome + code) flips together.
		renderable.attributes['data-code-host'] = true;
		return renderable;
	},
});
