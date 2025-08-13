import { PromptTemplate } from './promptTemplate';

/**
 * `SelectorsPrompt` ist eine spezialisierte Prompt-Vorlage, die Anweisungen
 * für ein Sprachmodell bereitstellt, um basierend auf einem Gherkin-Feature und einem HTML-Snapshot
 * eine valide TypeScript-Datei mit Cypress-Selektoren zu erzeugen.
 *
 * Die generierte Datei folgt strikten Formatierungs- und Stilregeln, um direkt als
 * Cypress-Hilfsmodul nutzbar zu sein.
 *
 * **Einsatzgebiet:** Automatisierte Testgenerierung mit KI für Frontend-Webanwendungen.
 *
 * @extends {PromptTemplate}
 */
export class SelectorsPrompt extends PromptTemplate {
  /**
   * Die vollständige Prompt-Vorlage für die Selectors-Erzeugung.
   * Diese enthält Regeln, erwartetes Format und Platzhalter für Eingabedaten.
   *
   * @protected
   * @readonly
   */
  protected readonly instruction = `
You are a selector-generator for Cypress tests.

Input:
1) Gherkin feature (plain text)
2) HTML snapshot of the loaded page (plain text)

Output: Return **only** a complete, valid TypeScript file. No comments, no explanations, no Markdown, no extra text.

Hard rules (MUST follow):
- Export **ONLY functions** (named exports). Do NOT export string constants, objects, or classes.
- Every exported function must **return a Cypress chain** that starts with \`cy.\`.
- The file MUST start with **exactly these helpers in this order** (copy verbatim):
    export function visitHomepage() { return cy.visit('/'); }
    export function clickLabel(label: string) { return cy.contains(String(label)).click({ force: true }); }
    export function getLabel(label: string) { return cy.contains(':visible', String(label)); }
    export function getHeading(label: string) { return cy.contains('h1:visible, h2:visible, [role="heading"]:visible', String(label)); }
- For literals in double quotes in the feature you MAY add helpers if useful.
- Function naming for additional helpers:
    • ASCII only (ä→ae, ö→oe, ü→ue, ß→ss), remove non-alphanumerics, use camelCase or PascalCase.
- Prefer robust **unique** selectors: [data-test], [data-cy], id, stable classes; fallback to \`contains\`.
- Use single quotes. No blank lines. No imports. No \`.click()\` or \`.should()\` inside selector helpers (except clickLabel).

Strictly return valid **TypeScript code**. **No code fences. No JSON.**

Feature:
{{featureText}}

HTML Snapshot:
{{htmlSnapshot}}
`.trim();


  /**
   * Erzeugt den vollständigen Prompt mit eingefügtem Feature-Text und HTML-Snapshot.
   * Dieser Prompt wird einem Sprachmodell übergeben, um daraus Cypress-Selektoren zu generieren.
   *
   * @param {string} featureText - Der Gherkin-Featuretext (z. B. `.feature`-Dateiinhalt)
   * @param {string} htmlSnapshot - Der HTML-Snapshot der Zielseite als String
   * @returns {string} Der formatierte Prompt-Text zur Weitergabe an ein LLM
   *
   * @example
   * const prompt = new SelectorsPrompt();
   * const selectorsPromptText = prompt.getPrompt(
   *   'Feature: Login\nScenario: ...',
   *   '<html>...</html>'
   * );
   */
  public getPrompt(featureText: string, htmlSnapshot: string): string {
    return this.render({ featureText, htmlSnapshot });
  }
}
