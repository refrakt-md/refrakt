<script lang="ts">
	import HeaderBar from './lib/components/HeaderBar.svelte';
	import EditorLayout from './lib/components/EditorLayout.svelte';
	import FileTree from './lib/components/FileTree.svelte';
	import FrontmatterEditor from './lib/components/FrontmatterEditor.svelte';
	import MarkdownEditor from './lib/components/MarkdownEditor.svelte';
	import BlockEditor from './lib/components/BlockEditor.svelte';
	import LayoutEditor from './lib/components/LayoutEditor.svelte';
	import PreviewPane from './lib/components/PreviewPane.svelte';
	import PageCard from './lib/components/PageCard.svelte';

	import CreatePageModal from './lib/components/CreatePageModal.svelte';
	import CreateDirectoryModal from './lib/components/CreateDirectoryModal.svelte';
	import ContextMenu from './lib/components/ContextMenu.svelte';
	import RenameDialog from './lib/components/RenameDialog.svelte';
	import ConfirmDialog from './lib/components/ConfirmDialog.svelte';
	import ExternalChangeBanner from './lib/components/ExternalChangeBanner.svelte';
	import { editorState, type TreeNode } from './lib/state/editor.svelte.js';
	import {
		fetchTree, fetchFile, saveFile,
		createPage, createDirectory,
		renameFile, duplicateFile, deleteFile, toggleDraft,
		fetchRunes, fetchConfig, connectEvents,
	} from './lib/api/client.js';
	import { RfDiagram, RfSandbox, RfMap } from '@refrakt-md/behaviors';
	import { onMount } from 'svelte';

	// Register web components for inline block previews
	if (!customElements.get('rf-diagram')) {
		customElements.define('rf-diagram', RfDiagram);
	}
	if (!customElements.get('rf-sandbox')) {
		customElements.define('rf-sandbox', RfSandbox);
	}
	if (!customElements.get('rf-map')) {
		customElements.define('rf-map', RfMap);
	}

	// ── Modal state ─────────────────────────────────────────────
	let showPageModal = $state(false);
	let showDirModal = $state(false);

	// ── Context menu state ──────────────────────────────────────
	let contextMenu: { x: number; y: number; node: TreeNode } | null = $state(null);

	// ── Dialog state ────────────────────────────────────────────
	let renameTarget: TreeNode | null = $state(null);
	let deleteTarget: TreeNode | null = $state(null);

	// ── Own-save suppression ─────────────────────────────────────
	let lastSavePath = '';
	let lastSaveTime = 0;

	// ── Lifecycle ───────────────────────────────────────────────
	onMount(() => {
		// Async init wrapped in IIFE so onMount can return cleanup
		(async () => {
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
				editorState.themeCss = config.themeCss;
				editorState.themeConfig = config.themeConfig;

				// Lazy-load Shiki syntax highlighting (non-blocking)
				import('@refrakt-md/highlight').then(({ createHighlightTransform }) =>
					createHighlightTransform().then((ht) => {
						editorState.highlightTransform = ht;
						editorState.highlightCss = ht.css;
					})
				).catch(() => {
					// Shiki failed to load — block previews work fine without highlighting
				});

				// Auto-open index.md if present at content root
				const indexPage = tree.children?.find(
					(c: TreeNode) => c.type === 'page' && c.name === 'index.md'
				);
				if (indexPage) {
					handleSelectFile(indexPage.path);
				}
			} catch (e) {
				editorState.error = e instanceof Error ? e.message : 'Failed to load content tree';
			} finally {
				editorState.treeLoading = false;
			}
		})();

		// SSE — listen for external file changes
		let treeTimer: ReturnType<typeof setTimeout>;
		const disconnect = connectEvents((event, data) => {
			// Debounced tree refresh for all events
			clearTimeout(treeTimer);
			treeTimer = setTimeout(() => refreshTree(), 500);

			// Show banner if currently open file was changed/deleted
			if (data.path === editorState.currentPath) {
				// Skip if this was our own save (within 2s)
				if (lastSavePath === data.path && Date.now() - lastSaveTime < 2000) return;
				editorState.externalChange = { path: data.path, event };
			}
		});

		return () => {
			disconnect();
			clearTimeout(treeTimer);
		};
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

		editorState.externalChange = null;
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
			lastSavePath = editorState.currentPath;
			lastSaveTime = Date.now();
			await saveFile(editorState.currentPath, editorState.editorContent);
			editorState.savedContent = editorState.editorContent;
			editorState.saveJustCompleted = true;
			setTimeout(() => { editorState.saveJustCompleted = false; }, 1500);
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

	async function handleReloadExternalChange() {
		if (editorState.dirty && !confirm('You have unsaved changes. Reload will discard them.')) return;
		if (editorState.externalChange?.event === 'file-deleted') {
			editorState.currentPath = null;
			editorState.editorContent = '';
			editorState.savedContent = '';
			editorState.bodyContent = '';
			editorState.frontmatter = {};
		} else if (editorState.externalChange) {
			const file = await fetchFile(editorState.externalChange.path);
			editorState.loadFile(file.path, file.raw);
		}
		editorState.externalChange = null;
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
			<ExternalChangeBanner onreload={handleReloadExternalChange} />
			{#if editorState.currentFileType === 'layout'}
				<LayoutEditor />
			{:else if editorState.currentPath}
				<FrontmatterEditor forceRawMode />
				<MarkdownEditor />
			{/if}
		{/snippet}
		{#snippet right()}
			{#if !editorState.currentPath}
				<div class="editor-placeholder">
					<svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="6" y="4" width="24" height="32" rx="2" />
						<polyline points="20 4 20 14 30 14" />
						<line x1="12" y1="22" x2="24" y2="22" />
						<line x1="12" y1="27" x2="20" y2="27" />
						<path d="M34 24l6 6M34 36l6-6" />
					</svg>
					<span>Select a file to edit</span>
				</div>
			{:else if editorState.currentFileType !== 'layout'}
				<PageCard>
					{#if editorState.editorMode === 'preview'}
						<PreviewPane onnavigate={handleSelectFile} />
					{:else}
						<BlockEditor
							bodyContent={editorState.bodyContent}
							onchange={(body) => editorState.updateBody(body)}
							runes={editorState.runes}
							themeConfig={editorState.themeConfig}
							themeCss={editorState.themeCss}
							highlightCss={editorState.highlightCss}
							highlightTransform={editorState.highlightTransform}
							frontmatter={editorState.frontmatter}
							readOnly={editorState.editorMode === 'code'}
						/>
					{/if}
				</PageCard>
			{/if}
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
	@import './lib/styles/tokens.css';

	.editor-placeholder {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: var(--ed-space-3);
		color: var(--ed-text-muted);
		font-size: var(--ed-text-md);
	}

	.editor-placeholder svg {
		color: var(--ed-border-strong);
	}

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
		border-radius: var(--ed-radius-sm);
	}

	:global(*:hover::-webkit-scrollbar-thumb) {
		background: rgba(0, 0, 0, 0.15);
	}

	:global(*:hover::-webkit-scrollbar-thumb:hover) {
		background: rgba(0, 0, 0, 0.3);
	}

	:global(body) {
		font-family: var(--ed-font-sans);
		height: 100vh;
		overflow: hidden;
		background: var(--ed-surface-1);
		color: var(--ed-text-primary);
	}

	:global(:focus-visible) {
		outline: none;
		box-shadow: 0 0 0 3px var(--ed-accent-ring);
	}

	.editor-app {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

</style>
