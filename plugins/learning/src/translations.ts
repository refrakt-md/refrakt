/**
 * SPEC-035 — first-party translation bundles for the learning plugin.
 *
 * The canonical artifacts are the per-locale JSON files in `plugins/learning/i18n/`
 * (what `refrakt i18n extract` produces and translators edit). They're embedded
 * here as typed objects so the plugin ships them without runtime JSON loading.
 * Keep this in sync with `i18n/<locale>.json`; English is the baked-in default
 * and is intentionally omitted from the runtime map.
 */
import type { PluginLocalizedValue } from '@refrakt-md/types';

export const translations: Record<string, Record<string, PluginLocalizedValue>> = {
	de: {
		'learning.howto.difficulty': 'Schwierigkeit',
		'learning.howto.estimatedTime': 'Geschätzte Zeit',
		'learning.recipe.cookTime': 'Kochen',
		'learning.recipe.difficulty': 'Schwierigkeit',
		'learning.recipe.prepTime': 'Vorbereitung',
		'learning.recipe.servings': 'Portionen',
	},
};
