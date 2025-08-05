/**
 * Kontext für die Ersetzung von Platzhaltern innerhalb von Prompt-Texten.
 * Jeder Schlüssel im Objekt entspricht exakt einem Platzhalter im Instruction-Text.
 *
 * @interface PromptContext
 */
export interface PromptContext {
  [key: string]: string;
}

/**
 * Abstrakte Basisklasse für alle Prompt-Templates.
 * Diese Klasse definiert einen einheitlichen Mechanismus, um dynamisch generierte Prompt-Texte 
 * mittels Platzhaltern zu erstellen. Jede Unterklasse implementiert die konkrete Instruction.
 *
 * @abstract
 * @class PromptTemplate
 */
export abstract class PromptTemplate {
  /**
   * Statischer Instruction-Block, der Platzhalter in Form von {{key}} enthält.
   * Wird individuell in jeder erbenden Unterklasse definiert.
   *
   * @protected
   * @readonly
   */
  protected abstract readonly instruction: string;

  /**
   * Ersetzt sämtliche Platzhalter in der Instruction durch die Werte, die im Kontext übergeben werden.
   *
   * @param {PromptContext} context - Objekt mit Schlüssel-Wert-Paaren zur Ersetzung der Platzhalter.
   * @returns {string} - Fertiger Prompt-String, der vom LLM verarbeitet werden kann.
   *
   * @example
   * const context = {
   *   featureText: 'Feature zum Login',
   *   htmlSnapshot: '<div>Inhalt</div>'
   * };
   * const promptText = myPrompt.render(context);
   */
  render(context: PromptContext): string {
    let p = this.instruction;
    for (const [k, v] of Object.entries(context)) {
      p = p.split(`{{${k}}}`).join(v);
    }
    return p.trim();
  }
}
