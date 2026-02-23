import type { SymbolExtractor, ExtractorResult } from './types.js';

export class PythonExtractor implements SymbolExtractor {
	constructor(_rootDir: string, _sourceUrl?: string) {}

	extractFile(_filePath: string): ExtractorResult {
		throw new Error(
			'Python extraction is not yet implemented. ' +
			'Install tree-sitter-python and contribute a Python extractor.'
		);
	}
}
