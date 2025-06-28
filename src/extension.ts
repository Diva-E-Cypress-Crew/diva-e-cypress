import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { runOllama } from './ollama-runner';
import { runHuggingface } from './huggingface-runner';
import { Orchestrator } from './orchestrator';

const { commands, window } = vscode;

export function activate(context: vscode.ExtensionContext) {
  // Gemeinsames Output-Panel
  const outputChannel = window.createOutputChannel('HF/Ollama Output');

  // 1) Befehl für Ollama
  const disposableOllama = commands.registerCommand(
    'diva-e-cypress.generateWithOllama',
    async (uri: vscode.Uri) => {
      const featureFile = uri.fsPath.toString();
      outputChannel.clear();
      outputChannel.show();
      runOllama(outputChannel, featureFile, context);
      window.showInformationMessage(
        `✅ Ollama run gestartet – bitte schau ins Output-Panel.`
      );
    }
  );

  // 2) Befehl für Huggingface
  const disposableHF = commands.registerCommand(
    'diva-e-cypress.generateWithHuggingface',
    async (uri: vscode.Uri) => {
      const featureFile = uri.fsPath.toString();
      outputChannel.clear();
      outputChannel.show();
      runHuggingface(outputChannel, featureFile);
      window.showInformationMessage(
        `✅ Huggingface run gestartet – bitte schau ins Output-Panel.`
      );
    }
  );

  // 3) Befehl für Orchestrator
  const disposableOrchestrator = commands.registerCommand(
    'diva-e-cypress.generateTest',
    async (uri: vscode.Uri) => {
      const featureFile = uri.fsPath.toString();
      outputChannel.clear();
      outputChannel.show();
      // Orchestrator schreibt intern ebenfalls in sein eigenes Panel,
      // aber hier nutzen wir erst mal das gleiche Output-Channel
      await new Orchestrator(featureFile, "https://meag.gitlab.diva-e.com/investmentrechner-2023").run();
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
