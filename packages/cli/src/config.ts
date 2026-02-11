import type { AIProvider } from '@refract-md/ai';
import { createAnthropicProvider, createOllamaProvider } from '@refract-md/ai';

export type ProviderName = 'anthropic' | 'ollama';

export interface ResolvedProvider {
	provider: AIProvider;
	name: ProviderName;
}

export function detectProvider(explicit?: string): ResolvedProvider {
	if (explicit) {
		return createProviderByName(explicit as ProviderName);
	}

	const anthropicKey = process.env.ANTHROPIC_API_KEY;
	if (anthropicKey) {
		return {
			name: 'anthropic',
			provider: createAnthropicProvider({ apiKey: anthropicKey }),
		};
	}

	const ollamaHost = process.env.OLLAMA_HOST;
	return {
		name: 'ollama',
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
				provider: createAnthropicProvider({ apiKey }),
			};
		}
		case 'ollama': {
			const host = process.env.OLLAMA_HOST;
			return {
				name: 'ollama',
				provider: createOllamaProvider(host ? { host } : undefined),
			};
		}
		default:
			throw new Error(
				`Unknown provider "${name}". Available: anthropic, ollama`,
			);
	}
}
