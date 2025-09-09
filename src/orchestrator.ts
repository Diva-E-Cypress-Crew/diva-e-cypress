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

export class Orchestrator {
  private readonly model: ChatOllama;
  private readonly output: vscode.OutputChannel;

  constructor(
    private featureFile: string,
    private baseUrl: string,
    outputChannel: vscode.OutputChannel
  ) {
    this.output = outputChannel;
    this.model  = new ChatOllama({ model: 'llama3.2', temperature: 0 });
  }



  public async run(): Promise<void> {
    this.output.appendLine(`🔍 Starte Orchestrator für: ${this.featureFile}`);

    const feature = fs.readFileSync(this.featureFile, 'utf-8');
    this.output.appendLine(`🔢 Feature-Länge: ${feature.length} Zeichen`);

    const htmlForPrompt = await this.getHtmlForPrompt();

    // Selektoren erzeugen
    const selectorsAgent = new SelectorsAgent(this.model, this.output);
    let selectorsTs = await selectorsAgent.generate(feature, htmlForPrompt);
    const codeRefactorAgent = new RefactorAgent(this.model, this.output);

    selectorsTs = await codeRefactorAgent.generate(selectorsTs);

    this.output.appendLine(`📦 Selektoren-Vorschau:\n${selectorsTs}\n…`);


    // Steps erzeugen

    let tempStepsTs = generateStepDefinitions(this.featureFile);

    const stepsAgent = new StepsAgent(this.model, this.output);
    let stepsTs = await stepsAgent.generate(feature, selectorsTs, tempStepsTs);


    // Dateien schreiben (common/selectors + common/steps)
    const featureDir   = path.dirname(this.featureFile);
    const commonDir    = path.resolve(featureDir, '..', 'common');
    const selectorsDir = path.join(commonDir, 'selectors');
    const stepsDir     = path.join(commonDir, 'steps');

    fs.mkdirSync(selectorsDir, { recursive: true });
    fs.mkdirSync(stepsDir, { recursive: true });

    const selPath = path.join(selectorsDir, 'orchestrator_selectors.ts');
    const stpPath = path.join(stepsDir,     'orchestrator_steps.ts');

    fs.writeFileSync(selPath, selectorsTs, 'utf-8');
    this.output.appendLine(`📄 Selektoren geschrieben: ${selPath}`);

    fs.writeFileSync(stpPath, stepsTs, 'utf-8');
    this.output.appendLine(`📄 Steps geschrieben: ${stpPath}`);
  }

  // ───────────────────────────────────────────────────────────────
  // HTML besorgen
  // ───────────────────────────────────────────────────────────────

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
