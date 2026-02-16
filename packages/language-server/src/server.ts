#!/usr/bin/env node
import 'reflect-metadata';

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  type InitializeResult,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { provideCompletion } from './providers/completion.js';
import { provideHover } from './providers/hover.js';
import { provideDiagnostics } from './providers/diagnostics.js';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        triggerCharacters: [' ', '"', '=', '/'],
      },
      hoverProvider: true,
    },
  };
});

// Completion
connection.onCompletion((params) => {
  return provideCompletion(params, documents);
});

// Hover
connection.onHover((params) => {
  return provideHover(params, documents);
});

// Diagnostics — run on document open and change
documents.onDidChangeContent((change) => {
  const diagnostics = provideDiagnostics(change.document);
  connection.sendDiagnostics({
    uri: change.document.uri,
    diagnostics,
  });
});

documents.listen(connection);
connection.listen();
