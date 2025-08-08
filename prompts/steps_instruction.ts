import { PromptTemplate, PromptContext } from './promptTemplate';

/**
 * `StepsPrompt` ist eine spezialisierte Prompt-Vorlage, die Anweisungen für ein Sprachmodell
 * bereitstellt, um basierend auf einem Gherkin-Feature, dem Pfad zur Selectors-Datei
 * und dem Inhalt dieser Datei eine vollständige TypeScript-Datei mit Cypress-Step-Definitions
 * zu erzeugen.
 *
 * Die generierte Datei enthält standardisierte Step-Implementierungen für Cypress-Tests
 * und folgt strikten Vorgaben für Struktur und Syntax, sodass sie direkt in einer
 * automatisierten Testumgebung verwendet werden kann.
 *
 * **Einsatzgebiet:** Automatisierte Generierung von Step-Definitions für End-to-End-Tests.
 *
 * @extends {PromptTemplate}
 */
export class StepsPrompt extends PromptTemplate {
  /**
   * Die vollständige Prompt-Vorlage für die Steps-Erzeugung.
   * Diese enthält Regeln, erwartetes Format und Platzhalter für Eingabedaten.
   *
   * @protected
   * @readonly
   */
  protected readonly instruction = `
You are a Cypress step-definition generator. You will receive:

1) A Gherkin feature snippet (complete .feature text).
2) The relative path to the selectors file (e.g. '../selectors/orchestrator_selectors').
3) The full TypeScript content of that selectors file, exporting:
     - visitHomepage()
     - selXxx() helpers

Your task:
- Generate a complete TypeScript step-definition file that:
  1. Imports at the top:
       import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
       import * as sel from '{{selectorsModulePath}}';
  2. For each step:
       • **Given** opening → sel.visitHomepage()
       • **When** clicking → sel.selXxx().click()
       • **Then** visibility → sel.selXxx().should('be.visible')
  3. Return each Cypress chain.

Do not include comments, JSON, or code fences—just TypeScript code.

Feature:
{{featureText}}

Selectors Module Path:
{{selectorsModulePath}}

Selectors File Content:
{{selectorsTs}}
`;

  /**
   * Erzeugt den vollständigen Prompt mit eingefügtem Feature-Text, Pfad zur Selector-Datei und deren Inhalt.
   *
   * @param {string} featureText - Der Gherkin-Featuretext (z. B. aus einer `.feature`-Datei)
   * @param {string} selectorsModulePath - Relativer Pfad zur Selektoren-Datei
   * @param {string} selectorsTs - TypeScript-Inhalt der Selektoren-Datei
   * @returns {string} Der formatierte Prompt-Text zur Weitergabe an ein LLM
   *
   * @example
   * const prompt = new StepsPrompt();
   * const stepsPromptText = prompt.getPrompt(
   *   'Feature: Login\nScenario: ...',
   *   '../selectors/orchestrator_selectors',
   *   'export function selLoginButton() { ... }'
   * );
   */
  public getPrompt(
    featureText: string,
    selectorsModulePath: string,
    selectorsTs: string
  ): string {
    return this.render({ featureText, selectorsModulePath, selectorsTs });
  }
}
