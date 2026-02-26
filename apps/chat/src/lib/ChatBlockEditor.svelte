<script lang="ts">
	import { onMount } from 'svelte';
	import BlockEditor from '@refrakt-md/editor/block-editor';
	import type { PageStore } from './page.svelte.js';
	import { getRuneInfoList, getThemeConfig, type RuneInfo } from './editor-config.js';
	import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
	import { createHighlightTransform } from '@refrakt-md/highlight';

	// Import CSS as strings for shadow DOM injection
	import luminaCss from '@refrakt-md/lumina?inline';
	import tokensCss from '@refrakt-md/lumina/svelte/tokens.css?inline';

	interface Props {
		pageStore: PageStore;
	}

	let { pageStore }: Props = $props();

	// Build rune info and theme config (cached, synchronous)
	const runeInfoList: RuneInfo[] = getRuneInfoList();
	const themeConfig: ThemeConfig = getThemeConfig();
	const themeCss = tokensCss + '\n' + luminaCss;

	// Syntax highlighting (loaded async)
	let highlightTransform: ((tree: RendererNode) => RendererNode) | null = $state(null);
	let highlightCss = $state('');

	onMount(async () => {
		try {
			const hl = await createHighlightTransform({
				theme: { light: 'laserwave', dark: 'laserwave' },
			});
			highlightTransform = hl;
			highlightCss = hl.css;
		} catch {
			// Syntax highlighting is optional — previews work without it
		}
	});

	function handleBodyChange(body: string) {
		pageStore.updateBody(body);
	}
</script>

<div class="chat-block-editor">
	<BlockEditor
		bodyContent={pageStore.page.body}
		onchange={handleBodyChange}
		runes={runeInfoList}
		{themeConfig}
		{themeCss}
		{highlightCss}
		{highlightTransform}
	/>
</div>

<style>
	.chat-block-editor {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
