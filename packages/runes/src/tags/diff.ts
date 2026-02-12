import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import hljs from 'highlight.js';
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const modeType = ['unified', 'split', 'inline'] as const;

interface DiffHunk {
	type: 'equal' | 'add' | 'remove';
	text: string;
	html: string;
}

/**
 * Compute line-level diff using LCS (Longest Common Subsequence).
 * Returns an array of hunks with type, raw text, and hljs-highlighted HTML.
 */
function computeLineDiff(before: string, after: string, language: string): DiffHunk[] {
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
	const hunks: DiffHunk[] = [];
	let i = m, j = n;
	const stack: DiffHunk[] = [];

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
			stack.push({ type: 'equal', text: a[i - 1], html: '' });
			i--; j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			stack.push({ type: 'add', text: b[j - 1], html: '' });
			j--;
		} else {
			stack.push({ type: 'remove', text: a[i - 1], html: '' });
			i--;
		}
	}

	// Reverse (we built it backwards) and apply highlighting
	stack.reverse();
	for (const hunk of stack) {
		hunk.html = highlightLine(hunk.text, language);
		hunks.push(hunk);
	}

	return hunks;
}

function highlightLine(text: string, language: string): string {
	if (!language || !text) return escapeHtml(text);
	try {
		return hljs.highlight(text, { language }).value;
	} catch {
		return escapeHtml(text);
	}
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

class DiffModel extends Model {
	@attribute({ type: String, required: false, matches: modeType.slice() })
	mode: typeof modeType[number] = 'unified';

	@attribute({ type: String, required: false })
	language: string = '';

	transform(): RenderableTreeNodes {
		const modeMeta = new Tag('meta', { content: this.mode });
		const languageMeta = new Tag('meta', { content: this.language });

		// Extract raw source directly from AST (before hljs transformation)
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

		// Compute line-level diff with syntax highlighting
		const hunks = computeLineDiff(beforeSource, afterSource, lang);

		const diffData = JSON.stringify({ language: lang, hunks });
		const dataMeta = new Tag('meta', { content: diffData });

		return createComponentRenderable(schema.Diff, {
			tag: 'div',
			properties: {
				mode: modeMeta,
				language: languageMeta,
			},
			refs: {
				data: dataMeta,
			},
			children: [modeMeta, languageMeta, dataMeta],
		});
	}
}

export const diff = createSchema(DiffModel);
