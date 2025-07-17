import { PromptTemplate, PromptContext } from './promptTemplate';

export class VerificationPrompt extends PromptTemplate {
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

  public getPrompt(stepsText: string, htmlSnapshot: string): string {
    return this.render({ stepsText, htmlSnapshot });
  }
}
