import type { AIProvider, CompletionOptions, Message } from '../provider.js';

export interface AnthropicOptions {
	apiKey: string;
	baseUrl?: string;
	defaultModel?: string;
	/** Wrap system prompt blocks with cache_control for Anthropic prompt caching */
	promptCaching?: boolean;
	/** Override fetch for testing */
	fetch?: typeof globalThis.fetch;
}

interface AnthropicMessage {
	role: 'user' | 'assistant';
	content: string;
}

export function formatAnthropicRequest(
	options: CompletionOptions,
	defaults: { model: string },
): { system: string[]; messages: AnthropicMessage[]; model: string; max_tokens: number; stream: boolean } {
	const system: string[] = [];
	const messages: AnthropicMessage[] = [];

	for (const msg of options.messages) {
		if (msg.role === 'system') {
			system.push(msg.content);
		} else {
			messages.push({ role: msg.role, content: msg.content });
		}
	}

	return {
		system,
		messages,
		model: options.model ?? defaults.model,
		max_tokens: options.maxTokens ?? 4096,
		stream: true,
	};
}

export async function* parseAnthropicSSE(response: Response): AsyncIterable<string> {
	const body = response.body;
	if (!body) return;

	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop()!;

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const data = line.slice(6);
				if (data === '[DONE]') return;

				try {
					const parsed = JSON.parse(data);
					if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
						yield parsed.delta.text;
					}
				} catch {
					// skip non-JSON lines
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

export function createAnthropicProvider(options: AnthropicOptions): AIProvider {
	const baseUrl = options.baseUrl ?? 'https://api.anthropic.com';
	const defaultModel = options.defaultModel ?? 'claude-sonnet-4-5-20250929';
	const fetchFn = options.fetch ?? globalThis.fetch;

	return {
		name: 'anthropic',

		async *complete(completionOptions: CompletionOptions): AsyncIterable<string> {
			const formatted = formatAnthropicRequest(completionOptions, { model: defaultModel });

			// Build system field: cached content blocks or plain string
			let system: unknown;
			if (formatted.system.length > 0) {
				system = options.promptCaching
					? formatted.system.map(text => ({ type: 'text', text, cache_control: { type: 'ephemeral' } }))
					: formatted.system.join('\n\n');
			}

			const body = {
				system,
				messages: formatted.messages,
				model: formatted.model,
				max_tokens: formatted.max_tokens,
				stream: formatted.stream,
			};

			const response = await fetchFn(`${baseUrl}/v1/messages`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-api-key': options.apiKey,
					'anthropic-version': '2023-06-01',
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`Anthropic API error (${response.status}): ${text}`);
			}

			yield* parseAnthropicSSE(response);
		},
	};
}
