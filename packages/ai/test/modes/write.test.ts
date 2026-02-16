import { describe, it, expect } from 'vitest';
import { writePrompt } from '../../src/modes/write.js';

describe('writePrompt', () => {
	it('returns empty string when no options', () => {
		expect(writePrompt()).toBe('');
	});

	it('returns empty string when multiFile is false', () => {
		expect(writePrompt({ multiFile: false })).toBe('');
	});

	it('includes multi-file instructions when multiFile is true', () => {
		const result = writePrompt({ multiFile: true });
		expect(result).toContain('--- FILE:');
		expect(result).toContain('Multi-file output');
	});

	it('includes example structure with frontmatter', () => {
		const result = writePrompt({ multiFile: true });
		expect(result).toContain('--- FILE: index.md ---');
		expect(result).toContain('--- FILE: _layout.md ---');
		expect(result).toContain('frontmatter');
	});

	it('warns against parent traversal', () => {
		const result = writePrompt({ multiFile: true });
		expect(result).toContain('../');
	});
});
