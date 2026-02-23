<script lang="ts">
	import { onMount } from 'svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { RendererNode } from '@refrakt-md/types';
	import { fixtures } from './fixtures.js';
	import { renderMarkdoc, initHighlight, getHighlightCss } from './pipeline.js';
	import { themeState } from './state/theme.svelte.js';

	let renderedFixtures: { name: string; node: RendererNode }[] = $state([]);
	let ready = $state(false);

	onMount(async () => {
		await initHighlight();
		renderedFixtures = fixtures.map((f) => ({
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
</script>

<div class="preview-panel">
	{#if !ready}
		<div class="loading">Loading preview...</div>
	{:else}
		<div class="preview-content" style={previewStyle}>
			{@html `<style>${getHighlightCss()}</style>`}
			{#each renderedFixtures as fixture (fixture.name)}
				<section class="fixture">
					<div class="fixture-label">{fixture.name}</div>
					<div class="fixture-body">
						<Renderer node={fixture.node} />
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>

<style>
	.preview-panel {
		flex: 1;
		overflow-y: auto;
		background: var(--rf-color-bg, #ffffff);
		border-radius: 8px;
		border: 1px solid #e5e5e5;
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
		padding: 24px;
		font-family: var(--rf-font-sans, system-ui, sans-serif);
		color: var(--rf-color-text, #1a1a2e);
		background: var(--rf-color-bg, #ffffff);
		min-height: 100%;
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
</style>
