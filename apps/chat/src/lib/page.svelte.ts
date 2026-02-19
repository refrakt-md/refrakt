import type { RendererNode } from '@refrakt-md/types';
import type { BlockType, ContentBlock } from './blocks.js';
import { extractBlockSources } from './blocks.js';
import { renderMarkdocSafe } from './pipeline.js';
import { savePage, loadPage } from './db.js';

export interface PinnedBlock {
	id: string;
	sourceMessageIndex: number;
	sourceBlockId: string;
	order: number;
	snapshot: RendererNode;
	label: string;
	type: BlockType;
	source: string;
	editedSource?: string;
	isEdited: boolean;
}

export interface PageState {
	title: string;
	description: string;
	pins: PinnedBlock[];
}

export interface PageStore {
	readonly page: PageState;
	readonly isOpen: boolean;
	readonly pinCount: number;
	open(): void;
	close(): void;
	toggle(): void;
	pinBlocks(messageIndex: number, blockIds: string[], blocks: ContentBlock[], messageContent: string): void;
	unpin(pinId: string): void;
	reorder(pinId: string, newIndex: number): void;
	updateMeta(title: string, description: string): void;
	updateBlockSource(pinId: string, newSource: string): void;
	revertBlockSource(pinId: string): void;
	getBlockSource(pinId: string): string;
	replaceBlockSource(pinId: string, newSource: string): void;
	insertPinAfter(afterPinId: string, newSource: string, label: string, type: BlockType): void;
	exportPage(): void;
	clearPage(): void;
	loadForConversation(conversationId: string | null): Promise<void>;
}

