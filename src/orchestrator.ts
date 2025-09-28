// src/orchestrator.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import puppeteer from 'puppeteer';

import {ChatOllama} from '@langchain/ollama';

import {htmlPreprocessor} from './htmlPreprocessor';
import {SelectorsAgent} from "./agents/selectorsAgent";
import {StepsAgent} from "./agents/stepsAgent";
import {RefactorAgent} from "./agents/codeRefactorAgent";
import {generateStepDefinitions} from "./stepsGenerator";
import {switchUrl} from "./switchUrl";

/**
 * Herzstück der Generierungspipeline:
 *
 * Orchestriert den kompletten **E2E-Flow** von
 * 1) URL/Config-Aktualisierung (optional, aus der Feature-Datei),
 * 2) HTML-Beschaffung (präferiert gefiltertes DOM),
 * 3) **Selectors**-Generierung (und striktes Refactoring zu reinem TS),
 * 4) **Steps**-Erzeugung (Skelett → finaler TS),
 * 5) Persistierung der Artefakte in `common/selectors` und `common/steps`.
 *
 * Architekturgedanke:
 * - **Single entry point** für UI/Command-Aufrufe (siehe `extension.ts`),
 * - **klare Agent-Rollen** (Selectors/Refactor/Steps) mit konsistentem Logging,
 * - **robuste Fallbacks** (z. B. HTML-Vollinhalt, falls Preprocessing scheitert).
 */
export class Orchestrator {
  /**
   * Vorbereitete Chat-Instanz (LLM) für alle nachgelagerten Agenten.
   * Wird im Konstruktor mit einem deterministischen Setup initialisiert.
   */
  private readonly model: ChatOllama;

  /**
   * Gemeinsamer Ausgabekanal, in den alle Schritte des Orchestrators loggen.
   */
  private readonly output: vscode.OutputChannel;

  /**
   * @param featureFile Vollständiger Pfad zur `.feature`-Datei.
   * @param baseUrl     Basis-URL (Fallback). Kann durch {@link switchUrl} aus dem Feature überschrieben werden.
   * @param outputChannel Gemeinsames VS-Code-Output-Panel für Status/Fehler/Previews.
   */
  constructor(
    private featureFile: string,
    private baseUrl: string,
    outputChannel: vscode.OutputChannel
  ) {
    this.output = outputChannel;
    // Deterministisches Modell-Setup: kleines, schnelles Modell + Temperatur 0
    this.model  = new ChatOllama({ model: 'llama3.2', temperature: 0 });
  }

