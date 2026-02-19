import type { RendererNode } from '@refrakt-md/types';
import type { BlockType, ContentBlock } from './blocks.js';
import { savePage, loadPage } from './db.js';

export interface PinnedBlock {
	id: string;
	sourceMessageIndex: number;
	sourceBlockId: string;
	order: number;
	snapshot: RendererNode;
	label: string;
	type: BlockType;
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
	pinBlocks(messageIndex: number, blockIds: string[], blocks: ContentBlock[]): void;
	unpin(pinId: string): void;
	reorder(pinId: string, newIndex: number): void;
	clearPage(): void;
	loadForConversation(conversationId: string | null): Promise<void>;
}

export function createPageStore(): PageStore {
	let page = $state<PageState>({ title: '', description: '', pins: [] });
	let isOpen = $state(false);
	let currentConversationId: string | null = null;

	async function persist() {
		if (currentConversationId) {
			await savePage(currentConversationId, {
				title: page.title,
				description: page.description,
				pins: page.pins,
			});
		}
	}

	function pinBlocks(messageIndex: number, blockIds: string[], blocks: ContentBlock[]) {
		const existing = new Set(page.pins.map((p) => p.sourceBlockId));
		const newPins: PinnedBlock[] = [];

		for (const block of blocks) {
			if (!blockIds.includes(block.id)) continue;
			if (existing.has(block.id)) continue; // already pinned

			newPins.push({
				id: crypto.randomUUID(),
				sourceMessageIndex: messageIndex,
				sourceBlockId: block.id,
				order: page.pins.length + newPins.length,
				snapshot: JSON.parse(JSON.stringify(block.node)),
				label: block.label,
				type: block.type,
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
			page = stored;
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
		clearPage,
		loadForConversation,
	};
}
