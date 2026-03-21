import {
  Location,
  type DefinitionParams,
  type TextDocuments,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { hasPartial, getPartialsDir } from '../registry/loader.js';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Provide go-to-definition for partial file references.
 * When the cursor is on a `file="..."` value inside a `{% partial %}` tag,
 * returns the location of the referenced partial file.
 */
export function provideDefinition(
  params: DefinitionParams,
  documents: TextDocuments<TextDocument>,
): Location | null {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const partialsDir = getPartialsDir();
  if (!partialsDir) return null;

  const text = document.getText();
  const offset = document.offsetAt(params.position);

  // Find if cursor is inside a {% partial file="..." %} tag's file value
  const partialRegex = /\{%\s*partial\s+file\s*=\s*"([^"]*)"\s*\/?%\}/g;
  let match;

  while ((match = partialRegex.exec(text)) !== null) {
    // Calculate the range of the file value (inside the quotes)
    const fileAttrStart = match.index + match[0].indexOf('"') + 1;
    const fileAttrEnd = fileAttrStart + match[1].length;

    if (offset >= fileAttrStart && offset <= fileAttrEnd) {
      const fileName = match[1];
      if (!hasPartial(fileName)) return null;

      const filePath = join(partialsDir, fileName);
      const uri = pathToFileURL(filePath).toString();

      return Location.create(uri, {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      });
    }
  }

  return null;
}
