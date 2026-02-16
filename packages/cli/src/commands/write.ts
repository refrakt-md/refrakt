import { writeFileSync } from 'node:fs';
import { generateSystemPrompt } from '@refrakt-md/ai';
import { runes } from '@refrakt-md/runes';
import type { AIProvider, Message } from '@refrakt-md/ai';

export interface WriteOptions {
	prompt: string;
	provider: AIProvider;
	providerName: string;
	modelName: string;
	model?: string;
	output?: string;
}

function log(message: string): void {
	process.stderr.write(message);
}

function wordCount(text: string): number {
	return text.split(/\s+/).filter(Boolean).length;
}

export async function writeCommand(options: WriteOptions): Promise<void> {
	const { prompt, provider, providerName, modelName, model, output } = options;

	log(`Using ${providerName} (${modelName})\n`);

	const systemPrompt = generateSystemPrompt(runes);

	const messages: Message[] = [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: prompt },
	];

	let content = '';

	if (output) {
		log('Generating...');
	}

	for await (const chunk of provider.complete({ messages, model })) {
		content += chunk;
		if (!output) {
			process.stdout.write(chunk);
		}
	}

	if (output) {
		const words = wordCount(content);
		log(`\rGenerating... done (${words.toLocaleString()} words)\n`);
		writeFileSync(output, content);
		log(`Written to ${output}\n`);
	} else {
		process.stdout.write('\n');
	}
}
