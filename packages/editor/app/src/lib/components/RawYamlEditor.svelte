<script lang="ts">
	import yaml from 'yaml';
	import { editorState } from '../state/editor.svelte.js';
	import type { Frontmatter } from '../state/editor.svelte.js';

	let rawYaml = $state('');
	let parseError: string | null = $state(null);

	// Sync from frontmatter state to raw YAML when entering raw mode or frontmatter changes externally
	$effect(() => {
		if (editorState.frontmatterRawMode) {
			const keys = Object.keys(editorState.frontmatter);
			rawYaml = keys.length > 0
				? yaml.stringify(editorState.frontmatter, { lineWidth: 0 }).trimEnd()
				: '';
		}
	});

	function handleInput(e: Event) {
		const value = (e.target as HTMLTextAreaElement).value;
		rawYaml = value;
		parseError = null;

		if (value.trim() === '') {
			editorState.replaceFrontmatter({});
			return;
		}

		try {
			const parsed = yaml.parse(value) as Frontmatter;
			if (parsed && typeof parsed === 'object') {
				editorState.replaceFrontmatter(parsed);
			} else {
				parseError = 'YAML must be an object';
			}
		} catch (err) {
			parseError = err instanceof Error ? err.message : 'Invalid YAML';
		}
	}
</script>

<div class="raw-yaml">
	<textarea
		class="raw-yaml__editor"
		class:error={parseError !== null}
		value={rawYaml}
		oninput={handleInput}
		spellcheck={false}
	></textarea>
	{#if parseError}
		<div class="raw-yaml__error">{parseError}</div>
	{/if}
</div>

<style>
	.raw-yaml {
		display: flex;
		flex-direction: column;
	}

	.raw-yaml__editor {
		font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		padding: 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		background: #f8fafc;
		color: #1a1a2e;
		resize: vertical;
		min-height: 80px;
		outline: none;
	}

	.raw-yaml__editor:focus {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	.raw-yaml__editor.error {
		border-color: #ef4444;
	}

	.raw-yaml__error {
		color: #ef4444;
		font-size: 0.7rem;
		margin-top: 0.25rem;
	}
</style>
