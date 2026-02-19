import { describe, it, expect } from 'vitest';
import { createOllamaProvider, formatOllamaRequest, parseOllamaNDJSON } from '../../src/providers/ollama.js';

function mockNDJSONResponse(lines: object[]): Response {
	const text = lines.map(l => JSON.stringify(l)).join('\n') + '\n';
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(text));
			controller.close();
		},
	});
	return new Response(stream);
}

describe('formatOllamaRequest', () => {
	it('passes system and user messages', () => {
		const messages = [
			{ role: 'system' as const, content: 'You are helpful.' },
			{ role: 'user' as const, content: 'Hello' },
		];

		const result = formatOllamaRequest(
			{ messages },
			{ model: 'llama3.2' },
		);

		expect(result.messages).toEqual(messages);
	});

	it('merges multiple system messages into one', () => {
		const messages = [
			{ role: 'system' as const, content: 'Base layer.' },
			{ role: 'system' as const, content: 'Mode layer.' },
			{ role: 'user' as const, content: 'Hello' },
		];

		const result = formatOllamaRequest(
			{ messages },
			{ model: 'llama3.2' },
		);

		expect(result.messages).toEqual([
			{ role: 'system', content: 'Base layer.\n\nMode layer.' },
			{ role: 'user', content: 'Hello' },
		]);
	});

	it('uses provided model over default', () => {
		const result = formatOllamaRequest(
			{ messages: [{ role: 'user' as const, content: 'Hi' }], model: 'mistral' },
			{ model: 'llama3.2' },
		);

		expect(result.model).toBe('mistral');
	});

	it('falls back to default model', () => {
		const result = formatOllamaRequest(
			{ messages: [{ role: 'user' as const, content: 'Hi' }] },
			{ model: 'llama3.2' },
		);

		expect(result.model).toBe('llama3.2');
	});

	it('passes temperature and maxTokens as options', () => {
		const result = formatOllamaRequest(
			{ messages: [{ role: 'user' as const, content: 'Hi' }], temperature: 0.5, maxTokens: 2048 },
			{ model: 'test' },
		);

		expect(result.options).toEqual({ temperature: 0.5, num_predict: 2048 });
	});

	it('omits options when none specified', () => {
		const result = formatOllamaRequest(
			{ messages: [{ role: 'user' as const, content: 'Hi' }] },
			{ model: 'test' },
		);

		expect(result.options).toBeUndefined();
	});

	it('always enables streaming', () => {
		const result = formatOllamaRequest(
			{ messages: [{ role: 'user' as const, content: 'Hi' }] },
			{ model: 'test' },
		);

		expect(result.stream).toBe(true);
	});
});

describe('parseOllamaNDJSON', () => {
	it('yields text from message content', async () => {
		const response = mockNDJSONResponse([
			{ model: 'llama3.2', message: { role: 'assistant', content: 'Hello' }, done: false },
			{ model: 'llama3.2', message: { role: 'assistant', content: ' world' }, done: false },
			{ model: 'llama3.2', message: { role: 'assistant', content: '' }, done: true },
		]);

		const chunks: string[] = [];
		for await (const chunk of parseOllamaNDJSON(response)) {
			chunks.push(chunk);
		}

		expect(chunks).toEqual(['Hello', ' world']);
	});

	it('handles empty response body', async () => {
		const response = new Response(null);
		const chunks: string[] = [];
		for await (const chunk of parseOllamaNDJSON(response)) {
			chunks.push(chunk);
		}
		expect(chunks).toEqual([]);
	});

	it('stops on done: true', async () => {
		const response = mockNDJSONResponse([
			{ model: 'llama3.2', message: { role: 'assistant', content: 'First' }, done: false },
			{ model: 'llama3.2', message: { role: 'assistant', content: '' }, done: true },
			{ model: 'llama3.2', message: { role: 'assistant', content: 'Should not appear' }, done: false },
		]);

		const chunks: string[] = [];
		for await (const chunk of parseOllamaNDJSON(response)) {
			chunks.push(chunk);
		}

		expect(chunks).toEqual(['First']);
	});
});

describe('createOllamaProvider', () => {
	it('has name "ollama"', () => {
		const provider = createOllamaProvider();
		expect(provider.name).toBe('ollama');
	});

	it('defaults to localhost:11434', async () => {
		let capturedUrl = '';

		const mockFetch: typeof fetch = async (input) => {
			capturedUrl = input as string;
			return mockNDJSONResponse([
				{ model: 'llama3.2', message: { role: 'assistant', content: 'Hi' }, done: false },
				{ model: 'llama3.2', message: { role: 'assistant', content: '' }, done: true },
			]);
		};

		const provider = createOllamaProvider({ fetch: mockFetch });

		for await (const _ of provider.complete({
			messages: [{ role: 'user', content: 'Hello' }],
		})) { /* drain */ }

		expect(capturedUrl).toBe('http://localhost:11434/api/chat');
	});

	it('uses custom host', async () => {
		let capturedUrl = '';

		const mockFetch: typeof fetch = async (input) => {
			capturedUrl = input as string;
			return mockNDJSONResponse([
				{ model: 'llama3.2', message: { role: 'assistant', content: '' }, done: true },
			]);
		};

		const provider = createOllamaProvider({
			host: 'http://192.168.1.100:11434',
			fetch: mockFetch,
		});

		for await (const _ of provider.complete({
			messages: [{ role: 'user', content: 'Hello' }],
		})) { /* drain */ }

		expect(capturedUrl).toBe('http://192.168.1.100:11434/api/chat');
	});

	it('throws on non-ok response', async () => {
		const mockFetch: typeof fetch = async () => {
			return new Response('model not found', { status: 404 });
		};

		const provider = createOllamaProvider({ fetch: mockFetch });

		const iter = provider.complete({
			messages: [{ role: 'user', content: 'Hello' }],
		});

		await expect(async () => {
			for await (const _ of iter) { /* drain */ }
		}).rejects.toThrow('Ollama API error (404)');
	});
});
