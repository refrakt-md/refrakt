/**
 * Reading register (SPEC-108) — a body-text classification that refines
 * `data-section="body"` as `data-reading`. Ordered tightest-UI → most-editorial.
 *
 * Like the SPEC-107 container axes it is a small *semantic* vocabulary: the author
 * (or layout, or rune default) picks the register; the **theme owns the magnitude**
 * (measure, paragraph rhythm, drop-cap eligibility, the styled opening). This module
 * is the single shared contract imported by the engine, validation, and the editor.
 */

/** The reading registers, ordered tightest-UI → most-editorial. */
export const READING_REGISTERS = ['fine', 'ui', 'prose'] as const;

/** A reading register value. */
export type ReadingRegister = (typeof READING_REGISTERS)[number];

/**
 * Validate an arbitrary value as a `ReadingRegister`, else `undefined` — so an
 * author typo falls through the resolution cascade rather than emitting a bogus
 * `data-reading`.
 */
export function coerceRegister(value: unknown): ReadingRegister | undefined {
	return typeof value === 'string' && (READING_REGISTERS as readonly string[]).includes(value)
		? (value as ReadingRegister)
		: undefined;
}

/** Inputs to {@link resolveReading}. */
export interface ReadingResolutionInput {
	/** `reading=` on the block (or region); highest precedence. Validated. */
	authorAttr?: unknown;
	/** The rune's `RuneConfig.defaultReading` — `undefined` for the bare body. */
	runeDefault?: ReadingRegister;
	/** The active layout's content-region reading default — applies to the bare body. */
	regionDefault?: ReadingRegister;
}

/**
 * Resolve the effective reading register. Precedence: author ▸ rune ▸ region ▸ `ui`.
 *
 * The region default seeds **only the bare body** (the caller passes `regionDefault`
 * only there); a rune resolves from its own `defaultReading ?? 'ui'`, so prose never
 * leaks into nested chrome.
 */
export function resolveReading(input: ReadingResolutionInput): ReadingRegister {
	return coerceRegister(input.authorAttr) ?? input.runeDefault ?? input.regionDefault ?? 'ui';
}

/** The default register. Unmarked content stays at `ui` and emits no `data-reading`. */
export const DEFAULT_READING: ReadingRegister = 'ui';

/**
 * Author opt-ins unlocked by each register — the single declarative source imported
 * by the engine (to validate, e.g. warn when `dropcap` is set off-register) and the
 * editor (to decide which toggles to surface). Only `prose` enables `dropcap`.
 */
export const READING_CAPABILITIES: Record<ReadingRegister, { dropcap: boolean }> = {
	fine: { dropcap: false },
	ui: { dropcap: false },
	prose: { dropcap: true },
};
