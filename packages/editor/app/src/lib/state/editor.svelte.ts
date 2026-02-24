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
	frontmatter: Record<string, unknown> = $state({});

	treeLoading = $state(false);
	fileLoading = $state(false);
	saving = $state(false);
	error: string | null = $state(null);

	/** Directories the user has collapsed */
	collapsedDirs: Set<string> = $state(new Set());

	dirty = $derived(this.editorContent !== this.savedContent);

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

export type { TreeNode };
