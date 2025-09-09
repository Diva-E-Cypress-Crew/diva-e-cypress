import { PromptTemplate } from './promptTemplate';

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
You are a Cypress step-definition generator. You will be given the following inputs:
- Feature text: a complete .feature Gherkin file.
- Selectors module path: e.g. "../selectors/orchestrator_selectors".
- Selectors file content: TypeScript code that exports helper functions such as:
    - visitHomepage()
    - clickLabel(label)
    - getLabel(label)
    - getHeading(label)
    - (plus optional element helpers)
- Temporary step file content: an auto-generated step-definition skeleton that contains one step per line from the feature, with // TODO: implement step placeholders.

Your task:
- Replace the placeholder step bodies in the step-definition file with working Cypress code:
  1. Starts with exactly:
       import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
        import * as sel from '{{selectorsModulePath}}';
  2. For each step line in the feature, replace the // TODO with exactly one Cypress chain using the helpers from the selectors file. 
      Always return the chain (no await, no plain cy. without return). 
      Do not leave any step unimplemented.
  3. Do not modify the step text.
      No regex.
      No parameter placeholders ({string}, {int}, {word}, etc).
      Each step definition must reproduce the literal step text as written in the feature.
  4. Mapping rules (strict):
      Given the Customer is on the homepage → return sel.visitHomepage();
      When he clicks "X" or When he clicks X → return sel.clickLabel('X');
      Then "X" should be displayed → return sel.getHeading('X').should('be.visible');
      If "X" is not a heading, use: → return sel.getLabel('X').should('be.visible');
      If a step refers to a URL/path like /xyz, never check equality. Use: → return cy.location('pathname', { timeout: 10000 }).should('include', '/xyz');
      Keep in mind X is a placeholder, you would use the actual names given in the step definitions
  5. No control flow.
      No if/else.
      No loops.
      No ternaries.
  6. No extra imports, no comments, no code fences, no JSON.

Feature:
{{featureText}}

Selectors Module Path:
{{selectorsModulePath}}

Selectors File Content:
{{selectorsTs}}

Steps File Content:
{{tempStepsTs}}
`;


  /**
   * Erzeugt den vollständigen Prompt mit eingefügtem Feature-Text, Pfad zur Selector-Datei und deren Inhalt.
   *
   * @param {string} featureText - Der Gherkin-Featuretext (z. B. aus einer `.feature`-Datei)
   * @param {string} selectorsModulePath - Relativer Pfad zur Selektoren-Datei
   * @param {string} selectorsTs - TypeScript-Inhalt der Selektoren-Datei
   * @param {string} tempStepsTs - TypeScript-Inhalt der vorgeschriebenen Steps-Datei
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
      featureText: string, selectorsModulePath: string, selectorsTs: string, tempStepsTs: string  ): string {
    return this.render({ featureText, selectorsModulePath, selectorsTs , tempStepsTs});
  }
}