/** Escape a YAML string value if it contains special characters. */
function yamlString(s: string): string {
	if (/[:#"'\n]/.test(s)) return JSON.stringify(s);
	return s;
}

/** Build a Markdoc `.md` string from the curated page state. */
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

	// Pin content in order
	const sorted = [...page.pins].sort((a, b) => a.order - b.order);
	for (const pin of sorted) {
		const source = (pin.editedSource ?? pin.source).trim();
		if (source) {
			lines.push(source);
			lines.push('');
		}
	}

	return lines.join('\n');
}

export function createPageStore(): PageStore {
	let page = $state<PageState>({ title: '', description: '', pins: [] });
	let isOpen = $state(false);
	let currentConversationId: string | null = null;

	async function persist() {
		if (currentConversationId) {
			// Strip $state proxies via JSON round-trip — IndexedDB structured clone can't handle Proxy objects
			await savePage(currentConversationId, JSON.parse(JSON.stringify({
				title: page.title,
				description: page.description,
				pins: page.pins,
			})));
		}
	}

	let persistTimer: ReturnType<typeof setTimeout> | null = null;

	function debouncedPersist() {
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = setTimeout(() => persist(), 500);
	}

	function pinBlocks(messageIndex: number, blockIds: string[], blocks: ContentBlock[], messageContent: string) {
		const existing = new Set(page.pins.map((p) => p.sourceBlockId));
		const newPins: PinnedBlock[] = [];

		// Extract source text for the blocks being pinned
		const blockIndices = blocks
			.filter((b) => blockIds.includes(b.id) && !existing.has(b.id))
			.map((b) => b.index);
		const sources = extractBlockSources(messageContent, blockIndices);

		for (const block of blocks) {
			if (!blockIds.includes(block.id)) continue;
			if (existing.has(block.id)) continue;

			newPins.push({
				id: crypto.randomUUID(),
				sourceMessageIndex: messageIndex,
				sourceBlockId: block.id,
				order: page.pins.length + newPins.length,
				snapshot: JSON.parse(JSON.stringify(block.node)),
				label: block.label,
				type: block.type,
				source: sources.get(block.index) ?? '',
				isEdited: false,
			});
		}

		if (newPins.length > 0) {
			page.pins = [...page.pins, ...newPins];
			persist();
		}
	}

	function unpin(pinId: string) {
		page.pins = page.pins
			.filter((p) => p.id !== pinId)
			.map((p, i) => ({ ...p, order: i }));
		persist();
	}

	function reorder(pinId: string, newIndex: number) {
		const idx = page.pins.findIndex((p) => p.id === pinId);
		if (idx === -1 || idx === newIndex) return;

		const pins = [...page.pins];
		const [moved] = pins.splice(idx, 1);
		pins.splice(newIndex, 0, moved);
		page.pins = pins.map((p, i) => ({ ...p, order: i }));
		persist();
	}

	function updateMeta(title: string, description: string) {
		page.title = title;
		page.description = description;
		debouncedPersist();
	}

	function updateBlockSource(pinId: string, newSource: string) {
		const pin = page.pins.find((p) => p.id === pinId);
		if (!pin) return;

		pin.editedSource = newSource;
		pin.isEdited = true;

		// Re-render snapshot from edited source
		const result = renderMarkdocSafe(newSource);
		if (result.renderable) {
			pin.snapshot = JSON.parse(JSON.stringify(result.renderable));
		}

		debouncedPersist();
	}

	function revertBlockSource(pinId: string) {
		const pin = page.pins.find((p) => p.id === pinId);
		if (!pin) return;

		pin.editedSource = undefined;
		pin.isEdited = false;

		// Re-render snapshot from original source
		if (pin.source) {
			const result = renderMarkdocSafe(pin.source);
			if (result.renderable) {
				pin.snapshot = JSON.parse(JSON.stringify(result.renderable));
			}
		}

		persist();
	}

	function getBlockSource(pinId: string): string {
		const pin = page.pins.find((p) => p.id === pinId);
		if (!pin) return '';
		return pin.editedSource ?? pin.source;
	}

	function replaceBlockSource(pinId: string, newSource: string) {
		const pin = page.pins.find((p) => p.id === pinId);
		if (!pin) return;

		pin.source = newSource;
		pin.editedSource = undefined;
		pin.isEdited = false;

		const result = renderMarkdocSafe(newSource);
		if (result.renderable) {
			pin.snapshot = JSON.parse(JSON.stringify(result.renderable));
		}

		persist();
	}

	function insertPinAfter(afterPinId: string, newSource: string, label: string, type: BlockType) {
		const afterIndex = page.pins.findIndex((p) => p.id === afterPinId);
		if (afterIndex === -1) return;

		const originalPin = page.pins[afterIndex];
		const result = renderMarkdocSafe(newSource);

		const newPin: PinnedBlock = {
			id: crypto.randomUUID(),
			sourceMessageIndex: originalPin.sourceMessageIndex,
			sourceBlockId: originalPin.sourceBlockId + ':refined',
			order: 0,
			snapshot: result.renderable
				? JSON.parse(JSON.stringify(result.renderable))
				: originalPin.snapshot,
			label: label + ' (refined)',
			type,
			source: newSource,
			isEdited: false,
		};

		const pins = [...page.pins];
		pins.splice(afterIndex + 1, 0, newPin);
		page.pins = pins.map((p, i) => ({ ...p, order: i }));
		persist();
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
		page = { title: '', description: '', pins: [] };
		persist();
	}

	async function loadForConversation(conversationId: string | null) {
		currentConversationId = conversationId;
		if (!conversationId) {
			page = { title: '', description: '', pins: [] };
			return;
		}

		const stored = await loadPage(conversationId);
		if (stored) {
			// Migrate pins that lack source editing fields
			page = {
				...stored,
				pins: stored.pins.map((p: any) => ({
					...p,
					source: p.source ?? '',
					isEdited: p.isEdited ?? false,
				})),
			};
		} else {
			page = { title: '', description: '', pins: [] };
		}
	}

	return {
		get page() {
			return page;
		},
		get isOpen() {
			return isOpen;
		},
		get pinCount() {
			return page.pins.length;
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
		pinBlocks,
		unpin,
		reorder,
		updateMeta,
		updateBlockSource,
		revertBlockSource,
		getBlockSource,
		replaceBlockSource,
		insertPinAfter,
		exportPage,
		clearPage,
		loadForConversation,
	};
}
