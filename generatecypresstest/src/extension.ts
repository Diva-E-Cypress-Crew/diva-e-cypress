import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { runOllama } from './ollama-runner';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Ollama Output');

  const disposable = vscode.commands.registerCommand('generatecypresstest.generateCypressTest', async (uri: vscode.Uri) => {
    const inputPath = uri.fsPath;
    const cypressRoot = path.dirname(path.dirname(inputPath));
    vscode.window.showInformationMessage(cypressRoot);

    if (!fs.existsSync(cypressRoot)) {
      vscode.window.showErrorMessage("❌ Datei nicht gefunden.");
      return;
    }

    vscode.window.showInformationMessage(`🚀 Starting Ollama`);
    outputChannel.clear();
    outputChannel.show();

    runOllama(outputChannel, cypressRoot);

    vscode.window.showInformationMessage(`✅ Ollama run started — see Output tab.`);
  });

  context.subscriptions.push(disposable);
}


export function deactivate() {}