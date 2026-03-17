#!/usr/bin/env node
import 'reflect-metadata';

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  type InitializeResult,
  DidChangeWatchedFilesNotification,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { provideCompletion } from './providers/completion.js';
import { provideHover } from './providers/hover.js';
import { provideDiagnostics } from './providers/diagnostics.js';
import { inspectRuneAtPosition } from './providers/inspector.js';
import { initializeRegistry, reinitialize } from './registry/loader.js';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let workspaceRoot: string | undefined;

connection.onInitialize((params): InitializeResult => {
  if (params.rootUri) {
    workspaceRoot = new URL(params.rootUri).pathname;
  } else if (params.rootPath) {
    workspaceRoot = params.rootPath;
  }

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

// After handshake, load community packages asynchronously
connection.onInitialized(async () => {
  await initializeRegistry(workspaceRoot);

  // Register for watched file change notifications
  connection.client.register(DidChangeWatchedFilesNotification.type, {
    watchers: [{ globPattern: '**/refrakt.config.json' }],
  });

  // Re-validate all open documents now that community runes are loaded
  for (const doc of documents.all()) {
    const diagnostics = provideDiagnostics(doc);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics });
  }
});

// Re-load when refrakt.config.json changes
connection.onDidChangeWatchedFiles(async () => {
  await reinitialize(workspaceRoot);

  // Re-validate all open documents with updated rune set
  for (const doc of documents.all()) {
    const diagnostics = provideDiagnostics(doc);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics });
  }
});

// Completion
connection.onCompletion((params) => {
  return provideCompletion(params, documents);
});

// Hover
connection.onHover((params) => {
  return provideHover(params, documents);
});

// Rune Inspector — custom request
connection.onRequest('refrakt/inspectRune', (params: { uri: string; position: { line: number; character: number } }) => {
  return inspectRuneAtPosition(documents, params.uri, params.position, workspaceRoot);
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
