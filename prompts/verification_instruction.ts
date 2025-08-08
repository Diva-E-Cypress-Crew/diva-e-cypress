import { PromptTemplate, PromptContext } from './promptTemplate';

/**
 * `VerificationPrompt` ist eine spezialisierte Prompt-Vorlage, die Anweisungen für ein Sprachmodell
 * bereitstellt, um bestehende Cypress-Step-Definitions mit den Selectors-Definitions anhand eines HTML-Snapshots auf fehlende
 * Assertions zu überprüfen und ggf. zu ergänzen.
 *
 * **Einsatzgebiet:** Automatisierte Qualitätssicherung von generierten End-to-End-Tests durch KI.
 *
 * @extends {PromptTemplate}
 */
export class VerificationPrompt extends PromptTemplate {
  /**
   * Die vollständige Prompt-Vorlage für die Verifikations-Agenten.
   * Diese enthält Regeln und Platzhalter für die benötigten Eingabedaten.
   *
   * @protected
   * @readonly
   */
  protected readonly instruction = `
You are a verification agent for Cypress tests. Given the existing steps and
an HTML snapshot, add any missing assertions to verify test success.

Steps Definitions:
{{stepsText}}

HTML Snapshot:
{{htmlSnapshot}}

Instructions:
- Use Cypress assertions (should('be.visible'), should('contain.text'), etc.).
- Return only TypeScript code.
`;

  /**
   * Erzeugt den vollständigen Prompt zur Überprüfung und Ergänzung von Assertions.
   *
   * @param {string} stepsText - Inhalt der bestehenden Step-Definitions (TypeScript)
   * @param {string} htmlSnapshot - HTML-Snapshot der Zielseite als String
   * @returns {string} Der formatierte Prompt-Text zur Weitergabe an ein LLM
   *
   * @example
   * const prompt = new VerificationPrompt();
   * const verifPromptText = prompt.getPrompt(
   *   'Given ...\nWhen ...\nThen ...',
   *   '<html>...</html>'
   * );
   */
  public getPrompt(stepsText: string, htmlSnapshot: string): string {
    return this.render({ stepsText, htmlSnapshot });
  }
}
