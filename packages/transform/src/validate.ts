import type { ThemeManifest } from '@refrakt-md/types';

export interface ValidationError {
	path: string;
	message: string;
}

export interface ValidationWarning {
	path: string;
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

/**
 * Validate a theme configuration object.
 * Checks structure, types, and cross-references (e.g., icon groups, modifier conditions).
 */
export function validateThemeConfig(config: unknown): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

	if (typeof config !== 'object' || config === null) {
		errors.push({ path: '', message: 'Config must be a non-null object' });
		return { valid: false, errors, warnings };
	}

	const obj = config as Record<string, unknown>;

	// prefix
	if (typeof obj.prefix !== 'string' || !obj.prefix) {
		errors.push({ path: 'prefix', message: 'Must be a non-empty string' });
	}

	// tokenPrefix
	if (typeof obj.tokenPrefix !== 'string' || !obj.tokenPrefix) {
		errors.push({ path: 'tokenPrefix', message: 'Must be a non-empty string' });
	}

	// icons
	if (obj.icons !== undefined) {
		if (typeof obj.icons !== 'object' || obj.icons === null || Array.isArray(obj.icons)) {
			errors.push({ path: 'icons', message: 'Must be an object' });
		} else {
			const icons = obj.icons as Record<string, unknown>;
			for (const [group, variants] of Object.entries(icons)) {
				if (typeof variants !== 'object' || variants === null || Array.isArray(variants)) {
					errors.push({ path: `icons.${group}`, message: 'Must be an object mapping variant names to SVG strings' });
				} else {
					for (const [variant, svg] of Object.entries(variants as Record<string, unknown>)) {
						if (typeof svg !== 'string') {
							errors.push({ path: `icons.${group}.${variant}`, message: 'Must be an SVG string' });
						}
					}
				}
			}
		}
	}

