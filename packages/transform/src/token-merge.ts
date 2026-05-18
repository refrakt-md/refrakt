import type { PartialTokenContract, ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Deep-merge multiple {@link PartialTokenContract} layers in order, with
 * last-write-wins per leaf. Used to compose a final token contract from:
 *   theme base → presets in order → site `theme.tokens` → site `theme.modes`
 *
 * The merge walks the token-contract tree explicitly. Plain objects are
 * recursed; everything else (strings, numbers, booleans, arrays) is
 * overwritten by the later layer. `null` at any leaf is treated as a real
 * value (interpreted by stylesheet generation as "reset to inherit").
 *
 * Hand-rolled rather than using `lodash.merge` — array semantics there are
 * surprising for a token contract, and we want explicit, auditable behaviour.
 */
export function mergeTokenContracts(
	...layers: (PartialTokenContract | undefined)[]
): PartialTokenContract {
	const result: PartialTokenContract = {};
	for (const layer of layers) {
		if (!layer) continue;
		deepMergeInto(result as Record<string, unknown>, layer as Record<string, unknown>);
	}
	return result;
}

/**
 * Merge a list of {@link ThemeTokensConfig} layers (preserving `modes` and
 * `extra` overlays per layer). Base fields and mode fields merge
 * independently — an override in `theme.tokens.color.primary` only changes
 * the base value, even if `dark` is declared.
 *
 * Final composition order matches SPEC-048's layering rules:
 *   1. Theme package base tokens
 *   2. Each preset in declared order
 *   3. Site `theme.tokens` (base overrides)
 *   4. Site `theme.modes` (mode overrides)
 */
export function mergeThemeTokensConfigs(
	...layers: (ThemeTokensConfig | undefined)[]
): ThemeTokensConfig {
	const baseLayers: (PartialTokenContract | undefined)[] = [];
	const modeMap: Record<string, (PartialTokenContract | undefined)[]> = {};
	const extras: (Record<string, string> | undefined)[] = [];

	for (const layer of layers) {
		if (!layer) continue;
		const { modes, extra, ...base } = layer;
		baseLayers.push(base as PartialTokenContract);
		if (extra) extras.push(extra);
		if (modes) {
			for (const [name, modeLayer] of Object.entries(modes)) {
				(modeMap[name] ??= []).push(modeLayer);
			}
		}
	}

	const result: ThemeTokensConfig = mergeTokenContracts(...baseLayers);

	const mergedModes: Record<string, PartialTokenContract> = {};
	for (const [name, modeLayers] of Object.entries(modeMap)) {
		mergedModes[name] = mergeTokenContracts(...modeLayers);
	}
	if (Object.keys(mergedModes).length > 0) result.modes = mergedModes;

	if (extras.length > 0) {
		result.extra = Object.assign({}, ...extras);
	}

	return result;
}

function deepMergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(source)) {
		if (isPlainObject(value)) {
			const existing = target[key];
			const next = isPlainObject(existing) ? (existing as Record<string, unknown>) : {};
			deepMergeInto(next, value as Record<string, unknown>);
			target[key] = next;
		} else {
			target[key] = value;
		}
	}
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	if (v === null || typeof v !== 'object') return false;
	if (Array.isArray(v)) return false;
	const proto = Object.getPrototypeOf(v);
	return proto === Object.prototype || proto === null;
}
