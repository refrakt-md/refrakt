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
		const hasOverrides = overrides && Object.keys(overrides).length > 0;
		const routeRules = config.routeRules ?? [{ pattern: '**', layout: 'default' }];

		// Always generate the expanded form to inject routeRules from site config
		const lines = [`import { theme as _base } from '${themeAdapter}';`];

		if (hasOverrides) {
			const entries = Object.entries(overrides);
			for (let i = 0; i < entries.length; i++) {
				lines.push(`import _o${i} from '${entries[i][1]}';`);
			}
		}

		lines.push('');
		lines.push('export const theme = {');
		lines.push('\t..._base,');
		lines.push('\tmanifest: {');
		lines.push('\t\t..._base.manifest,');
		lines.push(`\t\trouteRules: ${JSON.stringify(routeRules)},`);
		lines.push('\t},');

		if (hasOverrides) {
			const entries = Object.entries(overrides);
			lines.push('\tcomponents: {');
			lines.push('\t\t..._base.components,');
			for (let i = 0; i < entries.length; i++) {
				lines.push(`\t\t'${entries[i][0]}': _o${i},`);
			}
			lines.push('\t},');
		}

		lines.push('};');
		return lines.join('\n');
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
