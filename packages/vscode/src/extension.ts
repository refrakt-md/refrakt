import * as path from 'path';
import { workspace, type ExtensionContext } from 'vscode';
import {
  LanguageClient,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(_context: ExtensionContext) {
  // __dirname resolves symlinks, so this works when the extension is
  // symlinked from ~/.vscode/extensions/ into the monorepo.
  const serverModule = path.resolve(__dirname, '..', '..', 'language-server', 'dist', 'server.js');

  const serverOptions: ServerOptions = {
    run: {
      command: 'node',
      args: ['--experimental-vm-modules', serverModule, '--stdio'],
      transport: TransportKind.stdio,
    },
    debug: {
      command: 'node',
      args: ['--experimental-vm-modules', serverModule, '--stdio'],
      transport: TransportKind.stdio,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'markdown' }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.md'),
    },
  };

  client = new LanguageClient(
    'refrakt-language-server',
    'refrakt.md Language Server',
    serverOptions,
    clientOptions,
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}