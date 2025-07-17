import { PromptTemplate } from './promptTemplate';

export class SelectorsPrompt extends PromptTemplate {
  protected readonly instruction = `
You are a selector-generator for Cypress tests.

Input:
1) Gherkin feature (plain text)
2) HTML snapshot of the loaded page (plain text)

Output: Output **only** a complete, valid TypeScript file. No comments, no explanations, no Markdown, no extra text. Only code for a Cypress selectors file.
common/selectors/orchestrator_selectors.ts
NO explanations, NO markdown, NO comments. JUST WORKING SELECTORS code for cypress!

Rules:
- Export core helpers at the top:
    export const visitHomepage = () => cy.visit('/');
    export const clickLabel    = (label: string) => cy.contains(String(label)).click({ force: true });
    export const getLabel      = (label: string) => cy.contains(String(label));
- For each literal in double quotes in the feature, create a helper:
    - Name: PascalCase, prefix with sel (e.g. "Anlegen" -> selAnlegen)
    - Implementation: Choose the most robust unique CSS selector (prefer [data-test], [data-cy], id, classes; fallback to contains).
- All helpers must be named exports.
- Use single quotes, no blank lines, no comments, no imports, no '.click()', no '.should()'.
- Output strictly and **only** valid TypeScript code. **Do not include explanations, code fences, or JSON.**

Example output (YOU MUST FOLLOW THIS TYPE OF FORMAT; NO EXPLANATIONS OR COMMENTS):

export function visitHomepage() {
  return cy.visit('/');
}
export function selTile(label: string) {
  return cy.get('section div.cursor-pointer').contains(label);
}
export function selHeading(label: string) {
  return cy.get('h2').contains(label);
}


Feature:
{{featureText}}

HTML Snapshot:
{{htmlSnapshot}}

  `.trim();

  public getPrompt(featureText: string, htmlSnapshot: string): string {
    return this.render({ featureText, htmlSnapshot });
  }
}
