import { writeFileSync } from 'node:fs';
import { generateSystemPrompt } from '@refract-md/ai';
import { runes } from '@refract-md/runes';
import type { AIProvider, Message } from '@refract-md/ai';

export interface WriteOptions {
	prompt: string;
	provider: AIProvider;
	model?: string;
	output?: string;
}

export async function writeCommand(options: WriteOptions): Promise<void> {
	const { prompt, provider, model, output } = options;

	const systemPrompt = generateSystemPrompt(runes);

	const messages: Message[] = [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: prompt },
	];

	let content = '';

	for await (const chunk of provider.complete({ messages, model })) {
		if (output) {
			content += chunk;
		} else {
			process.stdout.write(chunk);
		}
	}

	if (output) {
		writeFileSync(output, content);
		process.stderr.write(`Written to ${output}\n`);
	} else {
		process.stdout.write('\n');
	}
}
