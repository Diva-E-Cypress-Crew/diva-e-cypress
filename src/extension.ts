import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';
dotenv.config();

import { runOllama } from './ollama-runner';
import { runHuggingface } from './huggingface-runner';


export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('HF/Ollama Output');

  // 1) Befehl für Ollama
  const disposableOllama = vscode.commands.registerCommand(
    'diva-e-cypress.generateWithOllama',
    async (uri: vscode.Uri) => {
      const projectRoot = path.dirname(path.dirname(uri.fsPath));
      outputChannel.clear();
      outputChannel.show();
      runOllama(outputChannel, projectRoot);
      vscode.window.showInformationMessage(`✅ Ollama run gestartet – bitte schau ins Output-Panel.`);
    }
  );

  // 2) Neuer Befehl für Huggingface
  const disposableHF = vscode.commands.registerCommand(
    'diva-e-cypress.generateWithHuggingface',
    async (uri: vscode.Uri) => {
      const projectRoot = path.dirname(path.dirname(uri.fsPath));
      outputChannel.clear();
      outputChannel.show();
      runHuggingface(outputChannel, projectRoot);
      vscode.window.showInformationMessage(`✅ Huggingface Run gestartet – bitte schau ins Output-Panel.`);
    }
  );

  context.subscriptions.push(disposableOllama, disposableHF);
}

export function deactivate() {}