  /**
   * Startet den **End-to-End-Durchlauf**:
   *
   * Ablauf im Detail:
   * - **(1) URL aus Feature lesen**: Wenn in Zeile 1 `# url: …` vorhanden,
   *   wird `cypress.config.ts > baseUrl` aktualisiert und `this.baseUrl` überschrieben.
   * - **(2) Feature lesen** (Längenlog) und **HTML-Kontext** beschaffen
   *   (präferiert gefiltertes DOM via {@link htmlPreprocessor}, sonst Voll-HTML).
   * - **(3) Selectors** generieren ( {@link SelectorsAgent} ), anschließend via
   *   {@link RefactorAgent} zu strengem TS ohne Markdown/Kommentare säubern.
   * - **(4) Steps**: Zuerst Skelett aus der Feature-Datei ({@link generateStepDefinitions}),
   *   dann mit {@link StepsAgent} konkretisieren (exakte Step-Texte, Mapping-Regeln).
   * - **(5) Artefakte schreiben** unter `…/common/selectors` und `…/common/steps`.
   *
   * Alle Teilschritte loggen in das Output-Panel; Fehler werden gefangen und dort ausgegeben.
   */
  public async run(): Promise<void> {
    // this.output.appendLine(`🔍 Starte Orchestrator für: ${this.featureFile}`);

    // (1) Optional: URL aus Feature übernehmen und in cypress.config.ts schreiben
    const newUrl = switchUrl(this.featureFile, this.output);

    if (newUrl) {
      this.baseUrl = newUrl;
    }

    this.output.appendLine(`🔍 URL: ${this.baseUrl}`);

    // (2) Feature einlesen & HTML-Kontext besorgen
    const feature = fs.readFileSync(this.featureFile, 'utf-8');
    this.output.appendLine(`🔢 Feature-Länge: ${feature.length} Zeichen`);

    const htmlForPrompt = await this.getHtmlForPrompt();

    // (3) Selektoren erzeugen
    const selectorsAgent = new SelectorsAgent(this.model, this.output);
    let selectorsTs = await selectorsAgent.generate(feature, htmlForPrompt);
    const codeRefactorAgent = new RefactorAgent(this.model, this.output);

    // Striktes Cleanup: reiner, kompilierbarer TypeScript-Code
    selectorsTs = await codeRefactorAgent.generate(selectorsTs);

    // this.output.appendLine(`📦 Selektoren-Vorschau:\n${selectorsTs}\n…`);

    // (4) Steps erzeugen

    // Skelett aus Feature-Zeilen (Given/When/Then/And/But)
    let tempStepsTs = generateStepDefinitions(this.featureFile);

    // Konkrete Implementierung basierend auf Mapping-Regeln/Selectors
    const stepsAgent = new StepsAgent(this.model, this.output);
    let stepsTs = await stepsAgent.generate(feature, selectorsTs, tempStepsTs);

    // (5) Dateien schreiben (common/selectors + common/steps)
    const featureDir   = path.dirname(this.featureFile);
    const commonDir    = path.resolve(featureDir, '..', 'common');
    const selectorsDir = path.join(commonDir, 'selectors');
    const stepsDir     = path.join(commonDir, 'steps');

    fs.mkdirSync(selectorsDir, { recursive: true });
    fs.mkdirSync(stepsDir, { recursive: true });

    const selPath = path.join(selectorsDir, 'orchestrator_selectors.ts');
    const stpPath = path.join(stepsDir,     'orchestrator_steps.ts');
    const stpTempPath = path.join(stepsDir,     'orchestrator_steps_temp.ts');

    fs.writeFileSync(selPath, selectorsTs, 'utf-8');
    this.output.appendLine(`📄 Selektoren geschrieben: ${selPath}`);

    fs.writeFileSync(stpPath, stepsTs, 'utf-8');
    fs.writeFileSync(stpPath, stepsTs, 'utf-8'); // (aktuell doppelt geschrieben)

    // Optional: temporäre Steps-Datei ausgeben, falls benötigt
    // fs.writeFileSync(stpTempPath, tempStepsTs, 'utf-8');

    this.output.appendLine(`📄 Steps geschrieben: ${stpPath}`);
  }

  // ───────────────────────────────────────────────────────────────
  // HTML besorgen
  // ───────────────────────────────────────────────────────────────

  /**
   * Liefert den **HTML-Kontext** für die LLM-Prompts.
   *
   * Strategie:
   * 1) Versuche ein **gefiltertes, textzentriertes DOM** mit {@link htmlPreprocessor} zu erzeugen:
   *    - entfernt „leere“ Strukturknoten,
   *    - behält Tags, `id`, `class`, **direkten Text** und textführende Kinder,
   *    - reduziert Prompt-Rauschen und fokussiert auf sichtbaren Inhalt.
   * 2) Fallback: Falls das Preprocessing scheitert, wird per Puppeteer das **Voll-HTML**
   *    (`page.content()`) geladen und zurückgegeben.
   *
   * Beide Wege loggen die HTML-Länge zur Nachvollziehbarkeit.
   *
   * @returns Minimales HTML (bevorzugt) oder Voll-HTML als String.
   * @private
   */
  private async getHtmlForPrompt(): Promise<string> {
    try {
      const extractor = new htmlPreprocessor();
      const dom = await extractor.extractFilteredDOM(this.baseUrl);
      const html = await extractor.generateHTML(dom);
      this.output.appendLine(`✅ Gefiltertes HTML erzeugt (Länge: ${html.length})`);
      return html;
    } catch (e: any) {
      this.output.appendLine(`⚠️ htmlPreprocessor fehlgeschlagen (${e?.message ?? e}) – hole Voll-HTML.`);
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      await page.waitForSelector('body');
      const html = await page.content();
      await browser.close();
      this.output.appendLine(`✅ Vollständiges HTML geholt (Länge: ${html.length})`);
      return html;
    }
  }
}
