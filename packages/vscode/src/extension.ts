import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';
import { RuneInspectorProvider } from './inspector';

let client: LanguageClient;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export function activate(context: vscode.ExtensionContext) {
  const serverModule = path.join(__dirname, 'server.js');

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: { module: serverModule, transport: TransportKind.stdio },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'markdown' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.md'),
    },
  };

  client = new LanguageClient(
    'refrakt-language-server',
    'refrakt.md Language Server',
    serverOptions,
    clientOptions,
  );

  // Rune Inspector tree view
  const inspectorProvider = new RuneInspectorProvider();
  const treeView = vscode.window.createTreeView('refraktRuneInspector', {
    treeDataProvider: inspectorProvider,
  });
  context.subscriptions.push(treeView);

  // Request rune inspection from the language server
  function requestInspection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      inspectorProvider.refresh(null);
      return;
    }

    const uri = editor.document.uri.toString();
    const position = editor.selection.active;

    client.sendRequest('refrakt/inspectRune', {
      uri,
      position: { line: position.line, character: position.character },
    }).then(
      (result) => inspectorProvider.refresh(result as any),
      () => inspectorProvider.refresh(null),
    );
  }

  // Debounced cursor change handler
  function onCursorChange() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(requestInspection, 300);
  }

  // Wire up after client is ready
  client.start().then(() => {
    context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(onCursorChange),
      vscode.window.onDidChangeActiveTextEditor(onCursorChange),
    );

    // Initial inspection
    requestInspection();
  });

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('refrakt.inspectRune', requestInspection),
    vscode.commands.registerCommand('refrakt.copyInspectorNode', (node) => {
      if (node) {
        const json = inspectorProvider.getNodeJson(node);
        vscode.env.clipboard.writeText(json);
      }
    }),
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!client) return undefined;
  return client.stop();
}