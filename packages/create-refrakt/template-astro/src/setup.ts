import { loadContent } from '@refrakt-md/content';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import { loadPlugin, mergePlugins, runes as coreRunes } from '@refrakt-md/runes';
import type { RefraktConfig } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const config: RefraktConfig = JSON.parse(readFileSync(path.resolve('refrakt.config.json'), 'utf-8'));
const contentDir = path.resolve(config.contentDir);

const routeRules = config.routeRules ?? [{ pattern: '**', layout: 'default' }];

let _transform: ((tree: any) => any) | null = null;
let _hl: { (tree: any): any; css: string } | null = null;
let _theme: { manifest: any; layouts: any } | null = null;
let _communityTags: Record<string, Schema> | undefined;
let _packages: any[] | undefined;

async function init() {
	if (_transform) return;

	const [themeModule, layoutsModule] = await Promise.all([
		import(config.theme + '/transform'),
		import(config.theme + '/layouts'),
	]);

	// Manifest is a JSON file — resolve its path and read directly
	const { createRequire: cr } = await import('node:module');
	const manifestPath = cr(import.meta.url).resolve(config.theme + '/manifest');
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

	_theme = {
		manifest: { ...manifest, routeRules },
		layouts: layoutsModule.layouts,
	};

	const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

	let transformConfig = themeConfig;

	const pluginNames = config.plugins ?? [];
	if (pluginNames.length > 0) {
		const loaded = await Promise.all(
			pluginNames.map((name: string) => loadPlugin(name))
		);
		const coreRuneNames = new Set(Object.keys(coreRunes));
		const merged = mergePlugins(loaded, coreRuneNames, config.runes?.prefer);

		_communityTags = Object.keys(merged.tags).length > 0 ? merged.tags : undefined;
		_packages = loaded.map((l: any) => l.pkg);

		const { config: assembledConfig } = assembleThemeConfig({
			coreConfig: themeConfig,
			pluginRunes: merged.themeRunes,
			pluginIcons: merged.themeIcons,
			pluginBackgrounds: merged.themeBackgrounds,
			extensions: merged.extensions as any,
			provenance: merged.provenance,
		});

		transformConfig = assembledConfig;
	}

	_transform = createTransform(transformConfig);
}

export async function getTransform() {
	await init();
	return _transform!;
}

export async function getTheme() {
	await init();
	return _theme!;
}

export async function getHighlightTransform() {
	if (_hl) return _hl;
	const { createHighlightTransform } = await import('@refrakt-md/highlight');
	_hl = await createHighlightTransform((config as any).highlight);
	return _hl;
}

export async function getSite() {
	await init();
	return loadContent(contentDir, '/', {}, _communityTags, _packages);
}
