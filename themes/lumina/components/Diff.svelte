<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const mode = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'mode')?.attributes?.content || 'unified';
	const language = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'language')?.attributes?.content || '';

	// Parse diff data from the data meta tag
	const rawData = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.['data-name'] === 'data')?.attributes?.content || '{}';

	interface DiffHunk {
		type: 'equal' | 'add' | 'remove';
		text: string;
		html: string;
	}

	let diffData: { language: string; hunks: DiffHunk[] } = { language: '', hunks: [] };
	try {
		diffData = JSON.parse(rawData);
	} catch {}

	const hunks = diffData.hunks || [];

	// For split mode: pair consecutive removes/adds on the same row
	function getSplitLines(): { before: (DiffHunk | null)[]; after: (DiffHunk | null)[] } {
		const before: (DiffHunk | null)[] = [];
		const after: (DiffHunk | null)[] = [];
		let i = 0;
		while (i < hunks.length) {
			if (hunks[i].type === 'equal') {
				before.push(hunks[i]);
				after.push(hunks[i]);
				i++;
			} else {
				// Collect consecutive removes and adds as a change block
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
				// Pair them row by row, padding the shorter side with nulls
				const maxLen = Math.max(removes.length, adds.length);
				for (let j = 0; j < maxLen; j++) {
					before.push(j < removes.length ? removes[j] : null);
					after.push(j < adds.length ? adds[j] : null);
				}
			}
		}
		return { before, after };
	}

	const splitLines = mode === 'split' ? getSplitLines() : { before: [], after: [] };

	// For unified mode: compute line numbers
	function getUnifiedLines(): { hunk: DiffHunk; beforeNum: number | null; afterNum: number | null }[] {
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

	const unifiedLines = mode !== 'split' ? getUnifiedLines() : [];
</script>

<div class="diff diff-{mode}" typeof="Diff">
	{#if mode === 'split'}
		<div class="diff-split-container">
			<div class="diff-panel">
				<div class="diff-panel-header">Before</div>
				<pre class="diff-code"><code>{#each splitLines.before as line, i}<span class="diff-line {line ? 'diff-line-' + line.type : 'diff-line-empty'}"><span class="diff-gutter">{line ? '' : ' '}</span><span class="diff-line-content">{#if line}{@html line.html}{:else}&nbsp;{/if}</span>
</span>{/each}</code></pre>
			</div>
			<div class="diff-panel">
				<div class="diff-panel-header diff-panel-header-after">After</div>
				<pre class="diff-code"><code>{#each splitLines.after as line, i}<span class="diff-line {line ? 'diff-line-' + line.type : 'diff-line-empty'}"><span class="diff-gutter">{line ? '' : ' '}</span><span class="diff-line-content">{#if line}{@html line.html}{:else}&nbsp;{/if}</span>
</span>{/each}</code></pre>
			</div>
		</div>
	{:else}
		<pre class="diff-code diff-unified-code"><code>{#each unifiedLines as { hunk, beforeNum, afterNum }}<span class="diff-line diff-line-{hunk.type}"><span class="diff-gutter diff-gutter-num">{beforeNum ?? ' '}</span><span class="diff-gutter diff-gutter-num">{afterNum ?? ' '}</span><span class="diff-gutter diff-gutter-prefix">{hunk.type === 'remove' ? '-' : hunk.type === 'add' ? '+' : ' '}</span><span class="diff-line-content">{@html hunk.html}</span>
</span>{/each}</code></pre>
	{/if}
</div>

<style>
	.diff {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		margin: 1.5rem 0;
		overflow: hidden;
		font-size: 0.875rem;
	}

	.diff-split-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.diff-split-container .diff-panel:first-child {
		border-right: 1px solid var(--color-border);
	}

	.diff-panel-header {
		padding: 0.5rem 1rem;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-danger);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.diff-panel-header-after {
		color: var(--color-success);
	}

	.diff-code {
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: var(--color-code-bg, #1e1e2e);
		overflow-x: auto;
	}

	.diff-code code {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.6;
	}

	.diff-line {
		display: flex;
		min-height: 1.6em;
	}

	.diff-line-equal {
		background: transparent;
	}

	.diff-line-remove {
		background: rgba(248, 81, 73, 0.15);
	}

	.diff-line-add {
		background: rgba(63, 185, 80, 0.15);
	}

	.diff-line-empty {
		background: rgba(128, 128, 128, 0.05);
	}

	.diff-gutter {
		flex-shrink: 0;
		padding: 0 0.5rem;
		user-select: none;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.3));
	}

	.diff-gutter-num {
		width: 2.5em;
		text-align: right;
		font-size: 0.75rem;
	}

	.diff-gutter-prefix {
		width: 1.5em;
		text-align: center;
		font-weight: bold;
	}

	.diff-line-remove .diff-gutter-prefix {
		color: var(--color-danger);
	}

	.diff-line-add .diff-gutter-prefix {
		color: var(--color-success);
	}

	.diff-line-content {
		flex: 1;
		white-space: pre;
		padding-right: 1rem;
	}

	/* Unified mode header */
	.diff-unified-code {
		padding: 0;
	}
</style>
