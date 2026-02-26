import { parseBlocks } from '@refrakt-md/editor/block-parser';
import type { ContentSection } from './blocks.js';
import { extractSectionSources } from './blocks.js';
import { savePage, loadPage } from './db.js';

export interface PageState {
	title: string;
	description: string;
	body: string;
}

export interface PageStore {
	readonly page: PageState;
	readonly isOpen: boolean;
	readonly pinCount: number;
	open(): void;
	close(): void;
	toggle(): void;
	appendContent(source: string): void;
	appendSections(messageContent: string, sections: ContentSection[]): void;
	updateBody(body: string): void;
	updateMeta(title: string, description: string): void;
	exportPage(): void;
	clearPage(): void;
	loadForConversation(conversationId: string | null): Promise<void>;
}

/** Escape a YAML string value if it contains special characters. */
function yamlString(s: string): string {
	if (/[:#"'\n]/.test(s)) return JSON.stringify(s);
	return s;
}

/** Build a Markdoc `.md` string from the page state. */
export function exportPageToMarkdoc(page: PageState): string {
	const lines: string[] = [];

	// YAML frontmatter
	const hasMeta = page.title || page.description;
	if (hasMeta) {
		lines.push('---');
		if (page.title) lines.push(`title: ${yamlString(page.title)}`);
		if (page.description) lines.push(`description: ${yamlString(page.description)}`);
		lines.push('---');
		lines.push('');
	}

	if (page.body.trim()) {
		lines.push(page.body.trim());
		lines.push('');
	}

	return lines.join('\n');
}

/**
 * Migrate legacy pin-based page data to the body-content model.
 * Joins pin sources into a single markdown string.
 */
function migratePinsToBody(pins: any[]): string {
	if (!pins || pins.length === 0) return '';
	const sorted = [...pins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	const sources: string[] = [];
	for (const pin of sorted) {
		const source = (pin.editedSource ?? pin.source ?? '').trim();
		if (source) sources.push(source);
	}
	return sources.join('\n\n');
}

export function createPageStore(): PageStore {
	let page = $state<PageState>({ title: '', description: '', body: '' });
	let isOpen = $state(false);
	let currentConversationId: string | null = null;

	async function persist() {
		if (currentConversationId) {
			await savePage(currentConversationId, {
				title: page.title,
				description: page.description,
				body: page.body,
			});
		}
	}

	let persistTimer: ReturnType<typeof setTimeout> | null = null;

	function debouncedPersist() {
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = setTimeout(() => persist(), 500);
	}

	function appendContent(source: string) {
		const trimmed = source.trim();
		if (!trimmed) return;

		if (page.body.trim()) {
			page.body = page.body.trimEnd() + '\n\n' + trimmed;
		} else {
			page.body = trimmed;
		}
		persist();
	}

	function appendSections(messageContent: string, sections: ContentSection[]) {
		if (sections.length === 0) return;
		const sources = extractSectionSources(messageContent, sections);
		const newParts: string[] = [];
		for (const section of sections) {
			const source = sources.get(section.index);
			if (source?.trim()) newParts.push(source.trim());
		}
		if (newParts.length > 0) {
			appendContent(newParts.join('\n\n'));
		}
	}

	function updateBody(body: string) {
		page.body = body;
		debouncedPersist();
	}

	function updateMeta(title: string, description: string) {
		page.title = title;
		page.description = description;
		debouncedPersist();
	}

	function exportPage() {
		const md = exportPageToMarkdoc(page);
		const slug = (page.title || 'page')
			.replace(/[^a-z0-9\-_ ]/gi, '')
			.replace(/\s+/g, '-')
			.toLowerCase();
		const filename = slug + '.md';
		const blob = new Blob([md], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function clearPage() {
		page = { title: '', description: '', body: '' };
		persist();
	}

	async function loadForConversation(conversationId: string | null) {
		currentConversationId = conversationId;
		if (!conversationId) {
			page = { title: '', description: '', body: '' };
			return;
		}

		const stored = await loadPage(conversationId);
		if (stored) {
			// Migrate legacy pin-based data to body-content model
			let body = stored.body ?? '';
			if (!body && stored.pins && stored.pins.length > 0) {
				body = migratePinsToBody(stored.pins);
			}

			page = {
				title: stored.title ?? '',
				description: stored.description ?? '',
				body,
			};

			// Persist migrated data (saves body, drops pins)
			if (!stored.body && body) {
				persist();
			}
		} else {
			page = { title: '', description: '', body: '' };
		}
	}

	// Derive block count from body content
	const pinCount = $derived.by(() => {
		if (!page.body.trim()) return 0;
		return parseBlocks(page.body).length;
	});

	return {
		get page() {
			return page;
		},
		get isOpen() {
			return isOpen;
		},
		get pinCount() {
			return pinCount;
		},
		open() {
			isOpen = true;
		},
		close() {
			isOpen = false;
		},
		toggle() {
			isOpen = !isOpen;
		},
		appendContent,
		appendSections,
		updateBody,
		updateMeta,
		exportPage,
		clearPage,
		loadForConversation,
	};
}
