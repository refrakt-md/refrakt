import {
  Diagnostic,
  DiagnosticSeverity,
  type TextDocuments,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { validate } from '../parser/markdoc.js';
import { findSimilar, hasPartial, getPartialNames } from '../registry/loader.js';

export function provideDiagnostics(
  document: TextDocument,
): Diagnostic[] {
  const text = document.getText();
  const errors = validate(text);

  const diagnostics: Diagnostic[] = errors.map(error => {
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

  // Check for missing partial file references
  diagnostics.push(...checkPartialReferences(text));

  return diagnostics;
}

/** Scan for {% partial file="..." %} tags and warn when the referenced file doesn't exist */
function checkPartialReferences(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const partialRegex = /\{%\s*partial\s+file\s*=\s*"([^"]*)"\s*\/?%\}/g;
  let match;

  while ((match = partialRegex.exec(text)) !== null) {
    const fileName = match[1];
    if (!fileName) continue;

    if (!hasPartial(fileName)) {
      // Find the line number for this match
      const before = text.slice(0, match.index);
      const line = before.split('\n').length - 1;

      let message = `Partial file not found: '${fileName}'. Expected in _partials/ directory.`;

      // Suggest similar names
      const allPartials = getPartialNames();
      const similar = allPartials
        .filter(p => levenshteinDistance(fileName, p) <= 3)
        .slice(0, 3);
      if (similar.length > 0) {
        message += ` Did you mean: ${similar.map(s => `'${s}'`).join(', ')}?`;
      }

      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line, character: 0 },
          end: { line: line + 1, character: 0 },
        },
        message,
        source: 'refrakt',
      });
    }
  }

  return diagnostics;
}

/** Simple Levenshtein distance for partial name suggestions */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
