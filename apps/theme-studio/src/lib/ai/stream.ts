export interface GenerateOptions {
	prompt: string;
	current?: {
		light: Record<string, string>;
		dark: Record<string, string>;
	};
	overrides?: {
		light: string[];
		dark: string[];
	};
	model?: string;
	signal?: AbortSignal;
}

/**
 * Stream theme generation from the server endpoint.
 * Yields text chunks as they arrive (for progress display).
 */
export async function* streamGenerate(
	options: GenerateOptions,
): AsyncGenerator<string> {
	const response = await fetch('/api/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(options),
		signal: options.signal,
	});

	if (!response.ok) {
		throw new Error(`Generation API error: ${response.status} ${response.statusText}`);
	}

	const body = response.body;
	if (!body) throw new Error('No response body');

	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop()!;

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const data = line.slice(6);
				if (data === '[DONE]') return;

				const parsed = JSON.parse(data);
				if (parsed.error) throw new Error(parsed.error);
				if (parsed.text) yield parsed.text;
			}
		}
	} finally {
		reader.releaseLock();
	}
}
