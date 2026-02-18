import { generateSystemPrompt } from '@refrakt-md/ai';
import { createAnthropicProvider, createGeminiProvider, createOllamaProvider } from '@refrakt-md/ai';
import { runes } from '@refrakt-md/runes';
import type { AIProvider, Message } from '@refrakt-md/ai';
import type { RequestHandler } from './$types';

interface ResolvedProvider {
	provider: AIProvider;
	name: string;
	defaultModel: string;
}

function detectProvider(): ResolvedProvider {
	const anthropicKey = process.env.ANTHROPIC_API_KEY;
	if (anthropicKey) {
		return {
			name: 'anthropic',
			defaultModel: 'claude-sonnet-4-5-20250929',
			provider: createAnthropicProvider({ apiKey: anthropicKey }),
		};
	}

	const googleKey = process.env.GOOGLE_API_KEY;
	if (googleKey) {
		return {
			name: 'gemini',
			defaultModel: 'gemini-2.0-flash',
			provider: createGeminiProvider({ apiKey: googleKey }),
		};
	}

	const ollamaHost = process.env.OLLAMA_HOST;
	return {
		name: 'ollama',
		defaultModel: 'llama3.2',
		provider: createOllamaProvider(ollamaHost ? { host: ollamaHost } : undefined),
	};
}

const CHAT_PREAMBLE = `You are a helpful assistant. Your responses will be rendered as rich, interactive content using the refrakt.md rune system.

Use runes when they genuinely improve the response:
- Recipes → {% recipe %}
- Comparisons → {% comparison %}
- Step-by-step instructions → {% steps %} or {% howto %}
- Code examples → fenced code blocks (they get syntax highlighted automatically)
- FAQs → {% accordion %}
- Tabbed content → {% tabs %}
- Callouts/warnings → {% hint type="warning" %}
- Timelines → {% timeline %}

Use plain Markdown when the answer is simple. Never force a rune where plain text works better.
A question like "What's 2+2?" should get a plain text answer, not a rune.

Important: Write valid Markdoc. Rune tags use {% tagname %} ... {% /tagname %} syntax.`;

const systemPrompt = CHAT_PREAMBLE + '\n\n' + generateSystemPrompt(runes);

export const POST: RequestHandler = async ({ request }) => {
	const { messages } = (await request.json()) as { messages: Array<{ role: string; content: string }> };
	const { provider } = detectProvider();

	const allMessages: Message[] = [
		{ role: 'system', content: systemPrompt },
		...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
	];

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const chunk of provider.complete({ messages: allMessages })) {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
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
