import { env } from '$env/dynamic/private';
import { createAnthropicProvider, createGeminiProvider, createOllamaProvider } from '@refrakt-md/ai';
import type { AIProvider, Message } from '@refrakt-md/ai';
import type { RequestHandler } from './$types';
import { buildThemePromptParts } from '$lib/ai/prompt.js';

interface GenerateRequest {
	prompt: string;
	current?: {
		light: Record<string, string>;
		dark: Record<string, string>;
	};
	overrides?: {
		light: string[];
		dark: string[];
	};
	model?: string;
}

interface ResolvedProvider {
	provider: AIProvider;
	name: string;
	defaultModel: string;
}

function detectProvider(): ResolvedProvider {
	const anthropicKey = env.ANTHROPIC_API_KEY;
	if (anthropicKey) {
		return {
			name: 'anthropic',
			defaultModel: 'claude-sonnet-4-5-20250929',
			provider: createAnthropicProvider({ apiKey: anthropicKey, promptCaching: true }),
		};
	}

	const googleKey = env.GOOGLE_API_KEY;
	if (googleKey) {
		return {
			name: 'gemini',
			defaultModel: 'gemini-2.0-flash',
			provider: createGeminiProvider({ apiKey: googleKey }),
		};
	}

	const ollamaHost = env.OLLAMA_HOST;
	return {
		name: 'ollama',
		defaultModel: 'llama3.2',
		provider: createOllamaProvider(ollamaHost ? { host: ollamaHost } : undefined),
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json() as GenerateRequest;

	const { provider } = detectProvider();

	const [basePrompt, contextPrompt] = buildThemePromptParts(
		body.current ? {
			current: body.current,
			overrides: body.overrides ? {
				light: new Set(body.overrides.light),
				dark: new Set(body.overrides.dark),
			} : undefined,
		} : undefined,
	);

	const messages: Message[] = [
		{ role: 'system', content: basePrompt },
		{ role: 'system', content: contextPrompt },
		{ role: 'user', content: body.prompt },
	];

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const chunk of provider.complete({
					messages,
					maxTokens: 8192,
					model: body.model,
					temperature: 0.7,
				})) {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
					);
				}
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
				);
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
};
