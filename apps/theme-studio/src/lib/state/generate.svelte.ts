import { themeState } from './theme.svelte.js';
import { streamGenerate, type GenerateOptions } from '../ai/stream.js';
import { parseThemeResponse, type ParseResult } from '../ai/parse.js';

export type GenerateStatus = 'idle' | 'streaming' | 'applying' | 'error';

class GenerateState {
	status: GenerateStatus = $state('idle');
	streamedText = $state('');
	error = $state('');
	warnings = $state<string[]>([]);
	hasGenerated = $state(false);
	private abortController: AbortController | null = null;

	get isGenerating(): boolean {
		return this.status === 'streaming' || this.status === 'applying';
	}

	async generate(prompt: string): Promise<void> {
		if (this.isGenerating) return;

		this.status = 'streaming';
		this.streamedText = '';
		this.error = '';
		this.warnings = [];
		this.abortController = new AbortController();

		// Determine if this is a refinement (previous generation or manual edits)
		const hasOverrides =
			themeState.overrides.light.size > 0 ||
			themeState.overrides.dark.size > 0;
		const isRefinement = hasOverrides || this.hasGenerated;

		const options: GenerateOptions = {
			prompt,
			signal: this.abortController.signal,
		};

		// Include current state for refinement
		if (isRefinement) {
			options.current = {
				light: { ...themeState.tokens.light },
				dark: { ...themeState.tokens.dark },
			};
			if (hasOverrides) {
				options.overrides = {
					light: [...themeState.overrides.light],
					dark: [...themeState.overrides.dark],
				};
			}
		}

		try {
			for await (const chunk of streamGenerate(options)) {
				this.streamedText += chunk;
			}

			// Parse the completed response
			this.status = 'applying';
			const result = this.applyResult(this.streamedText);

			if (!result.success) {
				this.status = 'error';
				const preview = this.streamedText.trim()
					? '\n\nResponse preview:\n' + this.streamedText.slice(0, 500)
					: '\n\n(No response text received)';
				this.error = (result.error ?? 'Failed to parse theme') + preview;
			} else {
				this.warnings = result.warnings;
				this.status = 'idle';
			}
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

	private applyResult(text: string): ParseResult {
		const result = parseThemeResponse(text);
		if (result.success && result.theme) {
			// Apply to ThemeState — update all tokens in both modes
			themeState.tokens.light = result.theme.light;
			themeState.tokens.dark = result.theme.dark;
			// Clear overrides so subsequent manual edits form the correct
			// override set for the next refinement pass
			themeState.overrides.light = new Set();
			themeState.overrides.dark = new Set();
			this.hasGenerated = true;
		}
		return result;
	}

	cancel(): void {
		this.abortController?.abort();
	}

	dismiss(): void {
		this.status = 'idle';
		this.error = '';
	}
}

export const generateState = new GenerateState();
