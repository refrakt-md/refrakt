import type { AIProvider, CompletionOptions, Message } from '../provider.js';

export interface GeminiOptions {
	apiKey: string;
	baseUrl?: string;
	defaultModel?: string;
	/** Override fetch for testing */
	fetch?: typeof globalThis.fetch;
}

interface GeminiContent {
	role: 'user' | 'model';
	parts: { text: string }[];
}

export function formatGeminiRequest(
	options: CompletionOptions,
	defaults: { model: string },
): {
	contents: GeminiContent[];
	systemInstruction?: { parts: { text: string }[] };
	generationConfig: { maxOutputTokens: number; temperature?: number };
} {
	let systemInstruction: { parts: { text: string }[] } | undefined;
	const contents: GeminiContent[] = [];

	for (const msg of options.messages) {
		if (msg.role === 'system') {
			systemInstruction = { parts: [{ text: msg.content }] };
		} else {
			contents.push({
				role: msg.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: msg.content }],
			});
		}
	}

	const generationConfig: { maxOutputTokens: number; temperature?: number } = {
		maxOutputTokens: options.maxTokens ?? 4096,
	};

	if (options.temperature !== undefined) {
		generationConfig.temperature = options.temperature;
	}

	return {
		contents,
		...(systemInstruction ? { systemInstruction } : {}),
		generationConfig,
	};
}

export async function* parseGeminiSSE(response: Response): AsyncIterable<string> {
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

				try {
					const parsed = JSON.parse(data);
					const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
					if (text) {
						yield text;
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

export function createGeminiProvider(options: GeminiOptions): AIProvider {
	const baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
	const defaultModel = options.defaultModel ?? 'gemini-2.0-flash';
	const fetchFn = options.fetch ?? globalThis.fetch;

	return {
		name: 'gemini',

		async *complete(completionOptions: CompletionOptions): AsyncIterable<string> {
			const model = completionOptions.model ?? defaultModel;
			const body = formatGeminiRequest(completionOptions, { model });
			const url = `${baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${options.apiKey}`;

			const response = await fetchFn(url, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`Gemini API error (${response.status}): ${text}`);
			}

			yield* parseGeminiSSE(response);
		},
	};
}
