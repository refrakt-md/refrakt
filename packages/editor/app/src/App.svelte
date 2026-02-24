<script lang="ts">
	import HeaderBar from './lib/components/HeaderBar.svelte';
	import EditorLayout from './lib/components/EditorLayout.svelte';
	import FileTree from './lib/components/FileTree.svelte';
	import FrontmatterEditor from './lib/components/FrontmatterEditor.svelte';
	import MarkdownEditor from './lib/components/MarkdownEditor.svelte';
	import LayoutEditor from './lib/components/LayoutEditor.svelte';
	import PreviewPane from './lib/components/PreviewPane.svelte';
	import CreatePageModal from './lib/components/CreatePageModal.svelte';
	import CreateDirectoryModal from './lib/components/CreateDirectoryModal.svelte';
	import ContextMenu from './lib/components/ContextMenu.svelte';
	import RenameDialog from './lib/components/RenameDialog.svelte';
	import ConfirmDialog from './lib/components/ConfirmDialog.svelte';
	import { editorState, type TreeNode } from './lib/state/editor.svelte.js';
	import {
		fetchTree, fetchFile, saveFile,
		createPage, createDirectory,
		renameFile, duplicateFile, deleteFile, toggleDraft,
		fetchRunes, fetchConfig,
	} from './lib/api/client.js';
	import { onMount } from 'svelte';

	// ── Modal state ─────────────────────────────────────────────
	let showPageModal = $state(false);
	let showDirModal = $state(false);

	// ── Context menu state ──────────────────────────────────────
	let contextMenu: { x: number; y: number; node: TreeNode } | null = $state(null);

	// ── Dialog state ────────────────────────────────────────────
	let renameTarget: TreeNode | null = $state(null);
	let deleteTarget: TreeNode | null = $state(null);

	// ── Lifecycle ───────────────────────────────────────────────
	onMount(async () => {
		editorState.treeLoading = true;
		try {
			const [tree, runes, config] = await Promise.all([
				fetchTree(),
				fetchRunes(),
				fetchConfig(),
			]);
			editorState.tree = tree;
			editorState.runes = runes;
			editorState.previewRuntimeAvailable = config.previewRuntime;
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to load content tree';
		} finally {
			editorState.treeLoading = false;
		}
	});

	async function refreshTree() {
		try {
			editorState.tree = await fetchTree();
		} catch {
			// Silently fail — tree stays as-is
		}
	}

	// ── File selection ──────────────────────────────────────────
	async function handleSelectFile(path: string) {
		if (editorState.dirty) {
			if (!confirm('You have unsaved changes. Discard them?')) return;
		}

		editorState.fileLoading = true;
		editorState.error = null;
		try {
			const file = await fetchFile(path);
			editorState.loadFile(path, file.raw);
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to load file';
		} finally {
			editorState.fileLoading = false;
		}
	}

	// ── Save ────────────────────────────────────────────────────
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

	// ── Page creation ───────────────────────────────────────────
	async function handleCreatePage(options: {
		directory: string; slug: string; title: string; template: string; draft: boolean;
	}) {
		try {
			const result = await createPage(options);
			showPageModal = false;
			await refreshTree();
			await handleSelectFile(result.path);
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to create page';
		}
	}

	// ── Directory creation ──────────────────────────────────────
	async function handleCreateDirectory(options: {
		parent: string; name: string; createLayout: boolean;
	}) {
		try {
			await createDirectory(options);
			showDirModal = false;
			await refreshTree();
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to create directory';
		}
	}

	// ── Context menu ────────────────────────────────────────────
	function handleContextMenu(e: MouseEvent, node: TreeNode) {
		contextMenu = { x: e.clientX, y: e.clientY, node };
	}

	function getContextMenuItems(node: TreeNode) {
		const items: { label: string; action: () => void; danger?: boolean }[] = [];

		if (node.type === 'page' || node.type === 'layout') {
			items.push({ label: 'Rename', action: () => { renameTarget = node; } });
			if (node.type === 'page') {
				items.push({ label: 'Duplicate', action: () => handleDuplicate(node) });
				items.push({
					label: node.draft ? 'Publish' : 'Set as Draft',
					action: () => handleToggleDraft(node),
				});
			}
			items.push({ label: 'Delete', action: () => { deleteTarget = node; }, danger: true });
		} else if (node.type === 'directory') {
			items.push({ label: 'Rename', action: () => { renameTarget = node; } });
			items.push({ label: 'Delete', action: () => { deleteTarget = node; }, danger: true });
		}

		return items;
	}

	// ── File operations ─────────────────────────────────────────
	async function handleRename(newName: string) {
		if (!renameTarget) return;
		const oldPath = renameTarget.path;
		try {
			const result = await renameFile(oldPath, newName);
			renameTarget = null;
			await refreshTree();
			// If the renamed file was the currently open file, follow it
			if (editorState.currentPath === oldPath) {
				await handleSelectFile(result.newPath);
			}
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to rename';
		}
	}

	async function handleDuplicate(node: TreeNode) {
		try {
			const result = await duplicateFile(node.path);
			await refreshTree();
			await handleSelectFile(result.path);
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to duplicate';
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		const path = deleteTarget.path;
		try {
			await deleteFile(path);
			deleteTarget = null;
			await refreshTree();
			// If the deleted file was open, clear the editor
			if (editorState.currentPath === path) {
				editorState.currentPath = null;
				editorState.editorContent = '';
				editorState.savedContent = '';
				editorState.bodyContent = '';
				editorState.frontmatter = {};
			}
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to delete';
		}
	}

	async function handleToggleDraft(node: TreeNode) {
		try {
			await toggleDraft(node.path);
			await refreshTree();
			// If the toggled file is currently open, reload it
			if (editorState.currentPath === node.path) {
				const file = await fetchFile(node.path);
				editorState.loadFile(node.path, file.raw);
			}
		} catch (e) {
			editorState.error = e instanceof Error ? e.message : 'Failed to toggle draft';
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor-app">
	<HeaderBar onsave={handleSave} />
	<EditorLayout>
		{#snippet left()}
			<FileTree
				onselectfile={handleSelectFile}
				onnewpage={() => { showPageModal = true; }}
				onnewdirectory={() => { showDirModal = true; }}
				oncontextmenu={handleContextMenu}
			/>
		{/snippet}
		{#snippet center()}
			{#if editorState.currentFileType === 'layout'}
				<LayoutEditor />
			{:else}
				<FrontmatterEditor />
				<MarkdownEditor />
			{/if}
		{/snippet}
		{#snippet right()}
			<PreviewPane onnavigate={handleSelectFile} />
		{/snippet}
	</EditorLayout>
</div>

<!-- Modals -->
{#if showPageModal}
	<CreatePageModal
		oncreate={handleCreatePage}
		onclose={() => { showPageModal = false; }}
	/>
{/if}

{#if showDirModal}
	<CreateDirectoryModal
		oncreate={handleCreateDirectory}
		onclose={() => { showDirModal = false; }}
	/>
{/if}

<!-- Context menu -->
{#if contextMenu}
	<ContextMenu
		x={contextMenu.x}
		y={contextMenu.y}
		items={getContextMenuItems(contextMenu.node)}
		onclose={() => { contextMenu = null; }}
	/>
{/if}

<!-- Dialogs -->
{#if renameTarget}
	<RenameDialog
		currentName={renameTarget.name}
		onrename={handleRename}
		onclose={() => { renameTarget = null; }}
	/>
{/if}

{#if deleteTarget}
	<ConfirmDialog
		title="Delete {deleteTarget.type === 'directory' ? 'directory' : 'file'}"
		message="Are you sure you want to delete &quot;{deleteTarget.name}&quot;? This cannot be undone."
		onconfirm={handleDelete}
		onclose={() => { deleteTarget = null; }}
	/>
{/if}

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		scrollbar-width: thin;
		scrollbar-color: transparent transparent;
	}

	:global(*:hover) {
		scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
	}

	:global(::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}

	:global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(::-webkit-scrollbar-thumb) {
		background: transparent;
		border-radius: 4px;
	}

	:global(*:hover::-webkit-scrollbar-thumb) {
		background: rgba(0, 0, 0, 0.15);
	}

	:global(*:hover::-webkit-scrollbar-thumb:hover) {
		background: rgba(0, 0, 0, 0.3);
	}

	:global(body) {
		font-family: system-ui, -apple-system, sans-serif;
		height: 100vh;
		overflow: hidden;
		background: #f8fafc;
		color: #1a1a2e;
	}

	.editor-app {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
</style>
