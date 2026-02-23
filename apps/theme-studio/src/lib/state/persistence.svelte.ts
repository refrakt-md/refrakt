import { themeState, type ThemeMode } from './theme.svelte.js';
import { historyState, type ThemeSnapshot } from './history.svelte.js';
import { generateState } from './generate.svelte.js';

const STORAGE_KEY_THEME = 'refrakt-theme-studio:theme';
const STORAGE_KEY_HISTORY = 'refrakt-theme-studio:history';
const SCHEMA_VERSION = 2;

interface PersistedTheme {
	v: number;
	name: string;
	description: string;
	mode: ThemeMode;
	tokens: { light: Record<string, string>; dark: Record<string, string> };
	overrides: { light: string[]; dark: string[] };
	selectedFixtures: string[];
	hasGenerated: boolean;
	runeOverrides: Record<string, string>;
}

interface PersistedHistory {
	v: number;
	stack: ThemeSnapshot[];
	index: number;
}

// --- Serialization ---

function serializeTheme(): PersistedTheme {
	return {
		v: SCHEMA_VERSION,
		name: themeState.name,
		description: themeState.description,
		mode: themeState.mode,
		tokens: {
			light: { ...themeState.tokens.light },
			dark: { ...themeState.tokens.dark },
		},
		overrides: {
			light: [...themeState.overrides.light],
			dark: [...themeState.overrides.dark],
		},
		selectedFixtures: [...themeState.selectedFixtures],
		hasGenerated: generateState.hasGenerated,
		runeOverrides: { ...themeState.runeOverrides },
	};
}

function serializeHistory(): PersistedHistory {
	const { stack, index } = historyState.toJSON();
	return { v: SCHEMA_VERSION, stack, index };
}

// --- Migration ---

function migrateTheme(raw: unknown): PersistedTheme | null {
	if (!raw || typeof raw !== 'object') return null;
	const data = raw as Record<string, unknown>;
	if (typeof data.v !== 'number' || data.v < 1) return null;
	// v1 → v2: add runeOverrides
	if (data.v === 1) {
		return { ...data, v: 2, runeOverrides: {} } as unknown as PersistedTheme;
	}
	if (data.v === SCHEMA_VERSION) return data as unknown as PersistedTheme;
	return null;
}

function migrateHistory(raw: unknown): PersistedHistory | null {
	if (!raw || typeof raw !== 'object') return null;
	const data = raw as Record<string, unknown>;
	if (typeof data.v !== 'number' || data.v < 1) return null;
	if (data.v === SCHEMA_VERSION) return data as unknown as PersistedHistory;
	return null;
}

// --- Load / Save ---

function loadTheme(): void {
	try {
		const raw = localStorage.getItem(STORAGE_KEY_THEME);
		if (!raw) return;
		const data = migrateTheme(JSON.parse(raw));
		if (!data) return;
		themeState.hydrate(data);
		generateState.hasGenerated = data.hasGenerated;
	} catch (err) {
		console.warn('[Theme Studio] Failed to load theme:', err);
	}
}

function loadHistory(): void {
	try {
		const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
		if (!raw) return;
		const data = migrateHistory(JSON.parse(raw));
		if (!data || !Array.isArray(data.stack)) return;
		historyState.hydrate(data);
	} catch (err) {
		console.warn('[Theme Studio] Failed to load history:', err);
	}
}

function saveTheme(data: PersistedTheme): void {
	try {
		localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(data));
	} catch (err) {
		console.warn('[Theme Studio] Failed to save theme:', err);
	}
}

function saveHistory(data: PersistedHistory): void {
	try {
		localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(data));
	} catch (err) {
		console.warn('[Theme Studio] Failed to save history:', err);
	}
}

// --- Init ---

/**
 * Load persisted state and set up auto-save effects.
 * Call from onMount in the root page component.
 * Returns a cleanup function.
 */
export function initPersistence(): () => void {
	loadTheme();
	loadHistory();

	const cleanup = $effect.root(() => {
		// Auto-save theme (500ms debounce via effect cleanup)
		$effect(() => {
			const data = serializeTheme();
			const timer = setTimeout(() => saveTheme(data), 500);
			return () => clearTimeout(timer);
		});

		// Auto-save history (1000ms debounce)
		$effect(() => {
			const data = serializeHistory();
			const timer = setTimeout(() => saveHistory(data), 1000);
			return () => clearTimeout(timer);
		});
	});

	return cleanup;
}
