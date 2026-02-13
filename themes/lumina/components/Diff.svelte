<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const mode = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'mode')?.attributes?.content || 'unified';
	const language = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'language')?.attributes?.content || '';

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

	const splitLines = mode === 'split' ? getSplitLines() : { before: [], after: [] };

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

<div class="rf-diff rf-diff--{mode}" typeof="Diff">
	{#if mode === 'split'}
		<div class="rf-diff__split-container">
			<div class="rf-diff__panel">
				<div class="rf-diff__header">Before</div>
				<pre class="rf-diff__code"><code>{#each splitLines.before as line, i}<span class="rf-diff__line {line ? 'rf-diff__line--' + line.type : 'rf-diff__line--empty'}"><span class="rf-diff__gutter">{line ? '' : ' '}</span><span class="rf-diff__line-content">{#if line}{@html line.html}{:else}&nbsp;{/if}</span>
</span>{/each}</code></pre>
			</div>
			<div class="rf-diff__panel">
				<div class="rf-diff__header rf-diff__header--after">After</div>
				<pre class="rf-diff__code"><code>{#each splitLines.after as line, i}<span class="rf-diff__line {line ? 'rf-diff__line--' + line.type : 'rf-diff__line--empty'}"><span class="rf-diff__gutter">{line ? '' : ' '}</span><span class="rf-diff__line-content">{#if line}{@html line.html}{:else}&nbsp;{/if}</span>
</span>{/each}</code></pre>
			</div>
		</div>
	{:else}
		<pre class="rf-diff__code rf-diff__code--unified"><code>{#each unifiedLines as { hunk, beforeNum, afterNum }}<span class="rf-diff__line rf-diff__line--{hunk.type}"><span class="rf-diff__gutter rf-diff__gutter-num">{beforeNum ?? ' '}</span><span class="rf-diff__gutter rf-diff__gutter-num">{afterNum ?? ' '}</span><span class="rf-diff__gutter rf-diff__gutter-prefix">{hunk.type === 'remove' ? '-' : hunk.type === 'add' ? '+' : ' '}</span><span class="rf-diff__line-content">{@html hunk.html}</span>
</span>{/each}</code></pre>
	{/if}
</div>
