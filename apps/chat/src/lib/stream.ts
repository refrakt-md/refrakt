/**
 * Stream chat messages from the server-side AI proxy via SSE.
 * Yields text chunks as they arrive from the AI provider.
 */
export async function* streamChat(
	messages: Array<{ role: string; content: string }>,
	mode?: string,
	signal?: AbortSignal,
): AsyncGenerator<string> {
	const response = await fetch('/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ messages, mode }),
		signal,
	});

	if (!response.ok) {
		throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
	}

	const body = response.body;
	if (!body) {
		throw new Error('No response body');
	}

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
				if (parsed.error) {
					throw new Error(parsed.error);
				}
				if (parsed.text) {
					yield parsed.text;
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}
