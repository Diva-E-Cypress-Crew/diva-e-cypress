// src/orchestrator.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import puppeteer from 'puppeteer';

import {ChatOllama} from '@langchain/ollama';

import {StepsPrompt} from '../prompts/steps_instruction';
import {CodeFixPrompt} from "../prompts/code_fix";
import {htmlPreprocessor} from './htmlPreprocessor';
import {SelectorsAgent} from "./agents/selectorsAgent";
import {StepsAgent} from "./agents/stepsAgent";

export class Orchestrator {
  private model: ChatOllama;
  private output: vscode.OutputChannel;

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

    //const codeFixPrompt = new CodeFixPrompt().getPrompt(selectorsTs);
    //selectorsTs = await codeRefactorAgent.invokeCodeRefactor(selectorsTs);

    this.output.appendLine(`📦 Selektoren-Vorschau:\n${selectorsTs}\n…`);
    // Steps erzeugen

    const stepsAgent = new StepsAgent(this.model, this.output);
    let stepsTs = await stepsAgent.generate(feature, htmlForPrompt);




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

  // ───────────────────────────────────────────────────────────────
  // Sanitizer & Validator
  // ───────────────────────────────────────────────────────────────

  private extractFirstCodeBlock(text: string): string | null {
    const m = text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
    return m ? m[1].trim() : null;
  }

  private sanitizeStepsOutput(text: string): string {
    let code = this.extractFirstCodeBlock(text) ?? text;

    const firstImport = code.search(/^\s*import\s+/m);
    if (firstImport > 0) {code = code.slice(firstImport);}

    code = code
      .replace(/\bcy\.visitHomepage\s*\(\s*\)\s*;?/g, 'sel.visitHomepage();')
      .replace(/cy\.get\s*\(\s*sel\./g, 'sel.')
      .replace(/from\s+['"]\.\/orchestrator_selectors['"]/g, "from '../selectors/orchestrator_selectors'")
      .replace(/cy\.url\([^)]*\)\.[^;]+;?/gi, '')
      .replace(/cy\.location\([^)]*\)\.[^;]+;?/gi, '')
      // Scenario Outline: "<...>" → {string} in Step-Patterns
      .replace(
        /(Given|When|Then)\(\s*(['"])([^'"]*?)<[^>]+>([^'"]*?)\2\s*,\s*\(\s*\)\s*=>/g,
        "$1($2$3{string}$4$2, (text) =>"
      )
      .replace(
        /(Given|When|Then)\(\s*(['"])([^'"]*?)<[^>]+>([^'"]*?)\2\s*,\s*\(([^)]*)\)\s*=>/g,
        "$1($2$3{string}$4$2, ($5) =>"
      );

    return code.trim();
  }
}
