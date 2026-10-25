import { describe, it, expect } from 'vitest';
import { baseConfig } from '@refrakt-md/runes';
import { renderPreviewContent } from '../src/preview.js';

/** SPEC-170 / WORK-645 — the editor preview parses an indented page as the
 *  content loader does: the same HTML as the page written flat. */

const FLAT = '{% hint type="note" %}\nSome **hint** text.\n\n- a list\n{% /hint %}\n';
const INDENTED = '{% hint type="note" %}\n\tSome **hint** text.\n\n\t- a list\n{% /hint %}\n';

describe('an indented page in the editor preview', () => {
	it('renders the same HTML as the flat page', () => {
		const render = (raw: string) => renderPreviewContent(raw, baseConfig as never, '');
		expect(render(INDENTED)).toEqual(render(FLAT));
		expect(render(INDENTED)).not.toContain('<pre');
	});
});