	// runes
	if (obj.runes === undefined) {
		errors.push({ path: 'runes', message: 'Required field' });
	} else if (typeof obj.runes !== 'object' || obj.runes === null || Array.isArray(obj.runes)) {
		errors.push({ path: 'runes', message: 'Must be an object' });
	} else {
		const runes = obj.runes as Record<string, unknown>;
		const icons = (typeof obj.icons === 'object' && obj.icons !== null && !Array.isArray(obj.icons))
			? obj.icons as Record<string, unknown>
			: {};

		for (const [runeName, runeConfig] of Object.entries(runes)) {
			validateRuneConfig(runeName, runeConfig, icons, errors, warnings);
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}

function validateRuneConfig(
	runeName: string,
	config: unknown,
	icons: Record<string, unknown>,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	const prefix = `runes.${runeName}`;

	if (typeof config !== 'object' || config === null) {
		errors.push({ path: prefix, message: 'Must be an object' });
		return;
	}

	const rune = config as Record<string, unknown>;

	// block (required)
	if (typeof rune.block !== 'string' || !rune.block) {
		errors.push({ path: `${prefix}.block`, message: 'Required and must be a non-empty string' });
	}

	// Collect modifier names for cross-validation
	const modifierNames = new Set<string>();

	// modifiers
	if (rune.modifiers !== undefined) {
		if (typeof rune.modifiers !== 'object' || rune.modifiers === null || Array.isArray(rune.modifiers)) {
			errors.push({ path: `${prefix}.modifiers`, message: 'Must be an object' });
		} else {
			const mods = rune.modifiers as Record<string, unknown>;
			for (const [modName, modConfig] of Object.entries(mods)) {
				modifierNames.add(modName);
				if (typeof modConfig !== 'object' || modConfig === null) {
					errors.push({ path: `${prefix}.modifiers.${modName}`, message: 'Must be an object' });
				} else {
					const mod = modConfig as Record<string, unknown>;
					if (mod.source !== 'meta' && mod.source !== 'attribute') {
						errors.push({ path: `${prefix}.modifiers.${modName}.source`, message: 'Must be "meta" or "attribute"' });
					}
					if (mod.default !== undefined && typeof mod.default !== 'string') {
						errors.push({ path: `${prefix}.modifiers.${modName}.default`, message: 'Must be a string if provided' });
					}
				}
			}
		}
	}

	// contextModifiers
	if (rune.contextModifiers !== undefined) {
		if (typeof rune.contextModifiers !== 'object' || rune.contextModifiers === null || Array.isArray(rune.contextModifiers)) {
			errors.push({ path: `${prefix}.contextModifiers`, message: 'Must be an object' });
		} else {
			for (const [parent, suffix] of Object.entries(rune.contextModifiers as Record<string, unknown>)) {
				if (typeof suffix !== 'string') {
					errors.push({ path: `${prefix}.contextModifiers.${parent}`, message: 'Must be a string' });
				}
			}
		}
	}

	// staticModifiers
	if (rune.staticModifiers !== undefined) {
		if (!Array.isArray(rune.staticModifiers)) {
			errors.push({ path: `${prefix}.staticModifiers`, message: 'Must be an array of strings' });
		} else {
			for (let i = 0; i < rune.staticModifiers.length; i++) {
				if (typeof rune.staticModifiers[i] !== 'string') {
					errors.push({ path: `${prefix}.staticModifiers[${i}]`, message: 'Must be a string' });
				}
			}
		}
	}

	// autoLabel
	if (rune.autoLabel !== undefined) {
		if (typeof rune.autoLabel !== 'object' || rune.autoLabel === null || Array.isArray(rune.autoLabel)) {
			errors.push({ path: `${prefix}.autoLabel`, message: 'Must be an object' });
		} else {
			for (const [tag, label] of Object.entries(rune.autoLabel as Record<string, unknown>)) {
				if (typeof label !== 'string') {
					errors.push({ path: `${prefix}.autoLabel.${tag}`, message: 'Must be a string' });
				}
			}
		}
	}

	// contentWrapper
	if (rune.contentWrapper !== undefined) {
		if (typeof rune.contentWrapper !== 'object' || rune.contentWrapper === null) {
			errors.push({ path: `${prefix}.contentWrapper`, message: 'Must be an object with tag and ref' });
		} else {
			const cw = rune.contentWrapper as Record<string, unknown>;
			if (typeof cw.tag !== 'string' || !cw.tag) {
				errors.push({ path: `${prefix}.contentWrapper.tag`, message: 'Required and must be a non-empty string' });
			}
			if (typeof cw.ref !== 'string' || !cw.ref) {
				errors.push({ path: `${prefix}.contentWrapper.ref`, message: 'Required and must be a non-empty string' });
			}
		}
	}

	// styles
	if (rune.styles !== undefined) {
		if (typeof rune.styles !== 'object' || rune.styles === null || Array.isArray(rune.styles)) {
			errors.push({ path: `${prefix}.styles`, message: 'Must be an object' });
		} else {
			for (const [modName, spec] of Object.entries(rune.styles as Record<string, unknown>)) {
				if (typeof spec === 'string') {
					// Simple form: modifier → CSS property
				} else if (typeof spec === 'object' && spec !== null) {
					const s = spec as Record<string, unknown>;
					if (typeof s.prop !== 'string' || typeof s.template !== 'string') {
						errors.push({ path: `${prefix}.styles.${modName}`, message: 'Object form must have "prop" and "template" strings' });
					}
				} else {
					errors.push({ path: `${prefix}.styles.${modName}`, message: 'Must be a string or { prop, template } object' });
				}
			}
		}
	}

	// structure — validate and cross-reference
	if (rune.structure !== undefined) {
		if (typeof rune.structure !== 'object' || rune.structure === null || Array.isArray(rune.structure)) {
			errors.push({ path: `${prefix}.structure`, message: 'Must be an object' });
		} else {
			for (const [key, entry] of Object.entries(rune.structure as Record<string, unknown>)) {
				validateStructureEntry(entry, `${prefix}.structure.${key}`, modifierNames, icons, errors, warnings);
			}
		}
	}
}

function validateStructureEntry(
	entry: unknown,
	path: string,
	modifierNames: Set<string>,
	icons: Record<string, unknown>,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	if (typeof entry !== 'object' || entry === null) {
		errors.push({ path, message: 'Must be an object' });
		return;
	}

	const e = entry as Record<string, unknown>;

	if (typeof e.tag !== 'string' || !e.tag) {
		errors.push({ path: `${path}.tag`, message: 'Required and must be a non-empty string' });
	}

	// Cross-validate: condition references a modifier
	if (e.condition !== undefined) {
		if (typeof e.condition !== 'string') {
			errors.push({ path: `${path}.condition`, message: 'Must be a string' });
		} else if (!modifierNames.has(e.condition)) {
			warnings.push({ path: `${path}.condition`, message: `References modifier "${e.condition}" which is not defined in modifiers` });
		}
	}

	// Cross-validate: conditionAny references modifiers
	if (e.conditionAny !== undefined) {
		if (!Array.isArray(e.conditionAny)) {
			errors.push({ path: `${path}.conditionAny`, message: 'Must be an array of strings' });
		} else {
			for (const name of e.conditionAny) {
				if (typeof name !== 'string') {
					errors.push({ path: `${path}.conditionAny`, message: 'All entries must be strings' });
				} else if (!modifierNames.has(name)) {
					warnings.push({ path: `${path}.conditionAny`, message: `References modifier "${name}" which is not defined in modifiers` });
				}
			}
		}
	}

	// Cross-validate: icon group exists
	if (e.icon !== undefined) {
		if (typeof e.icon !== 'object' || e.icon === null) {
			errors.push({ path: `${path}.icon`, message: 'Must be an object with group and variant' });
		} else {
			const icon = e.icon as Record<string, unknown>;
			if (typeof icon.group !== 'string') {
				errors.push({ path: `${path}.icon.group`, message: 'Must be a string' });
			} else if (!(icon.group in icons)) {
				warnings.push({ path: `${path}.icon.group`, message: `References icon group "${icon.group}" which is not defined in icons` });
			}
			if (typeof icon.variant !== 'string') {
				errors.push({ path: `${path}.icon.variant`, message: 'Must be a string' });
			}
		}
	}

	// Recurse into children
	if (e.children !== undefined) {
		if (!Array.isArray(e.children)) {
			errors.push({ path: `${path}.children`, message: 'Must be an array' });
		} else {
			for (let i = 0; i < e.children.length; i++) {
				const child = e.children[i];
				if (typeof child === 'string') {
					// String literal children are fine
				} else {
					validateStructureEntry(child, `${path}.children[${i}]`, modifierNames, icons, errors, warnings);
				}
			}
		}
	}
}

/**
 * Validate a theme manifest object.
 * Checks required fields and cross-references (e.g., routeRules → layouts).
 */
export function validateManifest(manifest: unknown): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

	if (typeof manifest !== 'object' || manifest === null) {
		errors.push({ path: '', message: 'Manifest must be a non-null object' });
		return { valid: false, errors, warnings };
	}

	const obj = manifest as Record<string, unknown>;

	// Required string fields
	for (const field of ['name', 'version', 'target', 'designTokens'] as const) {
		if (typeof obj[field] !== 'string' || !obj[field]) {
			errors.push({ path: field, message: 'Required and must be a non-empty string' });
		}
	}

	// layouts
	const layoutNames = new Set<string>();
	if (obj.layouts !== undefined) {
		if (typeof obj.layouts !== 'object' || obj.layouts === null || Array.isArray(obj.layouts)) {
			errors.push({ path: 'layouts', message: 'Must be an object' });
		} else {
			const layouts = obj.layouts as Record<string, unknown>;
			for (const [name, layout] of Object.entries(layouts)) {
				layoutNames.add(name);
				if (typeof layout !== 'object' || layout === null) {
					errors.push({ path: `layouts.${name}`, message: 'Must be an object' });
				} else {
					const l = layout as Record<string, unknown>;
					if (typeof l.component !== 'string' || !l.component) {
						errors.push({ path: `layouts.${name}.component`, message: 'Required and must be a non-empty string' });
					}
					if (!Array.isArray(l.regions)) {
						errors.push({ path: `layouts.${name}.regions`, message: 'Required and must be an array' });
					}
				}
			}
		}
	}

	// routeRules
	if (obj.routeRules !== undefined) {
		if (!Array.isArray(obj.routeRules)) {
			errors.push({ path: 'routeRules', message: 'Must be an array' });
		} else {
			for (let i = 0; i < obj.routeRules.length; i++) {
				const rule = obj.routeRules[i];
				if (typeof rule !== 'object' || rule === null) {
					errors.push({ path: `routeRules[${i}]`, message: 'Must be an object' });
				} else {
					const r = rule as Record<string, unknown>;
					if (typeof r.pattern !== 'string' || !r.pattern) {
						errors.push({ path: `routeRules[${i}].pattern`, message: 'Required and must be a non-empty string' });
					}
					if (typeof r.layout !== 'string' || !r.layout) {
						errors.push({ path: `routeRules[${i}].layout`, message: 'Required and must be a non-empty string' });
					} else if (layoutNames.size > 0 && !layoutNames.has(r.layout)) {
						warnings.push({ path: `routeRules[${i}].layout`, message: `References layout "${r.layout}" which is not defined in layouts` });
					}
				}
			}
		}
	}

	// components
	if (obj.components !== undefined) {
		if (typeof obj.components !== 'object' || obj.components === null || Array.isArray(obj.components)) {
			errors.push({ path: 'components', message: 'Must be an object' });
		} else {
			const components = obj.components as Record<string, unknown>;
			for (const [name, comp] of Object.entries(components)) {
				if (typeof comp !== 'object' || comp === null) {
					errors.push({ path: `components.${name}`, message: 'Must be an object' });
				} else {
					const c = comp as Record<string, unknown>;
					if (typeof c.component !== 'string' || !c.component) {
						errors.push({ path: `components.${name}.component`, message: 'Required and must be a non-empty string' });
					}
				}
			}
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}
