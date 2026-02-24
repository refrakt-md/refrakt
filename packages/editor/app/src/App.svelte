<script lang="ts">
	import HeaderBar from './lib/components/HeaderBar.svelte';
	import EditorLayout from './lib/components/EditorLayout.svelte';
	import FileTree from './lib/components/FileTree.svelte';
	import MarkdownEditor from './lib/components/MarkdownEditor.svelte';
	import PreviewPane from './lib/components/PreviewPane.svelte';
	import { editorState } from './lib/state/editor.svelte.js';
	import { fetchTree, fetchFile, saveFile } from './lib/api/client.js';
	import { onMount } from 'svelte';

	onMount(async () => {
		editorState.treeLoading = true;
		try {
			editorState.tree = await fetchTree();
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to load content tree';
		} finally {
			editorState.treeLoading = false;
		}
	});

	async function handleSelectFile(path: string) {
		if (editorState.dirty) {
			if (!confirm('You have unsaved changes. Discard them?')) return;
		}

		editorState.fileLoading = true;
		editorState.error = null;
		try {
			const file = await fetchFile(path);
			editorState.currentPath = path;
			editorState.savedContent = file.raw;
			editorState.editorContent = file.raw;
			editorState.frontmatter = file.frontmatter;
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to load file';
		} finally {
			editorState.fileLoading = false;
		}
	}

	async function handleSave() {
		if (!editorState.currentPath || !editorState.dirty) return;

		editorState.saving = true;
		editorState.error = null;
		try {
			await saveFile(editorState.currentPath, editorState.editorContent);
			editorState.savedContent = editorState.editorContent;
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to save file';
		} finally {
			editorState.saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			handleSave();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor-app">
	<HeaderBar onsave={handleSave} />
	<EditorLayout>
		{#snippet left()}
			<FileTree onselectfile={handleSelectFile} />
		{/snippet}
		{#snippet center()}
			<MarkdownEditor />
		{/snippet}
		{#snippet right()}
			<PreviewPane />
		{/snippet}
	</EditorLayout>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: system-ui, -apple-system, sans-serif;
		height: 100vh;
		overflow: hidden;
		background: #0f1117;
		color: #e2e8f0;
	}

	.editor-app {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
</style>
