import type { RefraktConfig } from '@refrakt-md/types';

const VIRTUAL_PREFIX = 'virtual:refrakt/';
const RESOLVED_PREFIX = '\0virtual:refrakt/';

export const VIRTUAL_IDS = {
	theme: `${VIRTUAL_PREFIX}theme`,
	tokens: `${VIRTUAL_PREFIX}tokens`,
	config: `${VIRTUAL_PREFIX}config`,
} as const;

export function resolveVirtualId(id: string): string | undefined {
	if (id === VIRTUAL_IDS.theme) return `${RESOLVED_PREFIX}theme`;
	if (id === VIRTUAL_IDS.tokens) return `${RESOLVED_PREFIX}tokens`;
	if (id === VIRTUAL_IDS.config) return `${RESOLVED_PREFIX}config`;
	return undefined;
}

/** Build-time context for CSS tree-shaking */
export interface BuildContext {
	isBuild: boolean;
	usedCssBlocks?: Set<string>;
}

export function loadVirtualModule(
	id: string,
	config: RefraktConfig,
	buildCtx: BuildContext = { isBuild: false },
): string | undefined {
	const themeAdapter = `${config.theme}/${config.target}`;

	if (id === `${RESOLVED_PREFIX}theme`) {
		const overrides = config.overrides;
		if (overrides && Object.keys(overrides).length > 0) {
			const entries = Object.entries(overrides);
			const imports = entries
				.map(([, path], i) => `import _o${i} from '${path}';`)
				.join('\n');
			const mappings = entries
				.map(([typeName], i) => `\t\t'${typeName}': _o${i},`)
				.join('\n');
			return [
				`import { theme as _base } from '${themeAdapter}';`,
				imports,
				'',
				'export const theme = {',
				'\t..._base,',
				'\tcomponents: {',
				'\t\t..._base.components,',
				mappings,
				'\t}',
				'};',
			].join('\n');
		}
		return `export { theme } from '${themeAdapter}';`;
	}

	if (id === `${RESOLVED_PREFIX}tokens`) {
		if (buildCtx.isBuild && buildCtx.usedCssBlocks) {
			const theme = config.theme;
			const lines = [`import '${theme}/base.css';`];
			for (const block of [...buildCtx.usedCssBlocks].sort()) {
				lines.push(`import '${theme}/styles/runes/${block}.css';`);
			}
			return lines.join('\n');
		}
		return `import '${themeAdapter}/tokens.css';`;
	}

	if (id === `${RESOLVED_PREFIX}config`) {
		return `export default ${JSON.stringify(config)};`;
	}

	return undefined;
}
