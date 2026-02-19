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
	clearPage(): void;
	loadForConversation(conversationId: string | null): Promise<void>;
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
		clearPage,
		loadForConversation,
	};
}
