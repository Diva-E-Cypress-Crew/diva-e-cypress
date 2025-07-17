export interface PromptContext {
  [key: string]: string;
}

export abstract class PromptTemplate {
  /** Statischer Instruction-Block */
  protected abstract readonly instruction: string;

  /** Setzt alle {{key}}-Platzhalter. */
  render(context: PromptContext): string {
    let p = this.instruction;
    for (const [k, v] of Object.entries(context)) {
      p = p.split(`{{${k}}}`).join(v);
    }
    return p.trim();
  }
}
