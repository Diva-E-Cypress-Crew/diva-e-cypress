/**
 * Einstiegspunkt der VS Code Extension für die KI-gestützte Cypress-Testgenerierung.
 *
 * Verantwortlich für:
 * - Laden der Umgebungsvariablen (.env),
 * - Registrieren des Orchestrator-Commands,
 * - Bereitstellen eines gemeinsamen Output-Panels,
 * - Starten des End-to-End-Prozesses (gesteuert vom {@link Orchestrator}).
 *
 * Der eigentliche Ablauf (HTML-Snapshot → Selectors → Refactor → Steps → Dateischreiben)
 * ist in {@link Orchestrator} implementiert; diese Datei bildet die dünne Brücke
 * zwischen VS-Code-UI (Command) und der Orchestrierungslogik.
 */
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';

// Configure dotenv with explicit path handling
try {
  dotenv.config({ path: process.cwd() + '/.env' });
} catch (error) {
  console.log('No .env file found, continuing without it');
}

// Import orchestrator after dotenv setup
let Orchestrator: any;
try {
  const orchestratorModule = require('./orchestrator');
  Orchestrator = orchestratorModule.Orchestrator;
  console.log('🚀 DIVA-E-CYPRESS: Orchestrator imported successfully');
} catch (error) {
  console.error('🚀 DIVA-E-CYPRESS: Failed to import Orchestrator:', error);
}

const { commands, window, workspace } = vscode;

/**
 * Fallback-Basis-URL für den HTML-Snapshot.
 * Die finale URL kann im Orchestrator dynamisch überschrieben werden
 * (z. B. wenn die Feature-Datei eine URL vorgibt).
 *
 * @default "https://meag.gitlab.diva-e.com/investmentrechner-2023"
 */
const BASE_URL = 'https://meag.gitlab.diva-e.com/investmentrechner-2023';

// noinspection JSUnusedGlobalSymbols
/**
 * Aktiviert die Extension und registriert den Befehl zur Testgenerierung.
 *
 * Ablauf:
 * 1) Output-Panel anlegen (zentrale Log-Sammelstelle für Agents/Modelle).
 * 2) Command `diva-e-cypress.generateTest` registrieren (siehe `package.json`).
 * 3) Beim Aufruf:
 *    - Feature-Dateipfad aus dem Kontext übernehmen,
 *    - Output-Panel leeren/anzeigen und Status loggen,
 *    - Workspace-Root bestimmen (für Dateipfade),
 *    - {@link Orchestrator} mit `featureFile`, `BASE_URL`, `outputChannel` instanziieren,
 *    - `orchestrator.run()` ausführen und Ergebnis/Fehler ins Panel schreiben,
 *    - eine kurze Info-Notification anzeigen.
 *
 * @param context Von VS Code bereitgestellter Extension-Kontext (Disposables/Subscriptions).
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 DIVA-E-CYPRESS: Extension is activating...');
  
  // Gemeinsames Output-Panel
  const outputChannel = window.createOutputChannel('Cypress Test Generator');
  
  console.log('🚀 DIVA-E-CYPRESS: About to register command...');

  // Orchestrator
  const disposableOrchestrator = commands.registerCommand(
    'diva-e-cypress.generateTest',
    async (uri: vscode.Uri) => {
      console.log('🚀 DIVA-E-CYPRESS: Command executed!', uri.fsPath);
      
      const featureFile = uri.fsPath;
      outputChannel.clear();
      outputChannel.show();
      outputChannel.appendLine(`🔍 Starte Orchestrator für Feature-Datei: ${featureFile}`);

      const workspaceRoot = workspace.workspaceFolders?.[0]?.uri?.fsPath || '';
      if (workspaceRoot) {
        outputChannel.appendLine(`📁 Workspace: ${workspaceRoot}`);
      } else {
        outputChannel.appendLine('⚠️ No workspace found');
      }

      try {
        if (!Orchestrator) {
          throw new Error('Orchestrator class not available');
        }
        
        const orchestrator = new Orchestrator(
          featureFile,
          BASE_URL,
          outputChannel
        );
        await orchestrator.run();
        outputChannel.appendLine('✅ Orchestrator-Durchlauf abgeschlossen.');
      } catch (err: any) {
        outputChannel.appendLine(`❌ Orchestrator-Fehler: ${err.message}`);
      }

      // Kurzes Nutzer-Feedback; Detail-Logs stehen im Output-Panel.
      window.showInformationMessage(
        `✅ Orchestrator run gestartet – bitte schau ins Output-Panel.`
      );
    }
  );

  // Alle drei Commands beim Deaktivieren abmelden
  context.subscriptions.push(
    disposableOrchestrator
  );
  
  console.log('🚀 DIVA-E-CYPRESS: Extension activated successfully!');
  outputChannel.appendLine('🚀 DIVA-E-CYPRESS: Extension loaded and ready!');
}

// noinspection JSUnusedGlobalSymbols
/**
 * Optionaler Cleanup-Hook beim Deaktivieren der Extension.
 * Aktuell leer – Disposables werden über `context.subscriptions` entsorgt.
 */
export function deactivate() {
  console.log('🚀 DIVA-E-CYPRESS: Extension deactivated');
}