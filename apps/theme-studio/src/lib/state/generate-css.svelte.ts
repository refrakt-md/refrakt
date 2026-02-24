import { themeState } from './theme.svelte.js';
import { historyState } from './history.svelte.js';
import { streamGenerate } from '../ai/stream.js';
import type { RuneGroup } from '../contracts.js';

export type GenerateCssStatus = 'idle' | 'streaming' | 'error';

class GenerateCssState {
	status: GenerateCssStatus = $state('idle');
	streamedText = $state('');
	error = $state('');
	private abortController: AbortController | null = null;

	get isGenerating(): boolean {
		return this.status === 'streaming';
	}

	async generate(prompt: string, group: RuneGroup): Promise<void> {
		if (this.isGenerating) return;

		this.status = 'streaming';
		this.streamedText = '';
		this.error = '';
		this.abortController = new AbortController();

		try {
			for await (const chunk of streamGenerate({
				prompt,
				mode: 'rune-css',
				runeName: group.name,
				runeGroup: group.members,
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
				distributeCssToBlocks(css, group.blocks);
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

/** Distribute AI-generated CSS to per-block overrides by matching .rf-{block} selectors */
function distributeCssToBlocks(css: string, blocks: string[]): void {
	if (blocks.length === 1) {
		themeState.updateRuneOverride(blocks[0], css);
		return;
	}

	// Split CSS into rule blocks by looking for top-level selectors
	const blockCss = new Map<string, string[]>();
	for (const block of blocks) {
		blockCss.set(block, []);
	}

	// Split on lines that start a new rule (begin with . or [ at column 0)
	const sections = css.split(/(?=^\.)/m);
	for (const section of sections) {
		const trimmed = section.trim();
		if (!trimmed) continue;

		let matched = false;
		for (const block of blocks) {
			if (trimmed.includes(`.rf-${block}`)) {
				blockCss.get(block)!.push(trimmed);
				matched = true;
				break;
			}
		}
		if (!matched) {
			blockCss.get(blocks[0])!.push(trimmed);
		}
	}

	for (const [block, parts] of blockCss) {
		if (parts.length > 0) {
			themeState.updateRuneOverride(block, parts.join('\n\n'));
		}
	}
}

export const generateCssState = new GenerateCssState();
