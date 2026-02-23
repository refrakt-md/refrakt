import { themeState } from './theme.svelte.js';
import { historyState } from './history.svelte.js';
import { streamGenerate } from '../ai/stream.js';
import type { RuneContract } from '../contracts.js';

export type GenerateCssStatus = 'idle' | 'streaming' | 'error';

class GenerateCssState {
	status: GenerateCssStatus = $state('idle');
	streamedText = $state('');
	error = $state('');
	private abortController: AbortController | null = null;

	get isGenerating(): boolean {
		return this.status === 'streaming';
	}

	async generate(prompt: string, runeName: string, contract: RuneContract): Promise<void> {
		if (this.isGenerating) return;

		this.status = 'streaming';
		this.streamedText = '';
		this.error = '';
		this.abortController = new AbortController();

		try {
			for await (const chunk of streamGenerate({
				prompt,
				mode: 'rune-css',
				runeName,
				current: {
					light: { ...themeState.tokens.light },
					dark: { ...themeState.tokens.dark },
				},
				signal: this.abortController.signal,
			})) {
				this.streamedText += chunk;
			}

			const css = extractCss(this.streamedText);
			if (css) {
				historyState.push();
				themeState.updateRuneOverride(contract.block, css);
			} else {
				this.status = 'error';
				this.error = 'Could not extract CSS from response';
				return;
			}
			this.status = 'idle';
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				this.status = 'idle';
				return;
			}
			this.status = 'error';
			this.error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			this.abortController = null;
		}
	}

	cancel(): void {
		this.abortController?.abort();
	}

	dismiss(): void {
		this.status = 'idle';
		this.error = '';
	}
}

/** Extract CSS from AI response — handles code fences and raw CSS */
function extractCss(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	// Try ```css ... ``` fence
	const cssFence = trimmed.match(/```css\s*\n([\s\S]*?)\n\s*```/);
	if (cssFence) return cssFence[1].trim();

	// Try generic ``` ... ``` fence
	const genericFence = trimmed.match(/```\s*\n([\s\S]*?)\n\s*```/);
	if (genericFence) return genericFence[1].trim();

	// If it looks like CSS (contains selectors with braces), use directly
	if (trimmed.includes('{') && trimmed.includes('}')) return trimmed;

	return null;
}

export const generateCssState = new GenerateCssState();
