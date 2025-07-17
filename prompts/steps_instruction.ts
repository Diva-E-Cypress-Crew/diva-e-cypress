import { PromptTemplate, PromptContext } from './promptTemplate';

export class StepsPrompt extends PromptTemplate {
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

  public getPrompt(
    featureText: string,
    selectorsModulePath: string,
    selectorsTs: string
  ): string {
    return this.render({ featureText, selectorsModulePath, selectorsTs });
  }
}
