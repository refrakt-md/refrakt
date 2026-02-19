import { describe, it, expect } from 'vitest';
import { createGeminiProvider, formatGeminiRequest, parseGeminiSSE } from '../../src/providers/gemini.js';
import type { Message } from '../../src/provider.js';

function mockSSEResponse(events: string[]): Response {
	const text = events.join('\n') + '\n';
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(text));
			controller.close();
		},
	});
	return new Response(stream);
}

describe('formatGeminiRequest', () => {
	it('extracts system message into systemInstruction', () => {
		const messages: Message[] = [
			{ role: 'system', content: 'You are helpful.' },
			{ role: 'user', content: 'Hello' },
		];

		const result = formatGeminiRequest(
			{ messages },
			{ model: 'gemini-2.0-flash' },
		);

		expect(result.systemInstruction).toEqual({
			parts: [{ text: 'You are helpful.' }],
		});
		expect(result.contents).toEqual([
			{ role: 'user', parts: [{ text: 'Hello' }] },
		]);
	});

	it('joins multiple system messages into one systemInstruction', () => {
		const messages: Message[] = [
			{ role: 'system', content: 'Base layer.' },
			{ role: 'system', content: 'Mode layer.' },
			{ role: 'user', content: 'Hello' },
		];

		const result = formatGeminiRequest(
			{ messages },
			{ model: 'gemini-2.0-flash' },
		);

		expect(result.systemInstruction).toEqual({
			parts: [{ text: 'Base layer.\n\nMode layer.' }],
		});
	});

	it('omits systemInstruction when no system message', () => {
		const result = formatGeminiRequest(
			{ messages: [{ role: 'user', content: 'Hello' }] },
			{ model: 'gemini-2.0-flash' },
		);

		expect(result.systemInstruction).toBeUndefined();
	});

	it('maps assistant role to model', () => {
		const messages: Message[] = [
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there' },
			{ role: 'user', content: 'How are you?' },
		];

		const result = formatGeminiRequest(
			{ messages },
			{ model: 'gemini-2.0-flash' },
		);

		expect(result.contents).toEqual([
			{ role: 'user', parts: [{ text: 'Hello' }] },
			{ role: 'model', parts: [{ text: 'Hi there' }] },
			{ role: 'user', parts: [{ text: 'How are you?' }] },
		]);
	});

	it('sets maxOutputTokens from options', () => {
		const result = formatGeminiRequest(
			{ messages: [{ role: 'user', content: 'Hi' }], maxTokens: 1024 },
			{ model: 'test' },
		);

		expect(result.generationConfig.maxOutputTokens).toBe(1024);
	});

	it('defaults maxOutputTokens to 4096', () => {
		const result = formatGeminiRequest(
			{ messages: [{ role: 'user', content: 'Hi' }] },
			{ model: 'test' },
		);

		expect(result.generationConfig.maxOutputTokens).toBe(4096);
	});

	it('includes temperature when provided', () => {
		const result = formatGeminiRequest(
			{ messages: [{ role: 'user', content: 'Hi' }], temperature: 0.7 },
			{ model: 'test' },
		);

		expect(result.generationConfig.temperature).toBe(0.7);
	});

	it('omits temperature when not provided', () => {
		const result = formatGeminiRequest(
			{ messages: [{ role: 'user', content: 'Hi' }] },
			{ model: 'test' },
		);

		expect(result.generationConfig.temperature).toBeUndefined();
	});
});

describe('parseGeminiSSE', () => {
	it('yields text from candidate content parts', async () => {
		const response = mockSSEResponse([
			'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}],"role":"model"}}]}',
			'',
			'data: {"candidates":[{"content":{"parts":[{"text":" world"}],"role":"model"}}]}',
			'',
		]);

		const chunks: string[] = [];
		for await (const chunk of parseGeminiSSE(response)) {
			chunks.push(chunk);
		}

		expect(chunks).toEqual(['Hello', ' world']);
	});

	it('handles empty response body', async () => {
		const response = new Response(null);
		const chunks: string[] = [];
		for await (const chunk of parseGeminiSSE(response)) {
			chunks.push(chunk);
		}
		expect(chunks).toEqual([]);
	});

	it('skips events without candidate text', async () => {
		const response = mockSSEResponse([
			'data: {"candidates":[{"content":{"parts":[{"text":"Keep this"}],"role":"model"}}]}',
			'',
			'data: {"candidates":[{"finishReason":"STOP"}]}',
			'',
		]);

		const chunks: string[] = [];
		for await (const chunk of parseGeminiSSE(response)) {
			chunks.push(chunk);
		}

		expect(chunks).toEqual(['Keep this']);
	});
});

describe('createGeminiProvider', () => {
	it('has name "gemini"', () => {
		const provider = createGeminiProvider({ apiKey: 'test-key' });
		expect(provider.name).toBe('gemini');
	});

	it('sends correct URL and body', async () => {
		let capturedRequest: { url: string; init: RequestInit } | undefined;

		const mockFetch: typeof fetch = async (input, init) => {
			capturedRequest = { url: input as string, init: init! };
			return mockSSEResponse([
				'data: {"candidates":[{"content":{"parts":[{"text":"Hi"}],"role":"model"}}]}',
				'',
			]);
		};

		const provider = createGeminiProvider({
			apiKey: 'test-api-key',
			baseUrl: 'https://test.googleapis.com/v1beta',
			fetch: mockFetch,
		});

		const chunks: string[] = [];
		for await (const chunk of provider.complete({
			messages: [
				{ role: 'system', content: 'Be helpful' },
				{ role: 'user', content: 'Hello' },
			],
		})) {
			chunks.push(chunk);
		}

		expect(capturedRequest).toBeDefined();
		expect(capturedRequest!.url).toBe(
			'https://test.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=test-api-key',
		);

		const body = JSON.parse(capturedRequest!.init.body as string);
		expect(body.systemInstruction).toEqual({ parts: [{ text: 'Be helpful' }] });
		expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Hello' }] }]);
		expect(chunks).toEqual(['Hi']);
	});

	it('uses custom model in URL', async () => {
		let capturedUrl = '';

		const mockFetch: typeof fetch = async (input) => {
			capturedUrl = input as string;
			return mockSSEResponse([
				'data: {"candidates":[{"content":{"parts":[{"text":"Ok"}],"role":"model"}}]}',
				'',
			]);
		};

		const provider = createGeminiProvider({
			apiKey: 'key',
			fetch: mockFetch,
		});

		for await (const _ of provider.complete({
			messages: [{ role: 'user', content: 'Hi' }],
			model: 'gemini-2.0-flash-lite',
		})) { /* drain */ }

		expect(capturedUrl).toContain('/models/gemini-2.0-flash-lite:streamGenerateContent');
	});

	it('throws on non-ok response', async () => {
		const mockFetch: typeof fetch = async () => {
			return new Response('{"error":{"message":"API key not valid"}}', { status: 400 });
		};

		const provider = createGeminiProvider({
			apiKey: 'bad-key',
			fetch: mockFetch,
		});

		const iter = provider.complete({
			messages: [{ role: 'user', content: 'Hello' }],
		});

		await expect(async () => {
			for await (const _ of iter) { /* drain */ }
		}).rejects.toThrow('Gemini API error (400)');
	});
});
