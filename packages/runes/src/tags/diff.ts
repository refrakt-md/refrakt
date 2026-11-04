import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { computeLineDiff, type DiffHunk } from '../lib/line-diff.js';

const modeType = ['unified', 'split', 'inline'] as const;

type SplitLine = { hunk: DiffHunk; num: number } | null;

function getSplitLines(hunks: DiffHunk[]): { before: SplitLine[]; after: SplitLine[] } {
	const before: SplitLine[] = [];
	const after: SplitLine[] = [];
	let bNum = 1,
		aNum = 1;
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

function getUnifiedLines(
	hunks: DiffHunk[],
): { hunk: DiffHunk; beforeNum: number | null; afterNum: number | null }[] {
	const lines: { hunk: DiffHunk; beforeNum: number | null; afterNum: number | null }[] = [];
	let bNum = 1,
		aNum = 1;
	for (const hunk of hunks) {
		if (hunk.type === 'equal') {
			lines.push({ hunk, beforeNum: bNum, afterNum: aNum });
			bNum++;
			aNum++;
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

function buildUnifiedRenderable(
	hunks: DiffHunk[],
	lang: string,
	beforeOffset = 0,
	afterOffset = 0,
) {
	const lines = getUnifiedLines(hunks);
	const lineNodes = lines.map(({ hunk, beforeNum, afterNum }) => {
		return new Tag('span', { 'data-name': 'line', 'data-line-status': hunk.type }, [
			new Tag('span', { 'data-name': 'gutter-num', 'data-side': 'before' }, [
				beforeNum != null ? String(beforeNum + beforeOffset) : '',
			]),
			new Tag('span', { 'data-name': 'gutter-num', 'data-side': 'after' }, [
				afterNum != null ? String(afterNum + afterOffset) : '',
			]),
			new Tag('span', { 'data-name': 'line-content', ...(lang ? { 'data-language': lang } : {}) }, [
				hunk.text,
			]),
		]);
	});

	return [
		new Tag('pre', { 'data-name': 'code', 'data-copy-selector': '[data-name="line-content"]' }, [
			new Tag('div', { 'data-name': 'rows' }, lineNodes),
		]),
	];
}

function buildSplitRenderable(hunks: DiffHunk[], lang: string, beforeOffset = 0, afterOffset = 0) {
	const { before, after } = getSplitLines(hunks);

	function buildPanelLines(lines: SplitLine[], side: 'before' | 'after', offset: number) {
		return lines.map((line) => {
			const type = line ? line.hunk.type : 'empty';
			return new Tag('span', { 'data-name': 'line', 'data-line-status': type }, [
				new Tag('span', { 'data-name': 'gutter-num', 'data-side': side }, [
					line ? String(line.num + offset) : '',
				]),
				new Tag(
					'span',
					{ 'data-name': 'line-content', ...(line && lang ? { 'data-language': lang } : {}) },
					[line ? line.hunk.text : ''],
				),
			]);
		});
	}

	return [
		new Tag('div', { 'data-name': 'split-container' }, [
			new Tag('div', { 'data-name': 'panel' }, [
				new Tag(
					'pre',
					{ 'data-name': 'code', 'data-copy-selector': '[data-name="line-content"]' },
					[
						new Tag(
							'div',
							{ 'data-name': 'rows' },
							buildPanelLines(before, 'before', beforeOffset),
						),
					],
				),
			]),
			new Tag('div', { 'data-name': 'panel' }, [
				new Tag(
					'pre',
					{ 'data-name': 'code', 'data-copy-selector': '[data-name="line-content"]' },
					[new Tag('div', { 'data-name': 'rows' }, buildPanelLines(after, 'after', afterOffset))],
				),
			]),
		]),
	];
}

function gutterOffsetFromLines(linesAttr: unknown): number {
	if (typeof linesAttr !== 'string' || linesAttr.length === 0) return 0;
	const m = /^(\d+)/.exec(linesAttr.trim());
	if (!m) return 0;
	const n = Number(m[1]);
	return Number.isFinite(n) && n > 0 ? n - 1 : 0;
}

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
		mode: {
			type: String,
			required: false,
			matches: modeType.slice(),
			description: 'Diff display style: unified, split, or inline',
		},
		language: {
			type: String,
			required: false,
			description: 'Programming language for syntax highlighting',
		},
		title: {
			type: String,
			required: false,
			description: 'Optional title or filename displayed above the diff',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'fences', match: 'fence', greedy: true }],
	},
	transform(resolved, attrs) {
		const mode = attrs.mode ?? 'unified';
		const language = attrs.language ?? '';
		const title = attrs.title ?? '';

		const modeMeta = new Tag('meta', { content: mode });
		const languageMeta = new Tag('meta', { content: language });

		const fences = asNodes(resolved.fences);
		const beforeSource =
			fences.length > 0 ? (fences[0].attributes.content || '').replace(/\n$/, '') : '';
		const afterSource =
			fences.length > 1 ? (fences[1].attributes.content || '').replace(/\n$/, '') : '';
		const lang = language || (fences.length > 0 ? fences[0].attributes.language || '' : '');

		const beforeFenceSource =
			fences.length > 0 && typeof fences[0].attributes.source === 'string'
				? (fences[0].attributes.source as string)
				: undefined;
		const afterFenceSource =
			fences.length > 1 && typeof fences[1].attributes.source === 'string'
				? (fences[1].attributes.source as string)
				: undefined;
		const beforeOffset = fences.length > 0 ? gutterOffsetFromLines(fences[0].attributes.lines) : 0;
		const afterOffset = fences.length > 1 ? gutterOffsetFromLines(fences[1].attributes.lines) : 0;

		const hunks = computeLineDiff(beforeSource, afterSource);

		const expanded =
			mode === 'split'
				? buildSplitRenderable(hunks, lang, beforeOffset, afterOffset)
				: buildUnifiedRenderable(hunks, lang, beforeOffset, afterOffset);

		const header = deriveHeader(title, beforeFenceSource, afterFenceSource);

		const renderable = createComponentRenderable({
			rune: 'diff',
			tag: 'div',
			properties: {
				mode: modeMeta,
				language: languageMeta,
			},
			children: [...header, ...expanded],
		});
		renderable.attributes['data-code-host'] = true;
		return renderable;
	},
});
