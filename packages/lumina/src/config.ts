import { baseConfig } from '@refrakt-md/runes';
import { mergeThemeConfig } from '@refrakt-md/transform';
import { icons as lucideIcons } from './icons.js';

/** Lumina theme configuration — extends base with icon SVGs and tint presets */
export const luminaConfig = mergeThemeConfig(baseConfig, {
	tints: {
		warm: {
			light: {
				background: '#fdf6e3',
				primary: '#5c4a32',
				accent: '#c47d3b',
				border: '#e0d5c0',
			},
			dark: {
				background: '#2a2118',
				primary: '#e8d5b7',
				accent: '#e0a86e',
				border: '#4a3f33',
			},
		},
		cool: {
			light: {
				background: '#f0f4ff',
				primary: '#1e3a5f',
				accent: '#3b82f6',
				border: '#c7d7f0',
			},
			dark: {
				background: '#0f1a2e',
				primary: '#c7d7f0',
				accent: '#60a5fa',
				border: '#1e3a5f',
			},
		},
		dark: {
			mode: 'dark',
			dark: {
				background: '#1a1a2e',
				primary: '#e0e0e0',
				accent: '#e94560',
			},
		},
	},
	icons: {
		hint: {
			note: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
			warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
			caution: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
			check: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
		},
		global: lucideIcons,
	},
});
