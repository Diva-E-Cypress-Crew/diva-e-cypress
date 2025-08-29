import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
dotenv.config();

import { Orchestrator } from './orchestrator';

const { commands, window, workspace } = vscode;
const BASE_URL = 'https://meag.gitlab.diva-e.com/investmentrechner-2023';
//const BASE_URL = 'https://duckduckgo.com/';

// noinspection JSUnusedGlobalSymbols
export function activate(context: vscode.ExtensionContext) {
  // Gemeinsames Output-Panel
  const outputChannel = window.createOutputChannel('HF/Ollama Output');

  // Orchestrator
  const disposableOrchestrator = commands.registerCommand(
    'diva-e-cypress.generateTest',
    async (uri: vscode.Uri) => {
      const featureFile = uri.fsPath;
      outputChannel.clear();
      outputChannel.show();
      outputChannel.appendLine(`🔍 Starte Orchestrator für Feature-Datei: ${featureFile}`);

      const workspaceRoot = workspace.workspaceFolders?.[0].uri.fsPath ?? '';
        outputChannel.appendLine(workspaceRoot);


      try {
        const orchestrator = new Orchestrator(
          featureFile,
          BASE_URL,
          outputChannel,

        );
        await orchestrator.run();
        outputChannel.appendLine('✅ Orchestrator-Durchlauf abgeschlossen.');
      } catch (err: any) {
        outputChannel.appendLine(`❌ Orchestrator-Fehler: ${err.message}`);
      }

      window.showInformationMessage(
        `✅ Orchestrator run gestartet – bitte schau ins Output-Panel.`
      );
    }
  );

  // Alle drei Commands beim Deaktivieren abmelden
  context.subscriptions.push(
    disposableOrchestrator
  );
}

// noinspection JSUnusedGlobalSymbols
export function deactivate() {}
