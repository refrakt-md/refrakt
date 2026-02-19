import type { AIProvider, CompletionOptions, Message } from '../provider.js';

export interface OllamaOptions {
	host?: string;
	defaultModel?: string;
	/** Override fetch for testing */
	fetch?: typeof globalThis.fetch;
}

export function formatOllamaRequest(
	options: CompletionOptions,
	defaults: { model: string },
): { model: string; messages: Message[]; stream: boolean; options?: { temperature?: number; num_predict?: number } } {
	const reqOptions: { temperature?: number; num_predict?: number } = {};
	if (options.temperature !== undefined) reqOptions.temperature = options.temperature;
	if (options.maxTokens !== undefined) reqOptions.num_predict = options.maxTokens;

	// Merge multiple system messages into one
	const systemParts: string[] = [];
	const nonSystem: Message[] = [];
	for (const msg of options.messages) {
		if (msg.role === 'system') {
			systemParts.push(msg.content);
		} else {
			nonSystem.push(msg);
		}
	}
	const messages: Message[] = systemParts.length > 0
		? [{ role: 'system', content: systemParts.join('\n\n') }, ...nonSystem]
		: nonSystem;

	return {
		model: options.model ?? defaults.model,
		messages,
		stream: true,
		...(Object.keys(reqOptions).length > 0 ? { options: reqOptions } : {}),
	};
}

export async function* parseOllamaNDJSON(response: Response): AsyncIterable<string> {
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
				if (!line.trim()) continue;

				try {
					const parsed = JSON.parse(line);
					if (parsed.message?.content) {
						yield parsed.message.content;
					}
					if (parsed.done) return;
				} catch {
					// skip malformed lines
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

export function createOllamaProvider(options?: OllamaOptions): AIProvider {
	const host = options?.host ?? 'http://localhost:11434';
	const defaultModel = options?.defaultModel ?? 'llama3.2';
	const fetchFn = options?.fetch ?? globalThis.fetch;

	return {
		name: 'ollama',

		async *complete(completionOptions: CompletionOptions): AsyncIterable<string> {
			const body = formatOllamaRequest(completionOptions, { model: defaultModel });

			const response = await fetchFn(`${host}/api/chat`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`Ollama API error (${response.status}): ${text}`);
			}

			yield* parseOllamaNDJSON(response);
		},
	};
}
