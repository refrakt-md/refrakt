export type TokenCategory =
	| 'typography'
	| 'primary-scale'
	| 'core'
	| 'surface'
	| 'semantic'
	| 'radius'
	| 'shadow'
	| 'code'
	| 'syntax';

export type TokenType = 'color' | 'font' | 'size' | 'shadow';

export interface TokenDefinition {
	name: string;
	cssVar: string;
	category: TokenCategory;
	type: TokenType;
	default: { light: string; dark: string | null };
	description: string;
}

export const categoryLabels: Record<TokenCategory, string> = {
	'typography': 'Typography',
	'primary-scale': 'Primary Scale',
	'core': 'Core Palette',
	'surface': 'Surfaces',
	'semantic': 'Semantic Colors',
	'radius': 'Border Radius',
	'shadow': 'Shadows',
	'code': 'Code',
	'syntax': 'Syntax Highlighting',
};

export const tokens: TokenDefinition[] = [
	// Typography
	{
		name: 'font-sans',
		cssVar: '--rf-font-sans',
		category: 'typography',
		type: 'font',
		default: { light: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", dark: null },
		description: 'Primary body font family',
	},
	{
		name: 'font-mono',
		cssVar: '--rf-font-mono',
		category: 'typography',
		type: 'font',
		default: { light: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", dark: null },
		description: 'Monospace font for code',
	},

	// Primary scale
	{
		name: 'color-primary-50',
		cssVar: '--rf-color-primary-50',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#f0f9ff', dark: null },
		description: 'Primary lightest tint',
	},
	{
		name: 'color-primary-100',
		cssVar: '--rf-color-primary-100',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#e0f2fe', dark: null },
		description: 'Primary very light',
	},
	{
		name: 'color-primary-200',
		cssVar: '--rf-color-primary-200',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#bae6fd', dark: null },
		description: 'Primary light',
	},
	{
		name: 'color-primary-300',
		cssVar: '--rf-color-primary-300',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#7dd3fc', dark: null },
		description: 'Primary medium-light',
	},
	{
		name: 'color-primary-400',
		cssVar: '--rf-color-primary-400',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#38bdf8', dark: null },
		description: 'Primary medium',
	},
	{
		name: 'color-primary-500',
		cssVar: '--rf-color-primary-500',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#0ea5e9', dark: null },
		description: 'Primary base',
	},
	{
		name: 'color-primary-600',
		cssVar: '--rf-color-primary-600',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#0284c7', dark: null },
		description: 'Primary medium-dark',
	},
	{
		name: 'color-primary-700',
		cssVar: '--rf-color-primary-700',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#0369a1', dark: null },
		description: 'Primary dark',
	},
	{
		name: 'color-primary-800',
		cssVar: '--rf-color-primary-800',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#075985', dark: null },
		description: 'Primary very dark',
	},
	{
		name: 'color-primary-900',
		cssVar: '--rf-color-primary-900',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#0c4a6e', dark: null },
		description: 'Primary darkest',
	},
	{
		name: 'color-primary-950',
		cssVar: '--rf-color-primary-950',
		category: 'primary-scale',
		type: 'color',
		default: { light: '#082f49', dark: null },
		description: 'Primary near-black',
	},

	// Core palette
	{
		name: 'color-text',
		cssVar: '--rf-color-text',
		category: 'core',
		type: 'color',
		default: { light: '#1a1a2e', dark: '#e2e8f0' },
		description: 'Primary text color',
	},
	{
		name: 'color-muted',
		cssVar: '--rf-color-muted',
		category: 'core',
		type: 'color',
		default: { light: '#64748b', dark: '#94a3b8' },
		description: 'Secondary/muted text',
	},
	{
		name: 'color-border',
		cssVar: '--rf-color-border',
		category: 'core',
		type: 'color',
		default: { light: '#e2e8f0', dark: 'rgba(255, 255, 255, 0.1)' },
		description: 'Default border color',
	},
	{
		name: 'color-bg',
		cssVar: '--rf-color-bg',
		category: 'core',
		type: 'color',
		default: { light: '#ffffff', dark: '#0c1222' },
		description: 'Page background',
	},
	{
		name: 'color-primary',
		cssVar: '--rf-color-primary',
		category: 'core',
		type: 'color',
		default: { light: '#0ea5e9', dark: '#38bdf8' },
		description: 'Primary accent color',
	},
	{
		name: 'color-primary-hover',
		cssVar: '--rf-color-primary-hover',
		category: 'core',
		type: 'color',
		default: { light: '#0284c7', dark: '#7dd3fc' },
		description: 'Primary hover state',
	},

	// Surfaces
	{
		name: 'color-surface',
		cssVar: '--rf-color-surface',
		category: 'surface',
		type: 'color',
		default: { light: '#f8fafc', dark: '#0f172a' },
		description: 'Card/panel background',
	},
	{
		name: 'color-surface-hover',
		cssVar: '--rf-color-surface-hover',
		category: 'surface',
		type: 'color',
		default: { light: '#f1f5f9', dark: '#1e293b' },
		description: 'Hovered surface',
	},
	{
		name: 'color-surface-active',
		cssVar: '--rf-color-surface-active',
		category: 'surface',
		type: 'color',
		default: { light: '#e2e8f0', dark: '#334155' },
		description: 'Active/pressed surface',
	},
	{
		name: 'color-surface-raised',
		cssVar: '--rf-color-surface-raised',
		category: 'surface',
		type: 'color',
		default: { light: '#ffffff', dark: '#1e293b' },
		description: 'Elevated surface (modals, dropdowns)',
	},

	// Semantic colors
	{
		name: 'color-info',
		cssVar: '--rf-color-info',
		category: 'semantic',
		type: 'color',
		default: { light: '#3b82f6', dark: '#60a5fa' },
		description: 'Info accent',
	},
	{
		name: 'color-info-bg',
		cssVar: '--rf-color-info-bg',
		category: 'semantic',
		type: 'color',
		default: { light: '#eff6ff', dark: 'rgba(59, 130, 246, 0.1)' },
		description: 'Info background',
	},
	{
		name: 'color-info-border',
		cssVar: '--rf-color-info-border',
		category: 'semantic',
		type: 'color',
		default: { light: '#bfdbfe', dark: 'rgba(59, 130, 246, 0.3)' },
		description: 'Info border',
	},
	{
		name: 'color-warning',
		cssVar: '--rf-color-warning',
		category: 'semantic',
		type: 'color',
		default: { light: '#f59e0b', dark: '#fbbf24' },
		description: 'Warning accent',
	},
	{
		name: 'color-warning-bg',
		cssVar: '--rf-color-warning-bg',
		category: 'semantic',
		type: 'color',
		default: { light: '#fffbeb', dark: 'rgba(245, 158, 11, 0.1)' },
		description: 'Warning background',
	},
	{
		name: 'color-warning-border',
		cssVar: '--rf-color-warning-border',
		category: 'semantic',
		type: 'color',
		default: { light: '#fde68a', dark: 'rgba(245, 158, 11, 0.3)' },
		description: 'Warning border',
	},
	{
		name: 'color-danger',
		cssVar: '--rf-color-danger',
		category: 'semantic',
		type: 'color',
		default: { light: '#ef4444', dark: '#f87171' },
		description: 'Danger/error accent',
	},
	{
		name: 'color-danger-bg',
		cssVar: '--rf-color-danger-bg',
		category: 'semantic',
		type: 'color',
		default: { light: '#fef2f2', dark: 'rgba(239, 68, 68, 0.1)' },
		description: 'Danger background',
	},
	{
		name: 'color-danger-border',
		cssVar: '--rf-color-danger-border',
		category: 'semantic',
		type: 'color',
		default: { light: '#fecaca', dark: 'rgba(239, 68, 68, 0.3)' },
		description: 'Danger border',
	},
	{
		name: 'color-success',
		cssVar: '--rf-color-success',
		category: 'semantic',
		type: 'color',
		default: { light: '#10b981', dark: '#34d399' },
		description: 'Success accent',
	},
	{
		name: 'color-success-bg',
		cssVar: '--rf-color-success-bg',
		category: 'semantic',
		type: 'color',
		default: { light: '#ecfdf5', dark: 'rgba(16, 185, 129, 0.1)' },
		description: 'Success background',
	},
	{
		name: 'color-success-border',
		cssVar: '--rf-color-success-border',
		category: 'semantic',
		type: 'color',
		default: { light: '#a7f3d0', dark: 'rgba(16, 185, 129, 0.3)' },
		description: 'Success border',
	},

	// Radii
	{
		name: 'radius-sm',
		cssVar: '--rf-radius-sm',
		category: 'radius',
		type: 'size',
		default: { light: '6px', dark: null },
		description: 'Small border radius',
	},
	{
		name: 'radius-md',
		cssVar: '--rf-radius-md',
		category: 'radius',
		type: 'size',
		default: { light: '10px', dark: null },
		description: 'Medium border radius',
	},
	{
		name: 'radius-lg',
		cssVar: '--rf-radius-lg',
		category: 'radius',
		type: 'size',
		default: { light: '16px', dark: null },
		description: 'Large border radius',
	},
	{
		name: 'radius-full',
		cssVar: '--rf-radius-full',
		category: 'radius',
		type: 'size',
		default: { light: '9999px', dark: null },
		description: 'Fully rounded (pill)',
	},

	// Shadows
	{
		name: 'shadow-xs',
		cssVar: '--rf-shadow-xs',
		category: 'shadow',
		type: 'shadow',
		default: { light: '0 1px 2px rgba(0,0,0,0.04)', dark: '0 1px 2px rgba(0,0,0,0.3)' },
		description: 'Extra-small shadow',
	},
	{
		name: 'shadow-sm',
		cssVar: '--rf-shadow-sm',
		category: 'shadow',
		type: 'shadow',
		default: { light: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', dark: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)' },
		description: 'Small shadow',
	},
	{
		name: 'shadow-md',
		cssVar: '--rf-shadow-md',
		category: 'shadow',
		type: 'shadow',
		default: { light: '0 4px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)', dark: '0 4px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)' },
		description: 'Medium shadow',
	},
	{
		name: 'shadow-lg',
		cssVar: '--rf-shadow-lg',
		category: 'shadow',
		type: 'shadow',
		default: { light: '0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)', dark: '0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)' },
		description: 'Large shadow',
	},

	// Code
	{
		name: 'color-code-bg',
		cssVar: '--rf-color-code-bg',
		category: 'code',
		type: 'color',
		default: { light: '#0f172a', dark: '#0f172a' },
		description: 'Code block background',
	},
	{
		name: 'color-code-text',
		cssVar: '--rf-color-code-text',
		category: 'code',
		type: 'color',
		default: { light: '#e2e8f0', dark: '#e2e8f0' },
		description: 'Code block text',
	},
	{
		name: 'color-inline-code-bg',
		cssVar: '--rf-color-inline-code-bg',
		category: 'code',
		type: 'color',
		default: { light: '#f1f5f9', dark: 'rgba(255, 255, 255, 0.08)' },
		description: 'Inline code background',
	},

	// Syntax highlighting (Shiki)
	{
		name: 'shiki-token-keyword',
		cssVar: '--shiki-token-keyword',
		category: 'syntax',
		type: 'color',
		default: { light: '#c792ea', dark: '#c792ea' },
		description: 'Keywords (if, const, return)',
	},
	{
		name: 'shiki-token-string',
		cssVar: '--shiki-token-string',
		category: 'syntax',
		type: 'color',
		default: { light: '#c3e88d', dark: '#c3e88d' },
		description: 'String literals',
	},
	{
		name: 'shiki-token-constant',
		cssVar: '--shiki-token-constant',
		category: 'syntax',
		type: 'color',
		default: { light: '#f78c6c', dark: '#f78c6c' },
		description: 'Constants and numbers',
	},
	{
		name: 'shiki-token-comment',
		cssVar: '--shiki-token-comment',
		category: 'syntax',
		type: 'color',
		default: { light: '#637777', dark: '#637777' },
		description: 'Comments',
	},
	{
		name: 'shiki-token-function',
		cssVar: '--shiki-token-function',
		category: 'syntax',
		type: 'color',
		default: { light: '#82aaff', dark: '#82aaff' },
		description: 'Function names',
	},
	{
		name: 'shiki-token-parameter',
		cssVar: '--shiki-token-parameter',
		category: 'syntax',
		type: 'color',
		default: { light: '#d6deeb', dark: '#d6deeb' },
		description: 'Parameters',
	},
	{
		name: 'shiki-token-punctuation',
		cssVar: '--shiki-token-punctuation',
		category: 'syntax',
		type: 'color',
		default: { light: '#89ddff', dark: '#89ddff' },
		description: 'Punctuation (brackets, semicolons)',
	},
];

/** Get tokens grouped by category, preserving definition order */
export function getTokensByCategory(): Map<TokenCategory, TokenDefinition[]> {
	const groups = new Map<TokenCategory, TokenDefinition[]>();
	for (const token of tokens) {
		let group = groups.get(token.category);
		if (!group) {
			group = [];
			groups.set(token.category, group);
		}
		group.push(token);
	}
	return groups;
}

/** Build default token values for a mode */
export function getDefaults(mode: 'light' | 'dark'): Record<string, string> {
	const values: Record<string, string> = {};
	for (const token of tokens) {
		if (mode === 'dark') {
			values[token.name] = token.default.dark ?? token.default.light;
		} else {
			values[token.name] = token.default.light;
		}
	}
	return values;
}

/** Look up a token definition by name */
export function getToken(name: string): TokenDefinition | undefined {
	return tokens.find((t) => t.name === name);
}
