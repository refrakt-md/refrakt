import { resolve, basename, extname } from 'node:path';

/** A source panel with language, content, and origin tracking */
export interface SandboxSourcePanel {
	label: string;
	language: string;
	content: string;
	/** Origin file path relative to the src directory, or "inline" */
	origin: string;
}

export interface SandboxSourceResult {
	/** Assembled HTML content in data-source annotated format */
	content: string;
	/** Source panels with origin labels for display */
	panels: SandboxSourcePanel[];
	/** Fatal errors that prevent rendering */
	errors: string[];
	/** Non-fatal diagnostic messages */
	warnings: string[];
}

/** File types recognized by the sandbox directory scanner */
const FILE_ROLES = {
	'.html': 'html',
	'.css': 'css',
	'.js': 'js',
	'.svg': 'svg',
	'.glsl-vert': 'glsl-vert',
	'.glsl-frag': 'glsl-frag',
} as const;

type FileRole = (typeof FILE_ROLES)[keyof typeof FILE_ROLES];

interface DiscoveredFile {
	name: string;
	role: FileRole;
	content: string;
}

/**
 * Get the role extension for a file. Handles compound extensions like .glsl-vert.
 */
function getFileRole(filename: string): FileRole | null {
	// Check compound extensions first
	if (filename.endsWith('.glsl-vert')) return 'glsl-vert';
	if (filename.endsWith('.glsl-frag')) return 'glsl-frag';
	const ext = extname(filename);
	return (FILE_ROLES as Record<string, FileRole>)[ext] ?? null;
}

/**
 * Scan a directory and assemble sandbox content from discovered files.
 *
 * @param dirPath Absolute path to the sandbox source directory
 * @param srcName Relative name used for display (e.g. "login-form")
 * @param readFile Returns file content or null if not found
 * @param listDir Returns filenames in a directory, or empty array if not found
 * @param dirExists Returns true if the directory exists
 */
