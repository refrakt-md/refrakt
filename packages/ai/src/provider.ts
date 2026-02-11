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
