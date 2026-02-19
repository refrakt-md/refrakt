import { describe, it, expect } from 'vitest';
import { createAnthropicProvider, formatAnthropicRequest, parseAnthropicSSE } from '../../src/providers/anthropic.js';
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

describe('formatAnthropicRequest', () => {
	it('extracts system messages into separate array', () => {
		const messages: Message[] = [
			{ role: 'system', content: 'You are helpful.' },
			{ role: 'user', content: 'Hello' },
		];

		const result = formatAnthropicRequest(
			{ messages },
			{ model: 'claude-sonnet-4-5-20250929' },
		);

		expect(result.system).toEqual(['You are helpful.']);
		expect(result.messages).toEqual([
			{ role: 'user', content: 'Hello' },
		]);
	});

	it('collects multiple system messages', () => {
		const messages: Message[] = [
			{ role: 'system', content: 'Base layer.' },
			{ role: 'system', content: 'Mode layer.' },
			{ role: 'user', content: 'Hello' },
		];

		const result = formatAnthropicRequest(
			{ messages },
			{ model: 'claude-sonnet-4-5-20250929' },
		);

		expect(result.system).toEqual(['Base layer.', 'Mode layer.']);
		expect(result.messages).toEqual([
			{ role: 'user', content: 'Hello' },
		]);
	});

	it('uses provided model over default', () => {
		const result = formatAnthropicRequest(
			{ messages: [{ role: 'user', content: 'Hi' }], model: 'claude-opus-4-6' },
			{ model: 'claude-sonnet-4-5-20250929' },
		);

		expect(result.model).toBe('claude-opus-4-6');
	});

	it('falls back to default model', () => {
		const result = formatAnthropicRequest(
			{ messages: [{ role: 'user', content: 'Hi' }] },
			{ model: 'claude-sonnet-4-5-20250929' },
		);

		expect(result.model).toBe('claude-sonnet-4-5-20250929');
	});

	it('sets max_tokens from options', () => {
		const result = formatAnthropicRequest(
			{ messages: [{ role: 'user', content: 'Hi' }], maxTokens: 1024 },
			{ model: 'test' },
		);

		expect(result.max_tokens).toBe(1024);
	});

	it('defaults max_tokens to 4096', () => {
		const result = formatAnthropicRequest(
			{ messages: [{ role: 'user', content: 'Hi' }] },
			{ model: 'test' },
		);

		expect(result.max_tokens).toBe(4096);
	});

	it('always enables streaming', () => {
		const result = formatAnthropicRequest(
			{ messages: [{ role: 'user', content: 'Hi' }] },
			{ model: 'test' },
		);

		expect(result.stream).toBe(true);
	});
});

describe('parseAnthropicSSE', () => {
	it('yields text from content_block_delta events', async () => {
		const response = mockSSEResponse([
			'event: message_start',
			'data: {"type":"message_start"}',
			'',
			'event: content_block_delta',
			'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
			'',
			'event: content_block_delta',
			'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}',
			'',
			'event: message_stop',
			'data: {"type":"message_stop"}',
		]);

		const chunks: string[] = [];
		for await (const chunk of parseAnthropicSSE(response)) {
			chunks.push(chunk);
		}

		expect(chunks).toEqual(['Hello', ' world']);
	});

	it('handles empty response body', async () => {
		const response = new Response(null);
		const chunks: string[] = [];
		for await (const chunk of parseAnthropicSSE(response)) {
			chunks.push(chunk);
		}
		expect(chunks).toEqual([]);
	});

	it('skips non-delta events', async () => {
		const response = mockSSEResponse([
			'data: {"type":"message_start","id":"msg_01"}',
			'',
			'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
			'',
			'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Only this"}}',
			'',
			'data: {"type":"content_block_stop","index":0}',
			'',
		]);

		const chunks: string[] = [];
		for await (const chunk of parseAnthropicSSE(response)) {
			chunks.push(chunk);
		}

		expect(chunks).toEqual(['Only this']);
	});
});

describe('createAnthropicProvider', () => {
	it('has name "anthropic"', () => {
		const provider = createAnthropicProvider({ apiKey: 'test-key' });
		expect(provider.name).toBe('anthropic');
	});

	it('sends correct headers and body', async () => {
		let capturedRequest: { url: string; init: RequestInit } | undefined;

		const mockFetch: typeof fetch = async (input, init) => {
			capturedRequest = { url: input as string, init: init! };
			return mockSSEResponse([
				'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}',
				'',
				'data: {"type":"message_stop"}',
			]);
		};

		const provider = createAnthropicProvider({
			apiKey: 'sk-test-123',
			baseUrl: 'https://test.api.com',
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
		expect(capturedRequest!.url).toBe('https://test.api.com/v1/messages');
		expect((capturedRequest!.init.headers as Record<string, string>)['x-api-key']).toBe('sk-test-123');
		expect((capturedRequest!.init.headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01');

		const body = JSON.parse(capturedRequest!.init.body as string);
		expect(body.system).toBe('Be helpful');
		expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
		expect(body.stream).toBe(true);
		expect(chunks).toEqual(['Hi']);
	});

	it('sends cached content blocks when promptCaching is enabled', async () => {
		let capturedRequest: { url: string; init: RequestInit } | undefined;

		const mockFetch: typeof fetch = async (input, init) => {
			capturedRequest = { url: input as string, init: init! };
			return mockSSEResponse([
				'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}',
				'',
				'data: {"type":"message_stop"}',
			]);
		};

		const provider = createAnthropicProvider({
			apiKey: 'sk-test-123',
			promptCaching: true,
			fetch: mockFetch,
		});

		for await (const _ of provider.complete({
			messages: [
				{ role: 'system', content: 'Base layer' },
				{ role: 'system', content: 'Mode layer' },
				{ role: 'user', content: 'Hello' },
			],
		})) { /* drain */ }

		const body = JSON.parse(capturedRequest!.init.body as string);
		expect(body.system).toEqual([
			{ type: 'text', text: 'Base layer', cache_control: { type: 'ephemeral' } },
			{ type: 'text', text: 'Mode layer', cache_control: { type: 'ephemeral' } },
		]);
	});

	it('joins system parts as string when promptCaching is disabled', async () => {
		let capturedRequest: { url: string; init: RequestInit } | undefined;

		const mockFetch: typeof fetch = async (input, init) => {
			capturedRequest = { url: input as string, init: init! };
			return mockSSEResponse([
				'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}',
				'',
				'data: {"type":"message_stop"}',
			]);
		};

		const provider = createAnthropicProvider({
			apiKey: 'sk-test-123',
			fetch: mockFetch,
		});

		for await (const _ of provider.complete({
			messages: [
				{ role: 'system', content: 'Base layer' },
				{ role: 'system', content: 'Mode layer' },
				{ role: 'user', content: 'Hello' },
			],
		})) { /* drain */ }

		const body = JSON.parse(capturedRequest!.init.body as string);
		expect(body.system).toBe('Base layer\n\nMode layer');
	});

	it('throws on non-ok response', async () => {
		const mockFetch: typeof fetch = async () => {
			return new Response('{"error":"invalid_api_key"}', { status: 401 });
		};

		const provider = createAnthropicProvider({
			apiKey: 'bad-key',
			fetch: mockFetch,
		});

		const iter = provider.complete({
			messages: [{ role: 'user', content: 'Hello' }],
		});

		await expect(async () => {
			for await (const _ of iter) { /* drain */ }
		}).rejects.toThrow('Anthropic API error (401)');
	});
});
