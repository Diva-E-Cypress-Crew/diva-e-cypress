import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { runOllama } from './ollama-runner';
import { runHuggingface } from './huggingface-runner';
import { Orchestrator } from './orchestrator';
import { CodeLlama } from './codellama';
import {OutputChannel} from "vscode";

const { commands, window } = vscode;

export function activate(context: vscode.ExtensionContext) {
  const outputChannel: OutputChannel = window.createOutputChannel('Ollama');

  //Orchestrator im Context Menu
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

  const disposableCodeLLama = commands.registerCommand(
      'diva-e-cypress.generateCodeLlama',
      async (uri: vscode.Uri) => {
          const featureFile = uri.fsPath.toString();
          outputChannel.clear();
          outputChannel.show();
          await new CodeLlama(featureFile, "https://meag.gitlab.diva-e.com/investmentrechner-2023", outputChannel).run();
          window.showInformationMessage(
              `CodeLLama started`
          );
      }
  );

  // Alle drei Commands beim Deaktivieren abmelden
  context.subscriptions.push(
    disposableOrchestrator
  );
}

export function deactivate() {}
