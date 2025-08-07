// src/orchestrator.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import puppeteer from 'puppeteer';

import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

import { SelectorsPrompt } from '../prompts/selectors_instruction';
import { StepsPrompt }     from '../prompts/steps_instruction';
import { htmlPreprocessor } from './htmlPreprocessor';

export class Orchestrator {
  private model: ChatOllama;
  private output: vscode.OutputChannel;

  constructor(
    private featureFile: string,
    private baseUrl: string,
    outputChannel: vscode.OutputChannel
  ) {
    this.output = outputChannel;
    // Nimm ein tatsächlich vorhandenes lokales Modell
    this.model  = new ChatOllama({ model: 'llama3.2', temperature: 0 });
  }

  public async run(): Promise<void> {
    this.output.appendLine(`🔍 Starte Orchestrator für: ${this.featureFile}`);

    // 1) Feature einlesen
    const feature = fs.readFileSync(this.featureFile, 'utf-8');
    this.output.appendLine(`🔢 Feature-Länge: ${feature.length} Zeichen`);

    // 2) HTML – tokenarm via Preprocessor, sonst Fallback
    const htmlForPrompt = await this.getHtmlForPrompt();

    // 3) Selektoren erzeugen (getrennt, ohne History)
    const selectorsPrompt = new SelectorsPrompt().getPrompt(feature, htmlForPrompt);
    const selectorsTs = await this.invokeForSelectors(selectorsPrompt);

    // 4) Steps erzeugen (getrennt, ohne History)
    const stepsPrompt = new StepsPrompt().getPrompt(
      feature,
      './orchestrator_selectors',
      selectorsTs
    );
    const stepsTs = await this.invokeForSteps(stepsPrompt);

    // 5) Dateien schreiben (explizit aus Puffern, keine Messages-Indices)
    const dir = path.dirname(this.featureFile);
    const selPath = path.join(dir, 'orchestrator_selectors.ts');
    const stpPath = path.join(dir, 'orchestrator_steps.ts');

    fs.writeFileSync(selPath, selectorsTs, 'utf-8');
    this.output.appendLine(`📄 Selektoren geschrieben: ${selPath}`);

    fs.writeFileSync(stpPath, stepsTs, 'utf-8');
    this.output.appendLine(`📄 Steps geschrieben: ${stpPath}`);
  }

  // ───────────────────────────────────────────────────────────────
  // Modellaufrufe – strikt getrennt, mit Validierung & Retry
  // ───────────────────────────────────────────────────────────────

  private async invokeForSelectors(prompt: string): Promise<string> {
    this.output.appendLine('▶ Erzeuge Selektoren…');
    this.output.appendLine(`🧩 SelectorsPrompt-Länge: ${prompt.length}`);

    let resp = await this.safeInvoke(prompt);
    let code = this.sanitizeSelectorsOutput(resp);
    if (!this.looksLikeSelectors(code)) {
      this.output.appendLine('⚠️ Selektoren sehen ungültig aus – starte erneuten Versuch mit strengerer Instruktion…');
      const retryPrompt = `${prompt}\n\nReturn ONLY TypeScript for Cypress selectors. No prose, no Markdown. Start your file with \`export \`.`;
      resp = await this.safeInvoke(retryPrompt);
      code = this.sanitizeSelectorsOutput(resp);
      if (!this.looksLikeSelectors(code)) {
        this.output.appendLine('❌ Selektoren weiterhin ungültig. Vorschau:');
        this.output.appendLine(code.slice(0, 200));
        throw new Error('Model did not return valid selectors code.');
      }
    }

    this.output.appendLine('✅ Selektoren generiert.');
    this.output.appendLine(`📦 Selektoren-Vorschau:\n${code.slice(0, 300)}\n…`);
    return code;
  }

  private async invokeForSteps(prompt: string): Promise<string> {
    this.output.appendLine('▶ Erzeuge Steps…');
    this.output.appendLine(`🧩 StepsPrompt-Länge: ${prompt.length}`);

    let resp = await this.safeInvoke(prompt);
    let code = this.sanitizeStepsOutput(resp);
    if (!this.looksLikeSteps(code)) {
      this.output.appendLine('⚠️ Steps sehen ungültig aus – starte erneuten Versuch mit strengerer Instruktion…');
      const retryPrompt = `${prompt}\n\nReturn ONLY TypeScript step-definitions. Begin with:\nimport { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';\nimport * as sel from './orchestrator_selectors';`;
      resp = await this.safeInvoke(retryPrompt);
      code = this.sanitizeStepsOutput(resp);
      if (!this.looksLikeSteps(code)) {
        this.output.appendLine('❌ Steps weiterhin ungültig. Vorschau:');
        this.output.appendLine(code.slice(0, 200));
        throw new Error('Model did not return valid step-definition code.');
      }
    }

    this.output.appendLine('✅ Steps generiert.');
    this.output.appendLine(`📦 Steps-Vorschau:\n${code.slice(0, 300)}\n…`);
    return code;
  }

  private async safeInvoke(prompt: string): Promise<string> {
    try {
      const resp = await this.model.invoke([new HumanMessage(prompt)]) as AIMessage;
      return this.unwrapContent(resp.content);
    } catch (err: any) {
      this.output.appendLine(`❌ Modellaufruf fehlgeschlagen: ${err?.message ?? err}`);
      this.output.appendLine('ℹ️ Prüfe: Läuft `ollama serve`? Ist das Modell gepullt (z. B. `ollama run llama3.2`)?');
      throw err;
    }
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

  // ───────────────────────────────────────────────────────────────
  // Sanitizer & Validatoren
  // ───────────────────────────────────────────────────────────────

  private unwrapContent(raw: unknown): string {
    if (Array.isArray(raw)) return raw.map(i => typeof i === 'string' ? i : JSON.stringify(i)).join('');
    if (typeof raw === 'string') return raw;
    try { return JSON.stringify(raw); } catch { return String(raw); }
  }

  private extractFirstCodeBlock(text: string): string | null {
    const m = text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
    return m ? m[1].trim() : null;
  }

  private sanitizeSelectorsOutput(text: string): string {
    let code = this.extractFirstCodeBlock(text) ?? text;
    // alles vor erster export-Zeile abschneiden
    const firstExport = code.search(/^\s*export\s+/m);
    if (firstExport > 0) code = code.slice(firstExport);
    // imports & Kommentare raus
    code = code.split('\n').filter(l => !/^\s*import\s+/.test(l)).join('\n');
    code = code.replace(/^\s*\/\/.*$/gm, '').trim();
    return code;
  }

  private sanitizeStepsOutput(text: string): string {
    let code = this.extractFirstCodeBlock(text) ?? text;
    // falls Prosa davor, ab erster import-Zeile schneiden
    const firstImport = code.search(/^\s*import\s+/m);
    if (firstImport > 0) code = code.slice(firstImport);
    return code.trim();
  }

  private looksLikeSelectors(code: string): boolean {
    const hasExport = /(^|\n)\s*export\s+/.test(code);
    const hasNoGWT  = !/(^|\n)\s*import\s+.*Given.*When.*Then/.test(code);
    return hasExport && hasNoGWT;
  }

  private looksLikeSteps(code: string): boolean {
    const hasImportGWT = /(^|\n)\s*import\s+{?\s*Given\s*,\s*When\s*,\s*Then\s*}?/.test(code);
    const refersSel    = /(^|\n)\s*import\s+\*\s+as\s+sel\s+from\s+'\.\/orchestrator_selectors'/.test(code);
    return hasImportGWT && refersSel;
  }
}
