/**
 * Generate `src/translations.generated.ts` (`coreTranslations`) from the
 * canonical per-locale JSON bundles in `i18n/*.json` (SPEC-035, WORK-512).
 *
 * The JSON files are the source of truth — what `refrakt i18n extract` produces
 * and what translators / TMS tools consume (Decision D3/D8). This bakes them
 * into a typed TS module so the runtime never has to load JSON at import time
 * (which is awkward under NodeNext ESM), and only the active locale is selected
 * at build time by `assembleThemeConfig`. `en.json` is the English *reference*
 * (the default is already baked into the config), so it is intentionally not
 * emitted into the runtime map. Runs before `tsc`; never hand-edit the output.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const i18nDir = resolve(here, '..', 'i18n');
const outPath = resolve(here, '..', 'src', 'translations.generated.ts');

const HEADER =
	'// GENERATED from i18n/*.json by scripts/generate-translations.mjs — do not edit by hand.\n' +
	'// Edit the i18n/<locale>.json bundles and rebuild.\n\n' +
	"import type { LocalizedValue } from '@refrakt-md/transform';\n\n";

const bundles = {};
if (existsSync(i18nDir)) {
	for (const file of readdirSync(i18nDir).sort()) {
		if (!file.endsWith('.json')) continue;
		const locale = file.replace(/\.json$/, '');
		if (locale === 'en') continue; // English is the baked-in default reference.
		bundles[locale] = JSON.parse(readFileSync(resolve(i18nDir, file), 'utf-8'));
	}
}

const body =
	'/** First-party core translation bundles, keyed by BCP 47 locale (SPEC-035).\n' +
	' *  English is the baked-in default and is not included here. */\n' +
	'export const coreTranslations: Record<string, Record<string, LocalizedValue>> = ' +
	JSON.stringify(bundles, null, '\t') +
	';\n';

writeFileSync(outPath, HEADER + body);
console.log(`Generated src/translations.generated.ts (${Object.keys(bundles).length} locale bundle(s))`);
