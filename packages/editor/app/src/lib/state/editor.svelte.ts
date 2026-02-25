import { parseFrontmatterClient, serializeFrontmatter, type Frontmatter } from '../utils/frontmatter.js';
import type { RuneInfo } from '../api/client.js';

interface TreeNode {
	name: string;
	type: 'directory' | 'page' | 'layout';
	path: string;
	draft?: boolean;
	children?: TreeNode[];
	layout?: TreeNode;
}

class EditorState {
	tree: TreeNode | null = $state(null);
	currentPath: string | null = $state(null);
	savedContent = $state('');
	editorContent = $state('');
	frontmatter: Frontmatter = $state({});
	bodyContent = $state('');

	/** Whether the frontmatter panel is open */
	frontmatterOpen = $state(false);
	/** Whether raw YAML mode is active */
	frontmatterRawMode = $state(false);

	/** Editor view mode: 'code' (CodeMirror) or 'visual' (block editor) */
	editorMode: 'code' | 'visual' = $state('visual');

	treeLoading = $state(false);
	fileLoading = $state(false);
	saving = $state(false);
	error: string | null = $state(null);

	/** Rune metadata for autocomplete/palette */
	runes: RuneInfo[] = $state([]);

	/** Preview viewport preset */
	viewport: 'desktop' | 'tablet' | 'mobile' = $state('desktop');

	/** Whether the Svelte preview runtime is available */
	previewRuntimeAvailable = $state(false);
	/** Whether the preview runtime iframe has signalled ready */
	previewRuntimeReady = $state(false);

	/** Directories the user has collapsed */
	collapsedDirs: Set<string> = $state(new Set());

	/** External file change notification (set by SSE watcher) */
	externalChange: { path: string; event: string } | null = $state(null);

	dirty = $derived(this.editorContent !== this.savedContent);

	/** Whether the current file is a layout or a regular page */
	currentFileType = $derived<'page' | 'layout'>(
		this.currentPath?.endsWith('_layout.md') ? 'layout' : 'page'
	);

	/**
	 * Load a file's raw content into the editor, splitting frontmatter and body.
	 */
	loadFile(path: string, raw: string) {
		const { frontmatter, body } = parseFrontmatterClient(raw);
		this.currentPath = path;
		this.savedContent = raw;
		this.editorContent = raw;
		this.frontmatter = frontmatter;
		this.bodyContent = body;
		this.frontmatterRawMode = false;
	}

	/**
	 * Update the markdown body (called from CodeMirror).
	 * Reconstructs editorContent from frontmatter + new body.
	 */
	updateBody(body: string) {
		this.bodyContent = body;
		this.editorContent = serializeFrontmatter(this.frontmatter, body);
	}

	/**
	 * Update a single frontmatter field.
	 * Reconstructs editorContent from updated frontmatter + body.
	 */
	updateFrontmatterField(key: string, value: unknown) {
		if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
			const { [key]: _, ...rest } = this.frontmatter;
			this.frontmatter = rest;
		} else {
			this.frontmatter = { ...this.frontmatter, [key]: value };
		}
		this.editorContent = serializeFrontmatter(this.frontmatter, this.bodyContent);
	}

	/**
	 * Replace the entire frontmatter object (e.g. from raw YAML editor).
	 * Reconstructs editorContent from new frontmatter + body.
	 */
	replaceFrontmatter(fm: Frontmatter) {
		this.frontmatter = fm;
		this.editorContent = serializeFrontmatter(fm, this.bodyContent);
	}

	toggleDir(path: string): void {
		const next = new Set(this.collapsedDirs);
		if (next.has(path)) {
			next.delete(path);
		} else {
			next.add(path);
		}
		this.collapsedDirs = next;
	}

	isDirExpanded(path: string): boolean {
		return !this.collapsedDirs.has(path);
	}
}

export const editorState = new EditorState();

export type { TreeNode, Frontmatter, RuneInfo };
