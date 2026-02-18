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
	let highlightReady = $state(false);

	async function init() {
		await initHighlight();
		highlightReady = true;
	}

	async function send(userMessage: string) {
		// Add user message
		messages.push({ role: 'user', content: userMessage });
		isStreaming = true;

		// Build history for the AI (exclude the message we just added from being sent twice)
		const history = messages
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.map((m) => ({ role: m.role, content: m.content }));

		// Add placeholder for assistant response
		const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
		messages.push(assistantMsg);

		let accumulated = '';

		try {
			for await (const chunk of streamChat(history)) {
				accumulated += chunk;
				assistantMsg.content = accumulated;

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
			assistantMsg.error =
				err instanceof Error ? err.message : 'An error occurred';
		} finally {
			isStreaming = false;
		}
	}

	return {
		get messages() {
			return messages;
		},
		get isStreaming() {
			return isStreaming;
		},
		get highlightReady() {
			return highlightReady;
		},
		get highlightCss() {
			return getHighlightCss();
		},
		init,
		send,
	};
}
