import { mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { generateSystemPrompt, writePrompt } from '@refrakt-md/ai';
import { runes } from '@refrakt-md/runes';
import type { AIProvider, Message } from '@refrakt-md/ai';

export interface WriteOptions {
	prompt: string;
	provider: AIProvider;
	providerName: string;
	modelName: string;
	model?: string;
	output?: string;
	outputDir?: string;
}

function log(message: string): void {
	process.stderr.write(message);
}

function wordCount(text: string): number {
	return text.split(/\s+/).filter(Boolean).length;
}

const FILE_MARKER = /^--- FILE: (.+) ---$/gm;

export function splitFiles(raw: string): Array<{ path: string; content: string }> {
	const files: Array<{ path: string; content: string }> = [];
	const markers: Array<{ path: string; index: number }> = [];

	let match;
	while ((match = FILE_MARKER.exec(raw)) !== null) {
		markers.push({ path: match[1].trim(), index: match.index + match[0].length });
	}

	if (markers.length === 0) {
		return [];
	}

	for (let i = 0; i < markers.length; i++) {
		const filePath = markers[i].path;

		if (filePath.includes('..')) {
			throw new Error(`Invalid file path "${filePath}": parent traversal is not allowed`);
		}

		const start = markers[i].index;
		const nextMarkerPos = i + 1 < markers.length
			? raw.indexOf(`--- FILE: ${markers[i + 1].path} ---`, start)
			: raw.length;
		const content = raw.slice(start, nextMarkerPos).replace(/^\n/, '').replace(/\n$/, '');

		files.push({ path: filePath, content: content + '\n' });
	}

	return files;
}

export async function writeCommand(options: WriteOptions): Promise<void> {
	const { prompt, provider, providerName, modelName, model, output, outputDir } = options;

	log(`Using ${providerName} (${modelName})\n`);

	const multiFile = !!outputDir;
	const systemPrompt = generateSystemPrompt(runes) + writePrompt({ multiFile });

	const messages: Message[] = [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: prompt },
	];

	let content = '';

	if (output || outputDir) {
		log('Generating...');
	}

	for await (const chunk of provider.complete({ messages, model })) {
		content += chunk;
		if (!output && !outputDir) {
			process.stdout.write(chunk);
		}
	}

	if (outputDir) {
		const files = splitFiles(content);
		const words = wordCount(content);

		if (files.length === 0) {
			log(`\rGenerating... done (${words.toLocaleString()} words)\n`);
			const fallbackPath = path.join(outputDir, 'index.md');
			mkdirSync(outputDir, { recursive: true });
			writeFileSync(fallbackPath, content);
			log(`Written to ${fallbackPath}\n`);
			return;
		}

		log(`\rGenerating... done (${words.toLocaleString()} words, ${files.length} files)\n`);

		for (const file of files) {
			const fullPath = path.join(outputDir, file.path);
			mkdirSync(path.dirname(fullPath), { recursive: true });
			writeFileSync(fullPath, file.content);
			log(`  ${fullPath}\n`);
		}
	} else if (output) {
		const words = wordCount(content);
		log(`\rGenerating... done (${words.toLocaleString()} words)\n`);
		writeFileSync(output, content);
		log(`Written to ${output}\n`);
	} else {
		process.stdout.write('\n');
	}
}
