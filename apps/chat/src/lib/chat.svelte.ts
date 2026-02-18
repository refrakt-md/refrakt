import { renderMarkdoc, initHighlight, getHighlightCss } from './pipeline.js';
import { streamChat } from './stream.js';
import type { RendererNode } from '@refrakt-md/types';

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	renderable?: RendererNode;
	error?: string;
}

export function createChat() {
	let messages = $state<ChatMessage[]>([]);
	let isStreaming = $state(false);
	let isThinking = $state(false);
	let highlightReady = $state(false);
	let scrollTick = $state(0);
	let abortController: AbortController | null = null;

	async function init() {
		await initHighlight();
		highlightReady = true;
	}

	async function send(userMessage: string) {
		// Add user message
		messages.push({ role: 'user', content: userMessage });
		isStreaming = true;
		isThinking = true;
		scrollTick = 0;
		abortController = new AbortController();

		// Build history for the AI (exclude the message we just added from being sent twice)
		const history = messages
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.map((m) => ({ role: m.role, content: m.content }));

		// Add placeholder for assistant response — access through the array
		// so mutations go through the $state proxy and trigger UI updates
		messages.push({ role: 'assistant', content: '' });
		const assistantMsg = messages[messages.length - 1];

		let accumulated = '';

		try {
			for await (const chunk of streamChat(history, abortController.signal)) {
				if (isThinking) isThinking = false;
				accumulated += chunk;
				assistantMsg.content = accumulated;
				scrollTick++;

				// Try to render on each chunk — if Markdoc can't parse incomplete
				// content, we silently catch and the UI shows raw text fallback
				try {
					assistantMsg.renderable = renderMarkdoc(accumulated);
				} catch {
					// Parse incomplete — will retry on next chunk
				}
			}

			// Final render with complete content
			try {
				assistantMsg.renderable = renderMarkdoc(accumulated);
			} catch {
				// If even the final content can't parse, leave renderable undefined
				// The UI will show raw text
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// User cancelled — keep partial content, no error
				try {
					if (accumulated) assistantMsg.renderable = renderMarkdoc(accumulated);
				} catch {
					// Partial content can't parse — raw text fallback is fine
				}
			} else {
				assistantMsg.error =
					err instanceof Error ? err.message : 'An error occurred';
			}
		} finally {
			isStreaming = false;
			isThinking = false;
			abortController = null;
		}
	}

	function cancel() {
		abortController?.abort();
	}

	return {
		get messages() {
			return messages;
		},
		get isStreaming() {
			return isStreaming;
		},
		get isThinking() {
			return isThinking;
		},
		get highlightReady() {
			return highlightReady;
		},
		get highlightCss() {
			return getHighlightCss();
		},
		get scrollTick() {
			return scrollTick;
		},
		init,
		send,
		cancel,
	};
}
