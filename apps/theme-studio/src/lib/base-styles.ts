import styles from './base-styles.json';

const styleMap = styles as Record<string, string>;

/** Get the base lumina CSS for a rune block (e.g., 'hint', 'bento') */
export function getBaseStyle(block: string): string {
	return styleMap[block] ?? '';
}
