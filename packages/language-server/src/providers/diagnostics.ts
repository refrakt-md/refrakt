import {
  Diagnostic,
  DiagnosticSeverity,
  type TextDocuments,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { validate } from '../parser/markdoc.js';
import { findSimilar } from '../registry/loader.js';

export function provideDiagnostics(
  document: TextDocument,
): Diagnostic[] {
  const text = document.getText();
  const errors = validate(text);

  return errors.map(error => {
    let severity: DiagnosticSeverity;
    switch (error.error.level) {
      case 'critical':
        severity = DiagnosticSeverity.Error;
        break;
      case 'error':
        severity = DiagnosticSeverity.Error;
        break;
      case 'warning':
        severity = DiagnosticSeverity.Warning;
        break;
      case 'info':
        severity = DiagnosticSeverity.Information;
        break;
      default:
        severity = DiagnosticSeverity.Warning;
    }

    // Determine line range
    const startLine = error.lines?.[0] ?? 0;
    const endLine = error.lines?.[error.lines.length - 1] ?? startLine;

    let message = error.error.message;

    // Enhance "tag-undefined" errors with suggestions
    if (error.error.id === 'tag-undefined') {
      const tagMatch = message.match(/'([^']+)'/) ?? message.match(/"([^"]+)"/);
      if (tagMatch) {
        const similar = findSimilar(tagMatch[1], 2);
        if (similar.length > 0) {
          message += ` Did you mean: ${similar.slice(0, 3).map(s => `'${s}'`).join(', ')}?`;
        }
      }
    }

    return {
      severity,
      range: {
        start: { line: startLine, character: 0 },
        end: { line: endLine + 1, character: 0 },
      },
      message,
      source: 'refrakt',
    };
  });
}
