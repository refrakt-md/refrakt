import { themeState } from './theme.svelte.js';

const MAX_STACK = 50;

export interface ThemeSnapshot {
	name: string;
	description: string;
	tokens: { light: Record<string, string>; dark: Record<string, string> };
	overrides: { light: string[]; dark: string[] };
	runeOverrides: Record<string, string>;
}

function takeSnapshot(): ThemeSnapshot {
	return {
		name: themeState.name,
		description: themeState.description,
		tokens: {
			light: { ...themeState.tokens.light },
			dark: { ...themeState.tokens.dark },
		},
		overrides: {
			light: [...themeState.overrides.light],
			dark: [...themeState.overrides.dark],
		},
		runeOverrides: { ...themeState.runeOverrides },
	};
}

function restoreSnapshot(snapshot: ThemeSnapshot): void {
	themeState.name = snapshot.name;
	themeState.description = snapshot.description;
	themeState.tokens.light = { ...snapshot.tokens.light };
	themeState.tokens.dark = { ...snapshot.tokens.dark };
	themeState.overrides.light = new Set(snapshot.overrides.light);
	themeState.overrides.dark = new Set(snapshot.overrides.dark);
	themeState.runeOverrides = { ...snapshot.runeOverrides };
}

class HistoryState {
	private stack: ThemeSnapshot[] = $state([]);
	private index = $state(-1);
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;

	get canUndo(): boolean {
		return this.index > 0;
	}

	get canRedo(): boolean {
		return this.index < this.stack.length - 1;
	}

	/** Push the current theme state onto the stack */
	push(): void {
		const snapshot = takeSnapshot();
		// Truncate any forward history
		this.stack = [...this.stack.slice(0, this.index + 1), snapshot];
		this.index = this.stack.length - 1;
		// Cap stack size
		if (this.stack.length > MAX_STACK) {
			this.stack = this.stack.slice(this.stack.length - MAX_STACK);
			this.index = this.stack.length - 1;
		}
	}

	/** Push with debounce — for rapid changes like color picker drags */
	pushDebounced(delay = 300): void {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		// If this is the first change (empty stack), push immediately for the "before" state
		if (this.stack.length === 0) {
			this.push();
		}
		this.debounceTimer = setTimeout(() => {
			this.push();
			this.debounceTimer = null;
		}, delay);
	}

	undo(): void {
		if (!this.canUndo) return;
		this.index--;
		restoreSnapshot(this.stack[this.index]);
	}

	redo(): void {
		if (!this.canRedo) return;
		this.index++;
		restoreSnapshot(this.stack[this.index]);
	}

	/** Get serializable representation for persistence */
	toJSON(): { stack: ThemeSnapshot[]; index: number } {
		return { stack: [...this.stack], index: this.index };
	}

	/** Restore history from persisted data */
	hydrate(data: { stack: ThemeSnapshot[]; index: number }): void {
		this.stack = data.stack;
		this.index = Math.min(data.index, data.stack.length - 1);
	}
}

export const historyState = new HistoryState();
