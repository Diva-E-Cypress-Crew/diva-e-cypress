import { PromptTemplate } from './promptTemplate';

/**
 * Erzeugt einen **Korrektur-Prompt** für aus LLMs generierte
 * TypeScript-Selector-Dateien (Cypress).
 *
 * Der Prompt weist das Modell an, **ausschließlich** kompilierten TypeScript-Code
 * ohne zusätzliche Erklärungen/Markdown zu liefern und alle Klammern/Semikolons
 * korrekt zu setzen.
 *
 * @remarks
 * - Output MUSS reiner TypeScript-Code sein (keine Kommentare, keine Codefences).
 * - Der zurückgegebene Code soll **selbstständig kompilierbar** sein.
 *
 * @example
 * ```ts
 * const fixer = new CodeFixPrompt();
 * const prompt = fixer.getPrompt(generatedSelectorsTs);
 * // prompt → an LLM senden, Antwort direkt als TS-Datei speichern
 * ```
 */
export class CodeFixPrompt extends PromptTemplate {

  /**
   * Statische Prompt-Instruktion mit Platzhalter `{{selectorsTs}}`,
   * der durch den Inhalt der fehlerhaften Selector-Datei ersetzt wird.
   *
   * @internal
   */
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

  /**
   * Baut den vollständigen Prompt, indem der Platzhalter `selectorsTs`
   * in die Instruktion eingesetzt wird.
   *
   * @param selectorsTs - Inhalt der (ggf. fehlerhaften) generierten
   *   Selector-TypeScript-Datei, die korrigiert werden soll.
   * @returns Den finalen Prompt-String zur Weitergabe an ein LLM.
   */
  public getPrompt(selectorsTs: string): string {
    return this.render({ selectorsTs });
  }
}
