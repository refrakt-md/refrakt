import type { AIProvider } from '@refrakt-md/ai';
import { createAnthropicProvider, createGeminiProvider, createOllamaProvider } from '@refrakt-md/ai';

export type ProviderName = 'anthropic' | 'gemini' | 'ollama';

export interface ResolvedProvider {
	provider: AIProvider;
	name: ProviderName;
	defaultModel: string;
}

const DEFAULT_MODELS: Record<ProviderName, string> = {
	anthropic: 'claude-sonnet-4-5-20250929',
	gemini: 'gemini-2.0-flash',
	ollama: 'llama3.2',
};

export function detectProvider(explicit?: string): ResolvedProvider {
	if (explicit) {
		return createProviderByName(explicit as ProviderName);
	}

	const anthropicKey = process.env.ANTHROPIC_API_KEY;
	if (anthropicKey) {
		return {
			name: 'anthropic',
			defaultModel: DEFAULT_MODELS.anthropic,
			provider: createAnthropicProvider({ apiKey: anthropicKey }),
		};
	}

	const googleKey = process.env.GOOGLE_API_KEY;
	if (googleKey) {
		return {
			name: 'gemini',
			defaultModel: DEFAULT_MODELS.gemini,
			provider: createGeminiProvider({ apiKey: googleKey }),
		};
	}

	const ollamaHost = process.env.OLLAMA_HOST;
	return {
		name: 'ollama',
		defaultModel: DEFAULT_MODELS.ollama,
		provider: createOllamaProvider(ollamaHost ? { host: ollamaHost } : undefined),
	};
}

function createProviderByName(name: ProviderName): ResolvedProvider {
	switch (name) {
		case 'anthropic': {
			const apiKey = process.env.ANTHROPIC_API_KEY;
			if (!apiKey) {
				throw new Error(
					'ANTHROPIC_API_KEY environment variable is required for the Anthropic provider',
				);
			}
			return {
				name: 'anthropic',
				defaultModel: DEFAULT_MODELS.anthropic,
				provider: createAnthropicProvider({ apiKey }),
			};
		}
		case 'gemini': {
			const apiKey = process.env.GOOGLE_API_KEY;
			if (!apiKey) {
				throw new Error(
					'GOOGLE_API_KEY environment variable is required for the Gemini provider',
				);
			}
			return {
				name: 'gemini',
				defaultModel: DEFAULT_MODELS.gemini,
				provider: createGeminiProvider({ apiKey }),
			};
		}
		case 'ollama': {
			const host = process.env.OLLAMA_HOST;
			return {
				name: 'ollama',
				defaultModel: DEFAULT_MODELS.ollama,
				provider: createOllamaProvider(host ? { host } : undefined),
			};
		}
		default:
			throw new Error(
				`Unknown provider "${name}". Available: anthropic, gemini, ollama`,
			);
	}
}
