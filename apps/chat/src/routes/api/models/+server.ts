import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export interface ModelInfo {
	id: string;
	label: string;
	description?: string;
}

export interface ModelsResponse {
	provider: string;
	models: ModelInfo[];
	default: string;
}

const ANTHROPIC_MODELS: ModelInfo[] = [
	{ id: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5', description: 'Best balance of speed and quality' },
	{ id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', description: 'Fast and affordable' },
];

const GEMINI_MODELS: ModelInfo[] = [
	{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fast and capable' },
	{ id: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro', description: 'Most capable' },
];

const OLLAMA_MODELS: ModelInfo[] = [
	{ id: 'llama3.2', label: 'Llama 3.2' },
];

export const GET: RequestHandler = async () => {
	let provider: string, models: ModelInfo[], defaultModel: string;

	if (env.ANTHROPIC_API_KEY) {
		provider = 'anthropic';
		models = ANTHROPIC_MODELS;
		defaultModel = 'claude-sonnet-4-5-20250929';
	} else if (env.GOOGLE_API_KEY) {
		provider = 'gemini';
		models = GEMINI_MODELS;
		defaultModel = 'gemini-2.0-flash';
	} else {
		provider = 'ollama';
		models = OLLAMA_MODELS;
		defaultModel = 'llama3.2';
	}

	return Response.json({ provider, models, default: defaultModel } satisfies ModelsResponse);
};
