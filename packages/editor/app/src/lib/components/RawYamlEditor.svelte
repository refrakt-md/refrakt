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
		font-family: var(--ed-font-mono);
		font-size: var(--ed-text-base);
		line-height: 1.5;
		padding: var(--ed-space-2);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-1);
		color: var(--ed-text-primary);
		resize: vertical;
		min-height: 80px;
		outline: none;
	}

	.raw-yaml__editor:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.raw-yaml__editor.error {
		border-color: var(--ed-danger);
	}

	.raw-yaml__error {
		color: var(--ed-danger);
		font-size: var(--ed-text-xs);
		margin-top: var(--ed-space-1);
	}
</style>
