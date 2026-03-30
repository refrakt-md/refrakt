import { loadContent } from '@refrakt-md/content';
import type { Site } from '@refrakt-md/content';
import { luminaConfig } from '@refrakt-md/lumina/transform';
import { loadRunePackage, mergePackages, runes as coreRunes } from '@refrakt-md/runes';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import { createHighlightTransform } from '@refrakt-md/highlight';
import type { HighlightTransform } from '@refrakt-md/highlight';
import type { Schema } from '@markdoc/markdoc';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';

const config: RefraktConfig = JSON.parse(readFileSync(path.resolve('refrakt.config.json'), 'utf-8'));
const contentDir = path.resolve(config.contentDir);
const icons = {
	...luminaConfig.icons,
	global: { ...luminaConfig.icons.global, ...(config.icons ?? {}) },
};

let _hl: HighlightTransform | null = null;
let _communityTags: Record<string, Schema> | undefined;
let _transform: ((tree: any) => any) | null = null;
let _site: Promise<Site> | null = null;

export async function getHighlightTransform(): Promise<HighlightTransform> {
	if (_hl) return _hl;
	const hl = await createHighlightTransform(config.highlight);
	_hl = hl;
	return hl;
}

export async function getTransform(): Promise<(tree: any) => any> {
	if (_transform) return _transform;

	const packageNames = config.packages ?? [];
	if (packageNames.length === 0) {
		_transform = createTransform(luminaConfig);
		return _transform;
	}

	const loaded = await Promise.all(
		packageNames.map((name: string) => loadRunePackage(name))
	);
	const coreRuneNames = new Set(Object.keys(coreRunes));
	const merged = mergePackages(loaded, coreRuneNames, config.runes?.prefer);

	_communityTags = Object.keys(merged.tags).length > 0 ? merged.tags : undefined;

	const { config: assembledConfig } = assembleThemeConfig({
		coreConfig: luminaConfig,
		packageRunes: merged.themeRunes,
		packageIcons: merged.themeIcons,
		packageBackgrounds: merged.themeBackgrounds,
		extensions: merged.extensions,
		provenance: merged.provenance,
	});

	if (config.tints) {
		assembledConfig.tints = { ...assembledConfig.tints, ...config.tints } as any;
	}
	if (config.backgrounds) {
		assembledConfig.backgrounds = { ...assembledConfig.backgrounds, ...config.backgrounds } as any;
	}

	_transform = createTransform(assembledConfig);
	return _transform;
}

export async function getCommunityTags(): Promise<Record<string, Schema> | undefined> {
	await getTransform();
	return _communityTags;
}

export function getSite(): Promise<Site> {
	if (_site) return _site;
	_site = getCommunityTags().then(communityTags =>
		loadContent(contentDir, '/', icons, communityTags)
	);
	return _site;
}
