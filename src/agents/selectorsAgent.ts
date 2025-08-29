import * as vscode from 'vscode';
import { ChatOllama } from '@langchain/ollama';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

import { CodeFixPrompt } from '../../prompts/code_fix';
import { SelectorsPrompt } from '../../prompts/selectors_instruction';

export class SelectorsAgent {
  constructor(
      private model: ChatOllama,
      private output: vscode.OutputChannel
  ) {}

  async generate(feature: string, html: string): Promise<string> {
    const prompt = new SelectorsPrompt().getPrompt(feature, html);
    return this.invokeForSelectors(prompt);
  }

  // ───────────────────────────
  // Core LLM call
  // ───────────────────────────
  private async safeInvoke(prompt: string): Promise<string> {
    try {
      const resp = await this.model.invoke([new HumanMessage(prompt)]) as AIMessage;
      return this.unwrapContent(resp.content);
    } catch (err: any) {
      this.output.appendLine(`❌ Modellaufruf fehlgeschlagen: ${err?.message ?? err}`);
      throw err;
    }
  }

  private unwrapContent(raw: unknown): string {
    if (Array.isArray(raw)) {return raw.map(i => typeof i === 'string' ? i : JSON.stringify(i)).join('');}
    if (typeof raw === 'string') {return raw;}
    try { return JSON.stringify(raw); } catch { return String(raw); }
  }

  // ───────────────────────────
  // Prompt handler
  // ───────────────────────────
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

    // Auto-repair via LLM
    const fixPrompt = new CodeFixPrompt().getPrompt(code);
    code = await this.safeInvoke(fixPrompt);
    code = this.sanitizeSelectorsOutput(code);

    // Deterministic auto-fixes
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

  // ───────────────────────────
  // Sanitizers & Validators
  // ───────────────────────────
  private extractFirstCodeBlock(text: string): string | null {
    const m = text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
    return m ? m[1].trim() : null;
  }

  private sanitizeSelectorsOutput(text: string): string {
    let code = this.extractFirstCodeBlock(text) ?? text;
    const firstExport = code.search(/^\s*export\s+/m);
    if (firstExport > 0) {code = code.slice(firstExport);}
    code = code.split('\n').filter(l => !/^\s*import\s+/.test(l)).join('\n');
    code = code.replace(/^\s*\/\/.*$/gm, '').trim();
    return code;
  }

  private looksLikeSelectors(code: string): boolean {
    const hasExportFunction = /(export\s+function\s+\w+\s*\(|export\s+const\s+\w+\s*=)/.test(code);
    const hasReturnCy       = /return\s+cy\./.test(code);
    return hasExportFunction && hasReturnCy;
  }

  // ───────────────────────────
  // Deterministic Fixes
  // ───────────────────────────
  private autoFixSelectors(code: string): string {
    let out = code;

    // export const 'css' → function() { return cy.get('css'); }
    out = out.replace(
        /export\s+const\s+([A-Za-z0-9_$\u00C0-\u024F]+)\s*=\s*['"`]([^'"`]+)['"`]\s*;?/g,
        (_m, name, css) => `export function ${name}() { return cy.get('${css}'); }`
    );

    // visitHomepage
    if (!/export\s+function\s+visitHomepage\s*\(/.test(out)) {
      out = `export function visitHomepage() { return cy.visit('/'); }\n` + out;
    }

    // clickLabel
    if (!/export\s+function\s+clickLabel\s*\(/.test(out)) {
      out =
          `export function clickLabel(label: string) {
  const parts = String(label).split(/\\s+(?:and|und)\\s+|,\\s*/i).map(s => s.trim()).filter(Boolean);
  let chain = cy.wrap(null);
  parts.forEach(p => { chain = chain.then(() => cy.contains(String(p)).click({ force: true })); });
  return chain;
}
` + out;
    }

    // getLabel
    if (!/export\s+function\s+getLabel\s*\(/.test(out)) {
      out = `export function getLabel(label: string) { return cy.contains(':visible', String(label)); }\n` + out;
    } else {
      out = out.replace(
          /export function getLabel\(label: string\)\s*\{\s*return cy\.contains\(\s*String\(label\)\s*\);\s*}/,
          "export function getLabel(label: string) { return cy.contains(':visible', String(label)); }"
      );
    }

    // getHeading
    if (!/export\s+function\s+getHeading\s*\(/.test(out)) {
      out = `export function getHeading(label: string) { return cy.contains('h1:visible, h2:visible, [role=\"heading\"]:visible', String(label)); }\n` + out;
    }

    // inputByLabel
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

    // Broken attribute selectors (repair cases like type='); }submit"]')
    out = out.replace(
        /return\s+cy\.get\(\s*(['"])([^'"]*\[[^\]=]+)=\1\)\s*;\s*}?\s*(['"])([^'"]+)\3]\s*['"]?\s*;?/gm,
        (_m, _q1, pre, _q2, val) => `return cy.get('${pre}="${val}"]');`
    );

    // Remove leftover junk after cy.get()
    out = out.replace(
        /(cy\.get\([^)]*\)\s*;)\s*['"][^'"]+['"]\s*;?/g,
        '$1'
    );

    // Remove stray fragments like q"]';
    out = out.replace(/^\s*[A-Za-z0-9_-]+"]';\s*$/gm, '');

    // Remove *Input() functions (we rely on inputByLabel)
    out = out.replace(/export function\s+[A-Za-z0-9_]+Input\s*\([^)]*\)\s*\{[\s\S]*?}\s*/g, '');

    // Safety net: no undefined selectors
    out = out.replace(/cy\.get\(['"]undefined="undefined"]['"]\)/g, "cy.get('*')");

    return out.trim();
  }
}