export function assembleFromDirectory(
	dirPath: string,
	srcName: string,
	readFile: (path: string) => string | null,
	listDir: (path: string) => string[],
	dirExists?: (path: string) => boolean,
): SandboxSourceResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Check if directory exists
	if (dirExists && !dirExists(dirPath)) {
		return {
			content: '',
			panels: [],
			errors: [`Sandbox src directory not found: "${srcName}"`],
			warnings: [],
		};
	}

	const entries = listDir(dirPath);

	if (entries.length === 0) {
		return {
			content: '',
			panels: [],
			errors: [],
			warnings: [`Sandbox src directory "${srcName}" contains no .html, .css, or .js files`],
		};
	}

	// Discover and classify files
	const files: DiscoveredFile[] = [];
	for (const name of entries.sort()) {
		const role = getFileRole(name);
		if (!role) continue;
		const content = readFile(resolve(dirPath, name));
		if (content != null) {
			files.push({ name, role, content });
		}
	}

	if (files.length === 0) {
		return {
			content: '',
			panels: [],
			errors: [],
			warnings: [`Sandbox src directory "${srcName}" contains no .html, .css, or .js files`],
		};
	}

	// Group by role
	const byRole = new Map<FileRole, DiscoveredFile[]>();
	for (const file of files) {
		const group = byRole.get(file.role) ?? [];
		group.push(file);
		byRole.set(file.role, group);
	}

	// HTML — single file, prefer index.html
	const htmlFiles = byRole.get('html') ?? [];
	let htmlFile: DiscoveredFile | undefined;
	if (htmlFiles.length > 1) {
		htmlFile = htmlFiles.find(f => f.name === 'index.html') ?? htmlFiles[0];
		warnings.push(`Sandbox src "${srcName}" has multiple .html files — using ${htmlFile.name}`);
	} else if (htmlFiles.length === 1) {
		htmlFile = htmlFiles[0];
	} else {
		warnings.push(`Sandbox src "${srcName}" has no .html file — body will be empty`);
	}

	// CSS — concatenate alphabetically
	const cssFiles = byRole.get('css') ?? [];
	const cssContent = cssFiles.map(f => f.content).join('\n');

	// JS — concatenate alphabetically
	const jsFiles = byRole.get('js') ?? [];
	let jsContent = jsFiles.map(f => f.content).join('\n');

	// SVG — inject into HTML body
	const svgFiles = byRole.get('svg') ?? [];
	const svgContent = svgFiles.map(f => f.content).join('\n');

	// Shaders — inject as JS constants
	const vertFile = (byRole.get('glsl-vert') ?? [])[0];
	const fragFile = (byRole.get('glsl-frag') ?? [])[0];
	let shaderPreamble = '';
	if (vertFile) {
		shaderPreamble += `const VERTEX_SHADER = \`${escapeTemplateLiteral(vertFile.content)}\`;\n`;
	}
	if (fragFile) {
		shaderPreamble += `const FRAGMENT_SHADER = \`${escapeTemplateLiteral(fragFile.content)}\`;\n`;
	}
	if (shaderPreamble) {
		jsContent = shaderPreamble + jsContent;
	}

	// Assemble into data-source annotated HTML
	const htmlBody = (htmlFile?.content ?? '') + (svgContent ? '\n' + svgContent : '');
	const parts: string[] = [];
	if (htmlBody) {
		parts.push(`<div data-source="HTML">\n${htmlBody}\n</div>`);
	}
	if (cssContent) {
		parts.push(`<style data-source="CSS">\n${cssContent}\n</style>`);
	}
	if (jsContent) {
		parts.push(`<script data-source="JavaScript">\n${jsContent}\n</script>`);
	}

	const content = parts.join('\n');

	// Build source panels with origin labels
	const panels: SandboxSourcePanel[] = [];
	if (htmlFile) {
		panels.push({
			label: `HTML`,
			language: 'html',
			content: htmlBody,
			origin: `${srcName}/${htmlFile.name}`,
		});
	}
	if (cssContent) {
		const originNames = cssFiles.map(f => `${srcName}/${f.name}`).join(', ');
		panels.push({
			label: `CSS`,
			language: 'css',
			content: cssContent,
			origin: originNames,
		});
	}
	if (jsContent) {
		const originParts: string[] = [];
		if (vertFile) originParts.push(`${srcName}/${vertFile.name}`);
		if (fragFile) originParts.push(`${srcName}/${fragFile.name}`);
		originParts.push(...jsFiles.map(f => `${srcName}/${f.name}`));
		panels.push({
			label: `JavaScript`,
			language: 'javascript',
			content: jsContent,
			origin: originParts.join(', '),
		});
	}

	return { content, panels, errors, warnings };
}

/**
 * Merge inline content after file-sourced content.
 * Parses both strings as data-source annotated HTML, then combines each role.
 */
export function mergeContent(fileContent: string, inlineContent: string): string {
	const fileHtml = extractSection(fileContent, 'div', 'HTML');
	const fileCss = extractSection(fileContent, 'style', 'CSS');
	const fileJs = extractSection(fileContent, 'script', 'JavaScript');

	const inlineHtml = extractSection(inlineContent, 'div', 'HTML');
	const inlineCss = extractSection(inlineContent, 'style', 'CSS');
	const inlineJs = extractSection(inlineContent, 'script', 'JavaScript');

	const html = joinParts(fileHtml, inlineHtml);
	const css = joinParts(fileCss, inlineCss);
	const js = joinParts(fileJs, inlineJs);

	const parts: string[] = [];
	if (html) parts.push(`<div data-source="HTML">\n${html}\n</div>`);
	if (css) parts.push(`<style data-source="CSS">\n${css}\n</style>`);
	if (js) parts.push(`<script data-source="JavaScript">\n${js}\n</script>`);

	return parts.join('\n');
}

function extractSection(content: string, tag: string, label: string): string {
	const regex = new RegExp(`<${tag}[^>]*data-source="${label}"[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
	const match = content.match(regex);
	return match?.[1]?.trim() ?? '';
}

function joinParts(a: string, b: string): string {
	if (a && b) return a + '\n' + b;
	return a || b;
}

function escapeTemplateLiteral(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}
