export type {
	SymbolDoc, SymbolExtractor, ExtractorResult, SymbolKind,
	SymbolParameter, SymbolReturn, SymbolThrows,
	SymbolMemberDoc, SymbolGroupDoc,
} from './types.js';

export async function loadExtractor(
	lang: 'typescript' | 'python',
	rootDir: string,
	sourceUrl?: string,
): Promise<import('./types.js').SymbolExtractor> {
	switch (lang) {
		case 'typescript': {
			const { TypeScriptExtractor } = await import('./typescript.js');
			return new TypeScriptExtractor(rootDir, sourceUrl);
		}
		case 'python': {
			const { PythonExtractor } = await import('./python.js');
			return new PythonExtractor(rootDir, sourceUrl);
		}
		default:
			throw new Error(`Unsupported language: ${lang}`);
	}
}
