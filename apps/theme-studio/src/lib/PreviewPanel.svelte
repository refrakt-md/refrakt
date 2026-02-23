<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { RendererNode } from '@refrakt-md/types';
	import { initRuneBehaviors } from '@refrakt-md/behaviors';
	import { fixtures } from './fixtures.js';
	import { renderMarkdoc, initHighlight, getHighlightCss } from './pipeline.js';
	import { themeState } from './state/theme.svelte.js';
	import FixturePicker from './FixturePicker.svelte';

	let renderedFixtures: { id: string; name: string; node: RendererNode }[] = $state([]);
	let ready = $state(false);

	onMount(async () => {
		await initHighlight();
		renderedFixtures = fixtures.map((f) => ({
			id: f.id,
			name: f.name,
			node: renderMarkdoc(f.source),
		}));
		ready = true;
	});

	/** Build inline CSS custom properties for the preview wrapper */
	let previewStyle = $derived.by(() => {
		const tokens = themeState.currentTokens;
		const parts: string[] = [];
		for (const [name, value] of Object.entries(tokens)) {
			// Map token name to CSS variable
			const cssVar = name.startsWith('shiki-')
				? `--${name}`
				: `--rf-${name}`;
			parts.push(`${cssVar}: ${value}`);
		}
		return parts.join('; ');
	});

	let visibleFixtures = $derived(
		renderedFixtures.filter((f) => themeState.selectedFixtures.has(f.id))
	);

	// Initialize interactive behaviors (tabs, accordion, etc.) after render
	$effect(() => {
		if (!ready) return;
		void visibleFixtures;
		let cleanup: (() => void) | undefined;
		let active = true;
		tick().then(() => {
			if (active) cleanup = initRuneBehaviors();
		});
		return () => {
			active = false;
			cleanup?.();
		};
	});
</script>

<div class="preview-panel">
	<div class="preview-toolbar">
		<FixturePicker />
	</div>

	{#if !ready}
		<div class="loading">Loading preview...</div>
	{:else}
		<div class="preview-content" style={previewStyle}>
			{@html `<style>${getHighlightCss()}</style>`}
			{#each visibleFixtures as fixture (fixture.id)}
				<section class="fixture">
					<div class="fixture-label">{fixture.name}</div>
					<div class="fixture-body">
						<Renderer node={fixture.node} />
					</div>
				</section>
			{/each}
			{#if visibleFixtures.length === 0}
				<div class="empty-state">No fixtures selected. Use the picker above to add runes.</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.preview-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--rf-color-bg, #ffffff);
		border-radius: 8px;
		border: 1px solid #e5e5e5;
	}
	.preview-toolbar {
		flex-shrink: 0;
		padding: 8px 12px;
		border-bottom: 1px solid #e5e5e5;
		background: #fafafa;
	}
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: #999;
		font-size: 14px;
	}
	.preview-content {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
		font-family: var(--rf-font-sans, system-ui, sans-serif);
		color: var(--rf-color-text, #1a1a2e);
		background: var(--rf-color-bg, #ffffff);
		max-width: 1080px;
		margin: 0 auto;
		width: 100%;
	}
	.fixture {
		margin-bottom: 32px;
	}
	.fixture:last-child {
		margin-bottom: 0;
	}
	.fixture-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #999;
		margin-bottom: 12px;
		padding-bottom: 6px;
		border-bottom: 1px dashed #e5e5e5;
		font-family: system-ui, sans-serif;
	}
	.fixture-body {
		/* inherits custom properties from .preview-content */
	}
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: #999;
		font-size: 14px;
		font-family: system-ui, sans-serif;
	}
</style>
