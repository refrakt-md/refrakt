import { env } from '$env/dynamic/private';
import { generateSystemPromptParts, getChatModeRunes, CHAT_MODES } from '@refrakt-md/ai';
import { createAnthropicProvider, createGeminiProvider, createOllamaProvider } from '@refrakt-md/ai';
import { runes } from '@refrakt-md/runes';
import type { AIProvider, Message, ChatMode } from '@refrakt-md/ai';
import type { DesignTokens } from '@refrakt-md/types';
import type { RequestHandler } from './$types';

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

const CHAT_PREAMBLE = `You are a content author that creates rich, interactive content using the refrakt.md rune system.

When the user asks you to create structured content — pages, sections, documentation, guides, marketing material, or anything beyond a simple factual answer — use the runes from the Available Runes section below. Runes are your primary building blocks; prefer them over plain Markdown for any content that has semantic structure (heroes, features, pricing, testimonials, CTAs, timelines, code comparisons, etc.).

Use plain Markdown only for simple factual answers, short explanations, or conversational replies where runes would add no value. A question like "What's 2+2?" gets plain text. A request like "Create a landing page" should use multiple runes.

Important: Write valid Markdoc. Rune tags use {% tagname %} ... {% /tagname %} syntax.
Do NOT use rune names that are not listed in the Available Runes section below.

CRITICAL OUTPUT FORMAT RULES:
- Write runes DIRECTLY in your response — they render as live interactive components.
- NEVER wrap your output in code fences (\`\`\`). Your response is NOT a code example.
- NEVER include YAML frontmatter (---).
- Start your response with the first rune tag or plain text — not with \`\`\`.`;

const VALID_MODES = new Set(Object.keys(CHAT_MODES));
const promptPartsCache = new Map<string, [string, string]>();

/**
 * Returns the system prompt as two parts for cache-aware delivery:
 * [0] Base layer: preamble + writing rules (stable across all modes)
 * [1] Mode layer: rune vocabulary (varies by mode)
 */
function getSystemPromptParts(mode?: string): [string, string] {
	const key = mode && VALID_MODES.has(mode) ? mode : 'full';
	let cached = promptPartsCache.get(key);
	if (!cached) {
		const includeRunes = key !== 'full'
			? getChatModeRunes(key as ChatMode)
			: undefined;
		const [base, runeVocab] = generateSystemPromptParts(runes, includeRunes, key !== 'full' ? key : undefined);
		cached = [CHAT_PREAMBLE + '\n\n' + base, runeVocab];
		promptPartsCache.set(key, cached);
	}
	return cached;
}

function buildTokenSummary(tokens: DesignTokens): string {
	const lines: string[] = ['Active Design Tokens:'];
	if (tokens.fonts?.length) {
		lines.push('Fonts: ' + tokens.fonts.map(f => `${f.role}=${f.family}`).join(', '));
	}
	if (tokens.colors?.length) {
		lines.push('Colors: ' + tokens.colors.map(c => `${c.name.toLowerCase().replace(/\s+/g, '-')}=${c.value}`).join(', '));
	}
	if (tokens.spacing) {
		const parts: string[] = [];
		if (tokens.spacing.unit) parts.push(`unit=${tokens.spacing.unit}`);
		if (tokens.spacing.scale?.length) parts.push(`scale=${tokens.spacing.scale.join(',')}`);
		if (parts.length) lines.push('Spacing: ' + parts.join(', '));
	}
	if (tokens.radii?.length) {
		lines.push('Radii: ' + tokens.radii.map(r => `${r.name}=${r.value}`).join(', '));
	}
	if (tokens.shadows?.length) {
		lines.push('Shadows: ' + tokens.shadows.map(s => `${s.name}=${s.value}`).join(', '));
	}
	lines.push('');
	lines.push('These tokens are auto-injected into {% sandbox %} iframes. Use them:');
	lines.push('- CSS: var(--font-heading), var(--color-primary), var(--spacing-unit), var(--radius-md)');
	lines.push('- Tailwind (framework="tailwind"): font-heading, text-primary, rounded-md — token names map to theme extensions');
	lines.push('IMPORTANT: Use {% preview source=true %}{% sandbox framework="tailwind" %}...{% /sandbox %}{% /preview %} to render custom UI with these tokens. Do NOT write raw HTML outside sandbox.');
	return lines.join('\n');
}

export const POST: RequestHandler = async ({ request }) => {
	const { messages, mode, tokens } = (await request.json()) as {
		messages: Array<{ role: string; content: string }>;
		mode?: string;
		tokens?: DesignTokens;
	};
	const { provider } = detectProvider();
	const [baseLayer, modeLayer] = getSystemPromptParts(mode);

	const allMessages: Message[] = [
		{ role: 'system', content: baseLayer },
		{ role: 'system', content: modeLayer },
		...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
	];

	// Inject design token summary so the AI uses token names in sandboxes
	if (tokens && mode === 'design') {
		allMessages.push({ role: 'system', content: buildTokenSummary(tokens) });
	}

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const chunk of provider.complete({ messages: allMessages, maxTokens: 16384 })) {
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
