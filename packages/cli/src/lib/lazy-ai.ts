// Structural type stubs matching @refrakt-md/ai's exported shape. Kept local
// so tsc can type-check the CLI without requiring @refrakt-md/ai to be built.
export interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface CompletionOptions {
	messages: Message[];
	model?: string;
	maxTokens?: number;
	temperature?: number;
}

export interface AIProvider {
	name: string;
	complete(options: CompletionOptions): AsyncIterable<string>;
}

export interface RuneInfo {
	name: string;
	aliases: string[];
	description: string;
	reinterprets: Record<string, string>;
	schema: {
		attributes?: Record<
			string,
			{ type?: unknown; required?: boolean; matches?: unknown }
		>;
	};
	prompt?: string;
}

interface AIModule {
	generateSystemPrompt: (
		runes: Record<string, RuneInfo>,
		includeRunes?: Set<string>,
		mode?: string,
	) => string;
	writePrompt: (options?: { multiFile?: boolean }) => string;
	createAnthropicProvider: (options: { apiKey: string }) => AIProvider;
	createGeminiProvider: (options: { apiKey: string }) => AIProvider;
	createOllamaProvider: (options?: { host?: string }) => AIProvider;
}

let cached: AIModule | undefined;

export async function loadAI(): Promise<AIModule> {
	if (cached) return cached;
	// Non-literal module specifier so tsc falls back to `any` and does not
	// require the package to exist at build time.
	const moduleId: string = '@refrakt-md/ai';
	try {
		cached = (await import(moduleId)) as AIModule;
		return cached;
	} catch (err) {
		throw new Error(
			`@refrakt-md/ai is required for this command but could not be loaded.\n` +
				`Install it: npm install @refrakt-md/ai\n\n` +
				`Underlying error: ${(err as Error).message}`,
		);
	}
}
