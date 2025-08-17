import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { runOllama } from './ollama-runner';
import { runHuggingface } from './huggingface-runner';
import { Orchestrator } from './orchestrator';

const { commands, window, workspace } = vscode;
const BASE_URL = 'https://meag.gitlab.diva-e.com/investmentrechner-2023';
//const BASE_URL = 'https://duckduckgo.com/';

export function activate(context: vscode.ExtensionContext) {
  // Gemeinsames Output-Panel
  const outputChannel = window.createOutputChannel('HF/Ollama Output');

  // 1) Befehl für Ollama
  const disposableOllama = commands.registerCommand(
    'diva-e-cypress.generateWithOllama',
    async (uri: vscode.Uri) => {
      const featureFile = uri.fsPath;
      outputChannel.clear();
      outputChannel.show();
      outputChannel.appendLine(`🔍 Starte Ollama run für Feature-Datei: ${featureFile}`);
      try {
        runOllama(outputChannel, featureFile, context);
        outputChannel.appendLine('✅ Ollama run abgeschlossen.');
      } catch (err: any) {
        outputChannel.appendLine(`❌ Ollama run-Fehler: ${err.message}`);
      }
      window.showInformationMessage(
        `✅ Ollama run gestartet – bitte schau ins Output-Panel.`
      );
    }
  );

  // 2) Befehl für Huggingface
  const disposableHF = commands.registerCommand(
    'diva-e-cypress.generateWithHuggingface',
    async (uri: vscode.Uri) => {
      const featureFile = uri.fsPath;
      outputChannel.clear();
      outputChannel.show();
      outputChannel.appendLine(`🔍 Starte Huggingface run für Feature-Datei: ${featureFile}`);
      try {
        runHuggingface(outputChannel, featureFile);
        outputChannel.appendLine('✅ Huggingface run abgeschlossen.');
      } catch (err: any) {
        outputChannel.appendLine(`❌ Huggingface run-Fehler: ${err.message}`);
      }
      window.showInformationMessage(
        `✅ Huggingface run gestartet – bitte schau ins Output-Panel.`
      );
    }
  );

  // 3) Befehl für Orchestrator
  const disposableOrchestrator = commands.registerCommand(
    'diva-e-cypress.generateTest',
    async (uri: vscode.Uri) => {
      const featureFile = uri.fsPath;
      outputChannel.clear();
      outputChannel.show();
      outputChannel.appendLine(`🔍 Starte Orchestrator für Feature-Datei: ${featureFile}`);

      const workspaceRoot = workspace.workspaceFolders?.[0].uri.fsPath ?? '';

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
    disposableOllama,
    disposableHF,
    disposableOrchestrator
  );
}

export function deactivate() {}
