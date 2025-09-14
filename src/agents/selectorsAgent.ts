/**
 * Erzeugt aus einem Gherkin-Feature und einem HTML-Snapshot
 * **Cypress-Selektoren (TypeScript-Helperfunktionen)**.
 *
 * Ablauf (vereinfacht):
 * 1) Prompt konstruieren ({@link SelectorsPrompt}) und Modell aufrufen (über {@link BaseAgent.safeInvoke}).
 * 2) Antwort **sanitizen** (Codefences, Imports, Kommentare entfernen; ab erstem `export` schneiden).
 * 3) Per Heuristik prüfen ({@link looksLikeSelectors}), ob es wie gültiger Selektoren-Code aussieht.
 * 4) Falls nein: **Retry** mit strengerer Instruktion.
 * 5) **Deterministische Auto-Fixes** anwenden ({@link autoFixSelectors}) und erneut prüfen.
 *
 * Hinweise:
 * - Erwartungen an die Modellantwort: **nur TypeScript-Code**, keine Erklärtexte/Markdown.
 * - Validierung achtet u. a. auf `visitHomepage`, `return cy.` und keine CSS-KonstantenExports.
 */
import * as vscode from 'vscode';
import { ChatOllama } from '@langchain/ollama';

import { CodeFixPrompt } from '../../prompts/code_fix';
import { SelectorsPrompt } from '../../prompts/selectors_instruction';
import {BaseAgent} from "./baseAgent";

/**
 * Agent zur Generierung/Normalisierung von **Cypress-Selektoren**.
 * Baut Prompts aus Feature + HTML, ruft das LLM über die Basisklasse auf
 * und stellt sicher, dass am Ende **reiner TS-Code** zurückgegeben wird.
 */
export class SelectorsAgent extends BaseAgent {
  /**
   * @param model  Vorbereitete Chat-Instanz (z. B. `new ChatOllama({ model: 'llama3.2', temperature: 0 })`).
   * @param output VS Code Output-Channel für Logs/Status.
   */
  constructor(model: ChatOllama, output: vscode.OutputChannel) {
    super(model, output);
  }

  /**
   * Baut den {@link SelectorsPrompt} aus Gherkin-Feature und HTML-Snapshot
   * und startet die Generierung.
   *
   * @param feature Inhalt der `.feature`-Datei (Gherkin).
   * @param html    HTML-Snapshot der Zielseite.
   * @returns       Bereinigter, validierter und ggf. auto-reparierter TypeScript-Code (nur Code, keine Erklärungen).
   */
  async generate(feature: string, html: string): Promise<string> {
    const prompt = new SelectorsPrompt().getPrompt(feature, html);
    return this.invokeForSelectors(prompt);
  }

  // ───────────────────────────
  // Prompt handler
  // ───────────────────────────

  /**
   * Führt den Modellaufruf aus, **sanitizt** die Antwort, prüft per Heuristik,
   * versucht bei Bedarf einen **Retry** mit strenger Instruktion und
   * führt anschließend deterministische **Auto-Fixes** aus.
   *
   * @param prompt Vollständig formatierter Prompt-String.
   * @returns      Finaler Selektoren-Code als String.
   * @throws       Wenn auch nach Retry + Auto-Fix kein gültiger Selektoren-Code erkennbar ist.
   * @private
   */
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
        //
        // // Auto-Repair (robuste Helfer + kaputte name-Selectoren fixen + *Input() entfernen)
        code = this.autoFixSelectors(code);
        //
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

  /**
   * Extrahiert den **ersten Markdown-Codeblock** (``` … ```).
   * Falls keiner vorhanden ist, wird `null` zurückgegeben.
   *
   * @param text Modellantwort (Rohtext).
   * @returns    Inhalt des ersten Codeblocks oder `null`.
   * @private
   */
  private extractFirstCodeBlock(text: string): string | null {
    const m = text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
    return m ? m[1].trim() : null;
  }

  /**
   * Wandelt Modellantwort in **reinen TS-Code** um:
   * - Codefences entfernen (nimmt ggf. nur Inhalt des ersten Blocks),
   * - vorangestellten Text **ab dem ersten `export`** abschneiden,
   * - Top-Level-`import`-Zeilen entfernen,
   * - Zeilenkommentare entfernen und trimmen.
   *
   * @param text Modellantwort (Rohtext).
   * @returns    Bereinigter TypeScript-Code.
   * @private
   */
  private sanitizeSelectorsOutput(text: string): string {
    let code = this.extractFirstCodeBlock(text) ?? text;
    const firstExport = code.search(/^\s*export\s+/m);
    if (firstExport > 0) {code = code.slice(firstExport);}
    code = code.split('\n').filter(l => !/^\s*import\s+/.test(l)).join('\n');
    code = code.replace(/^\s*\/\/.*$/gm, '').trim();
    return code;
  }

  /**
   * Heuristik, ob der Text wie **gültiger Selektoren-Code** aussieht:
   * - Mindestens eine exportierte Funktion,
   * - Pflicht-Helper `visitHomepage` vorhanden,
   * - enthält `return cy.`,
   * - **keine** `export const x = 'css'`-Konstanten,
   * - **kein** GWT-Import (`Given/When/Then`).
   *
   * @param code Kandidat-Code.
   * @returns    `true`, wenn der Code plausibel ist; sonst `false`.
   * @private
   */
    private looksLikeSelectors(code: string): boolean {
        const hasExportFunction = /(export\s+function\s+\w+\s*\(|export\s+const\s+\w+\s*=\s*\([\w\s:,?=]*\)\s*=>)/.test(code);
        const hasVisitHomepage  = /export\s+function\s+visitHomepage\s*\(\)\s*\{\s*return\s+cy\.visit\(/.test(code);
        const hasReturnCy       = /return\s+cy\./.test(code);
        const isNotConstCss     = !/export\s+const\s+\w+\s*=\s*['"`][^'"`]+['"`]\s*;/.test(code);
        const hasNoGWTImport    = !/(^|\n)\s*import\s+.*Given.*When.*Then/.test(code);

        return hasExportFunction && hasVisitHomepage && hasReturnCy && isNotConstCss && hasNoGWTImport;
    }


  // ───────────────────────────
  // Deterministic Fixes
  // ───────────────────────────

  /**
   * **Deterministische Reparaturen** des gelieferten Codes:
   * - `export const 'css'` → Funktions-Helper mit `cy.get('css')`
   * - Pflicht-Helper ergänzen: `visitHomepage`, `clickLabel`, `getLabel`, `getHeading`, `inputByLabel`
   * - fehlerhafte Attribut-Selektoren reparieren
   * - Reste nach `cy.get(...)` entfernen
   * - Fragmente wie `q"]';` bereinigen
   * - generische `*Input()`-Funktionen entfernen (wir nutzen `inputByLabel`)
   * - Safety-Net gegen `undefined="undefined"`
   *
   * @param code Ausgangscode aus dem Modell.
   * @returns    Bereinigter/normalisierter TypeScript-Code.
   * @private
   */
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
