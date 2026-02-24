import type { TreeNode } from '../state/editor.svelte.js';

const BASE = '';

export async function fetchTree(): Promise<TreeNode> {
	const res = await fetch(`${BASE}/api/tree`);
	if (!res.ok) throw new Error(`Failed to load tree: ${res.status}`);
	return res.json();
}

interface FileResponse {
	path: string;
	frontmatter: Record<string, unknown>;
	content: string;
	raw: string;
}

export async function fetchFile(path: string): Promise<FileResponse> {
	const res = await fetch(`${BASE}/api/files/${encodeURIComponent(path)}`);
	if (!res.ok) throw new Error(`Failed to load file: ${res.status}`);
	return res.json();
}

export async function saveFile(path: string, content: string): Promise<void> {
	const res = await fetch(`${BASE}/api/files/${encodeURIComponent(path)}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content }),
	});
	if (!res.ok) throw new Error(`Failed to save file: ${res.status}`);
}

export async function fetchPreviewHtml(path: string, content: string): Promise<string> {
	const res = await fetch(`${BASE}/api/preview`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ path, content }),
	});
	if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
	return res.text();
}

// ── File operations ──────────────────────────────────────────────────

export interface CreatePageOptions {
	directory?: string;
	slug: string;
	title: string;
	template?: string;
	draft?: boolean;
}

export async function createPage(options: CreatePageOptions): Promise<{ path: string }> {
	const res = await fetch(`${BASE}/api/pages`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(options),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string }).error ?? `Failed to create page: ${res.status}`);
	}
	return res.json();
}

export async function createDirectory(options: {
	parent?: string;
	name: string;
	createLayout?: boolean;
}): Promise<{ path: string }> {
	const res = await fetch(`${BASE}/api/directories`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(options),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string }).error ?? `Failed to create directory: ${res.status}`);
	}
	return res.json();
}

export async function renameFile(oldPath: string, newName: string): Promise<{ newPath: string }> {
	const res = await fetch(`${BASE}/api/rename`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ oldPath, newName }),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string }).error ?? `Failed to rename: ${res.status}`);
	}
	return res.json();
}

export async function duplicateFile(path: string): Promise<{ path: string }> {
	const res = await fetch(`${BASE}/api/duplicate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ path }),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string }).error ?? `Failed to duplicate: ${res.status}`);
	}
	return res.json();
}

export async function deleteFile(path: string): Promise<void> {
	const res = await fetch(`${BASE}/api/files/${encodeURIComponent(path)}`, {
		method: 'DELETE',
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string }).error ?? `Failed to delete: ${res.status}`);
	}
}

export async function toggleDraft(path: string): Promise<{ draft: boolean }> {
	const res = await fetch(`${BASE}/api/toggle-draft`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ path }),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string }).error ?? `Failed to toggle draft: ${res.status}`);
	}
	return res.json();
}

export interface PageListItem {
	slug: string;
	path: string;
	title: string;
}

export async function fetchPagesList(): Promise<PageListItem[]> {
	const res = await fetch(`${BASE}/api/pages-list`);
	if (!res.ok) throw new Error(`Failed to load pages list: ${res.status}`);
	const data = await res.json();
	return data.pages;
}
