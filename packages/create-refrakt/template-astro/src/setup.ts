import { loadContent } from '@refrakt-md/content';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import { loadRunePackage, mergePackages, runes as coreRunes } from '@refrakt-md/runes';
import type { RefraktConfig } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const config: RefraktConfig = JSON.parse(readFileSync(path.resolve('refrakt.config.json'), 'utf-8'));
const contentDir = path.resolve(config.contentDir);

let _transform: ((tree: any) => any) | null = null;
let _communityTags: Record<string, Schema> | undefined;

async function init() {
	if (_transform) return;

	const themeModule = await import(config.theme + '/transform');
	const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

	let transformConfig = themeConfig;

	const packageNames = config.packages ?? [];
	if (packageNames.length > 0) {
		const loaded = await Promise.all(
			packageNames.map((name: string) => loadRunePackage(name))
		);
		const coreRuneNames = new Set(Object.keys(coreRunes));
		const merged = mergePackages(loaded, coreRuneNames, config.runes?.prefer);

		_communityTags = Object.keys(merged.tags).length > 0 ? merged.tags : undefined;

		const { config: assembledConfig } = assembleThemeConfig({
			coreConfig: themeConfig,
			packageRunes: merged.themeRunes,
			packageIcons: merged.themeIcons,
			packageBackgrounds: merged.themeBackgrounds,
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

export async function getSite() {
	await init();
	return loadContent(contentDir, '/', {}, _communityTags);
}
