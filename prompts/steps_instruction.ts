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
3) The full TypeScript content of that selectors file, which exports:
   - visitHomepage(), clickLabel(label), getLabel(label), getHeading(label), plus optional element helpers.

Your task:
- Generate a complete TypeScript step-definition file that:
  1. Starts with exactly:
       import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
       import * as sel from '{{selectorsModulePath}}';
  2. Create **one explicit step-definition PER step line** in the feature.
     **Do NOT** use regex or Cucumber parameters like {string}, {int}, {text}. Reproduce the step text **literally**.
  3. Mapping rules (MUST follow):
       • "Given the Customer is on the homepage"          → return sel.visitHomepage();
       • "When he clicks \"X\"" or "When he clicks X"      → return sel.clickLabel('X');
       • "Then \"X\" should be displayed"                  → return sel.getHeading('X').should('be.visible');
         If it's clearly not a heading, use: return sel.getLabel('X').should('be.visible');
       • If a step mentions a path like "/xyz", NEVER assert exact URL equality.
         Use: return cy.location('pathname', { timeout: 10000 }).should('include', '/xyz');
  4. Each step body is a **single returned Cypress chain** (use 'return'). **No if/else, no ternaries, no loops.**
  5. Do not import anything else. No comments. No JSON. No code fences.

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
