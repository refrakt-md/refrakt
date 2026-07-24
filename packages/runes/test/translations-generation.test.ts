import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { coreTranslations } from '../src/translations.generated.js';

const here = dirname(fileURLToPath(import.meta.url));
const i18nDir = resolve(here, '..', 'i18n');

describe('coreTranslations is generated from i18n/*.json (SPEC-035)', () => {
	it('the generated bundle matches the canonical JSON files (no drift)', () => {
		const expected: Record<string, unknown> = {};
		if (existsSync(i18nDir)) {
			for (const file of readdirSync(i18nDir).sort()) {
				if (!file.endsWith('.json')) continue;
				const locale = file.replace(/\.json$/, '');
				if (locale === 'en') continue; // English is the baked-in default.
				expected[locale] = JSON.parse(readFileSync(resolve(i18nDir, file), 'utf-8'));
			}
		}
		expect(coreTranslations).toEqual(expected);
	});

	it('every non-English key is also present in en.json (no orphans)', () => {
		const enPath = resolve(i18nDir, 'en.json');
		if (!existsSync(enPath)) return;
		const en = JSON.parse(readFileSync(enPath, 'utf-8'));
		for (const [locale, dict] of Object.entries(coreTranslations)) {
			for (const key of Object.keys(dict)) {
				expect(en, `${locale}.json key "${key}" missing from en.json`).toHaveProperty(key);
			}
		}
	});
});
