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
    this.model  = new ChatOllama({ model: 'llama3.2', temperature: 0 });
  }

  public async run(): Promise<void> {
    this.output.appendLine(`🔍 Starte Orchestrator für: ${this.featureFile}`);

    const feature = fs.readFileSync(this.featureFile, 'utf-8');
    this.output.appendLine(`🔢 Feature-Länge: ${feature.length} Zeichen`);

    const htmlForPrompt = await this.getHtmlForPrompt();

    // Selektoren erzeugen
    const selectorsPrompt = new SelectorsPrompt().getPrompt(feature, htmlForPrompt);
    const selectorsTs = await this.invokeForSelectors(selectorsPrompt);

    // Steps erzeugen
    const stepsPrompt = new StepsPrompt().getPrompt(
      feature,
      '../selectors/orchestrator_selectors',
      selectorsTs
    );
    const stepsTs = await this.invokeForSteps(stepsPrompt, feature);

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
  // Modellaufrufe – strikt getrennt, mit Validierung & Retry
  // ───────────────────────────────────────────────────────────────

  private async invokeForSelectors(prompt: string): Promise<string> {
    this.output.appendLine('▶ Erzeuge Selektoren…');
    this.output.appendLine(`🧩 SelectorsPrompt-Länge: ${prompt.length}`);

    let resp = await this.safeInvoke(prompt);
    let code = this.sanitizeSelectorsOutput(resp);

    if (!this.looksLikeSelectors(code)) {
      this.output.appendLine('⚠️ Selektoren ungültig – versuche strengere Instruktion…');
      const retryPrompt = `${prompt}\n\nReturn ONLY TypeScript for Cypress selectors. No prose, no Markdown. Start your file with \`export \`.`;
      resp = await this.safeInvoke(retryPrompt);
      code = this.sanitizeSelectorsOutput(resp);
    }

    // Auto-Repair (robuste Helfer + kaputte name-Selectoren fixen + *Input() entfernen)
    code = this.autoFixSelectors(code);

    if (!this.looksLikeSelectors(code)) {
      this.output.appendLine('❌ Selektoren weiterhin ungültig. Vorschau:');
      this.output.appendLine(code.slice(0, 300));
      throw new Error('Model did not return valid selectors code.');
    }

    this.output.appendLine('✅ Selektoren generiert.');
    this.output.appendLine(`📦 Selektoren-Vorschau:\n${code.slice(0, 300)}\n…`);
    return code;
  }

  private async invokeForSteps(prompt: string, feature: string): Promise<string> {
    this.output.appendLine('▶ Erzeuge Steps…');
    this.output.appendLine(`🧩 StepsPrompt-Länge: ${prompt.length}`);

    let resp = await this.safeInvoke(prompt);
    let code = this.sanitizeStepsOutput(resp);

    if (!this.looksLikeSteps(code)) {
      this.output.appendLine('⚠️ Steps ungültig – versuche strengere Instruktion…');
      const retryPrompt = `${prompt}\n\nReturn ONLY TypeScript step-definitions. Begin with:
      import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
      import * as sel from '../selectors/orchestrator_selectors';`;
      resp = await this.safeInvoke(retryPrompt);
      code = this.sanitizeStepsOutput(resp);
    }

    // Universelle Regex-Steps injizieren (falls fehlen)
    code = this.ensureUniversalSteps(code);

    // String-basierte Steps auf das Feature runterfiltern (Regex-Steps immer behalten)
    code = this.filterStepsToFeature(code, feature);

    if (!this.looksLikeSteps(code)) {
      this.output.appendLine('❌ Steps nach Filterung ungültig. Vorschau:');
      this.output.appendLine(code.slice(0, 300));
      throw new Error('Post-filter step-definition code not valid.');
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
    const firstExport = code.search(/^\s*export\s+/m);
    if (firstExport > 0) code = code.slice(firstExport);
    code = code.split('\n').filter(l => !/^\s*import\s+/.test(l)).join('\n');
    code = code.replace(/^\s*\/\/.*$/gm, '').trim();
    return code;
  }

  private sanitizeStepsOutput(text: string): string {
    let code = this.extractFirstCodeBlock(text) ?? text;

    const firstImport = code.search(/^\s*import\s+/m);
    if (firstImport > 0) code = code.slice(firstImport);

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

  private ensureUniversalSteps(code: string): string {
    if (!/from\s+['"]@badeball\/cypress-cucumber-preprocessor['"]/.test(code)) {
      code = `import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';\n` + code;
    }
    if (!/import\s+\*\s+as\s+sel\s+from\s+'\.\.\/selectors\/orchestrator_selectors'/.test(code)) {
      code = code.replace(
        /import\s+\*\s+as\s+sel\s+from\s+['"][^'"]+['"];/,
        "import * as sel from '../selectors/orchestrator_selectors';"
      );
      if (!/import\s+\*\s+as\s+sel\s+from\s+'\.\.\/selectors\/orchestrator_selectors'/.test(code)) {
        code = `import * as sel from '../selectors/orchestrator_selectors';\n` + code;
      }
    }

    const haveClicks = /When\(\s*\/\^.*clicks/i.test(code);
    const haveShown  = /Then\(\s*\/\^\(\?:the \)\?.+ should be (?:shown|visible)/i.test(code);
    const haveChange = /When\(\s*\/\^he changes the/i.test(code);
    const haveHome   = /Given\(\s*\/\^the Customer is on the homepage/i.test(code);

    const universal = `
Given(/^the Customer is on the homepage$/i, () => {
  return sel.visitHomepage();
});

When(/^he clicks\\s+"?(.+?)"?$/i, (label: string) => {
  return sel.clickLabel(label);
});

Then(/^(?:the )?(.+?) should be (?:shown|visible)$/i, (text: string) => {
  return sel.getHeading(text)
    .then($h => $h && ($h as any).length ? cy.wrap($h) : sel.getLabel(text))
    .should('be.visible');
});

When(/^he changes the\\s+(.+?)\\s+"?(.+?)"?$/i, (field: string, value: string) => {
  return sel.inputByLabel(field).clear().type(value);
});

Then(/^a changed\\s+(.+?)\\s+should be shown\\s+"?(.+?)"?$/i, (_field: string, value: string) => {
  return sel.getLabel(value).should('be.visible');
});
`.trim();

    const importEnd = code.match(/^(?:import[\s\S]*?\n)+/);
    const head = importEnd ? importEnd[0] : '';
    const body = code.slice(head.length);

    const blocks = universal.split('\n\n');
    const inject =
      (haveHome  ? '' : `\n${blocks[0]}\n`) +
      (haveClicks? '' : `\n${blocks[1]}\n`) +
      (haveShown ? '' : `\n${blocks[2]}\n`) +
      (haveChange? '' : `\n${blocks[3]}\n`) +
      ( /Then\(\s*\/\^a changed/i.test(code) ? '' : `\n${blocks[4]}\n` );

    return head + inject.trim() + '\n' + body.trim();
  }

  private filterStepsToFeature(code: string, feature: string): string {
    const norm = (s: string) =>
      s.replace(/"<[^"]+>"/g, '"{string}"')
       .replace(/<[^>]+>/g, '{string}')
       .replace(/\s+/g, ' ')
       .toLowerCase()
       .trim();

    const featureLines = feature.split(/\r?\n/).map(norm);

    const headerMatch = code.match(/^[\s\S]*?(?=(?:\bGiven\b|\bWhen\b|\bThen\b)\s*\()/);
    const header = headerMatch ? headerMatch[0] : '';

    const kept: string[] = [];

    // Regex-basierte Steps IMMER behalten
    const reBlockRegex =
      /(Given|When|Then|And|But)\(\s*\/[\s\S]*?\/[a-z]*\s*,\s*\((?:[^)]*)\)\s*=>\s*\{[\s\S]*?\}\s*\);/gi;
    let m: RegExpExecArray | null;
    while ((m = reBlockRegex.exec(code)) !== null) kept.push(m[0]);

    const hasUniversalClick   = kept.some(s => /When\(\s*\/\^.*clicks/i.test(s));
    const hasUniversalShown   = kept.some(s => /Then\(\s*\/\^\(\?:the \)\?.+ should be (?:shown|visible)/i.test(s));
    const hasUniversalHome    = kept.some(s => /Given\(\s*\/\^the Customer is on the homepage/i.test(s));
    const hasUniversalChange  = kept.some(s => /When\(\s*\/\^he changes the/i.test(s));

    const isCoveredByUniversal = (p: string) =>
         (hasUniversalHome   && /^the customer is on the homepage\b/.test(p))
      || (hasUniversalClick  && /^he clicks\b/.test(p))
      || (hasUniversalShown  && /^the .+ should be (shown|visible)\b/.test(p))
      || (hasUniversalChange && /^he changes the\b/.test(p))
      || (hasUniversalShown  && /^a changed .+ should be shown\b/.test(p));

    // String-basierte Steps nur behalten, wenn im Feature vorhanden UND
    // nicht durch Universal-Regex bereits abgedeckt
    const reBlockStr =
      /(Given|When|Then|And|But)\(\s*(['"])(.*?)\2\s*,\s*\((?:[^)]*)\)\s*=>\s*\{[\s\S]*?\}\s*\);/gi;

    while ((m = reBlockStr.exec(code)) !== null) {
      const raw  = m[3];
      const pat  = norm(raw);
      if (isCoveredByUniversal(pat)) continue;
      let keep = featureLines.some(line => line.includes(pat));
      if (!keep) {
        const idx = pat.indexOf('{string}');
        if (idx !== -1) {
          const prefix = pat.slice(0, idx).trim();
          keep = !!prefix && featureLines.some(line => line.startsWith(prefix));
        }
      }
      if (keep) kept.push(m[0]);
    }

    return (header + '\n' + kept.join('\n')).trim();
  }

  private autoFixSelectors(code: string): string {
    let out = code;

    // export const 'css' → function() { return cy.get('css'); }
    out = out.replace(
      /export\s+const\s+([A-Za-z0-9_$\u00C0-\u024F]+)\s*=\s*['"`]([^'"`]+)['"`]\s*;?/g,
      (_m, name, css) => `export function ${name}() { return cy.get('${css}'); }`
    );

    // Pflicht-Helper sicherstellen / verbessern
    if (!/export\s+function\s+visitHomepage\s*\(/.test(out)) {
      out = `export function visitHomepage() { return cy.visit('/'); }\n` + out;
    }
    if (!/export\s+function\s+clickLabel\s*\(/.test(out)) {
      out =
`export function clickLabel(label: string) {
  const parts = String(label).split(/\\s+(?:and|und)\\s+|,\\s*/i).map(s => s.trim()).filter(Boolean);
  let chain = cy.wrap(null);
  parts.forEach(p => { chain = chain.then(() => cy.contains(String(p)).click({ force: true })); });
  return chain;
}
` + out;
    } else {
      out = out.replace(
        /export function clickLabel\([^)]+\)\s*\{[\s\S]*?\}\s*/m,
`export function clickLabel(label: string) {
  const parts = String(label).split(/\\s+(?:and|und)\\s+|,\\s*/i).map(s => s.trim()).filter(Boolean);
  let chain = cy.wrap(null);
  parts.forEach(p => { chain = chain.then(() => cy.contains(String(p)).click({ force: true })); });
  return chain;
}`
      );
    }
    if (!/export\s+function\s+getLabel\s*\(\s*label:/.test(out)) {
      out = `export function getLabel(label: string) { return cy.contains(':visible', String(label)); }\n` + out;
    } else {
      out = out.replace(
        /export function getLabel\(label: string\)\s*\{\s*return cy\.contains\(\s*String\(label\)\s*\);\s*\}/,
        "export function getLabel(label: string) { return cy.contains(':visible', String(label)); }"
      );
    }
    if (!/export\s+function\s+getHeading\s*\(/.test(out)) {
      out = `export function getHeading(label: string) { return cy.contains('h1:visible, h2:visible, [role=\"heading\"]:visible', String(label)); }\n` + out;
    }

    // Robustes Eingabefeld über zugehöriges Label
    if (!/export\s+function\s+inputByLabel\s*\(/.test(out)) {
      out =
`export function inputByLabel(label: string) {
  const text = String(label);
  return cy.contains('label', text).then($l => {
    const id = $l.attr('for');
    if (id) return cy.get('#' + id);
    const $input = $l.closest('form, *').find('input, textarea, [contenteditable="true"]').first();
    if ($input && $input.length) return cy.wrap($input);
    return cy.contains(':visible', text).parents().find('input, textarea, [contenteditable="true"]').first();
  });
}
` + out;
    }

    // Reparatur zerbrochener "name"-Selektoren (seltene LLM-Artefakte)
    out = out.replace(
      /return\s+cy\.get\('([^']*\[name=)'\)\s*;\s*\}?\s*['"]([^'"]+)['"]\s*;?/g,
      (_m, pre, attr) => `return cy.get('${pre}"${attr}"]');`
    );
    out = out.replace(
      /(\)\s*;)\s*['"][^'"]+['"]\s*;?/g,
      '$1'
    );

    // *Input()-Selektoren komplett entfernen – wir nutzen inputByLabel()
    out = out.replace(/export function\s+[A-Za-z0-9_]+Input\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/g, '');

    return out.trim();
  }

  private looksLikeSelectors(code: string): boolean {
    const hasExportFunction = /(export\s+function\s+\w+\s*\(|export\s+const\s+\w+\s*=\s*\([\w\s:,?=]*\)\s*=>)/.test(code);
    const hasVisitHomepage  = /export\s+function\s+visitHomepage\s*\(\)\s*\{\s*return\s+cy\.visit\(/.test(code);
    const hasReturnCy       = /return\s+cy\./.test(code);
    const isNotConstCss     = !/export\s+const\s+\w+\s*=\s*['"`][^'"`]+['"`]\s*;/.test(code);
    const hasNoGWTImport    = !/(^|\n)\s*import\s+.*Given.*When.*Then/.test(code);
    return hasExportFunction && hasVisitHomepage && hasReturnCy && isNotConstCss && hasNoGWTImport;
  }

  private looksLikeSteps(code: string): boolean {
    const hasImportGWT = /(^|\n)\s*import\s+{?\s*Given\s*,\s*When\s*,\s*Then\s*}?/.test(code);
    const refersSelPath =
      /import\s+\*\s+as\s+sel\s+from\s+'(?:\.\/orchestrator_selectors|\.\.\/selectors\/orchestrator_selectors)'/.test(code);
    const usesSelCalls   = /\bsel\.\w+\s*\(/.test(code);
    const noCyVisitProxy = !/\bcy\.visitHomepage\s*\(/.test(code);
    const noCyGetSel     = !/cy\.get\s*\(\s*sel\./.test(code);
    const noLocation     = !/cy\.location\s*\(/.test(code);

    return hasImportGWT && refersSelPath && usesSelCalls &&
           noCyVisitProxy && noCyGetSel && noLocation;
  }
}
