import { PromptTemplate, PromptContext } from './promptTemplate';

export class CodeFixPrompt extends PromptTemplate {

    protected readonly instruction = `
You are an expert TypeScript programmer.
You will receive a generated selectors file for Cypress tests.
Your task:
- Return only valid, compilable TypeScript code.
- The code must include all required closing braces and semicolons.
- Do not include explanations, comments, markdown formatting, or any extra text.
- Output must be plain TypeScript code only, fully self-contained.

Selectors File Content:
{{selectorsTs}}
`;

    public getPrompt(selectorsTs: string): string {
        return this.render({ selectorsTs });
    }
}
