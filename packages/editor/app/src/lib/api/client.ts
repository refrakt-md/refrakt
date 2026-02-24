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
