import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import { BaseAgent } from "./baseAgent";
import { SelectorsPrompt } from "../prompts/selectors_instruction"; // (derzeit ungenutzt)
import { CodeFixPrompt } from "../prompts/code_fix";

/**
 * `RefactorAgent` repariert bzw. normalisiert vom LLM generierten
 * **TypeScript-Selektoren-Code** (Cypress).
 *
 * Der Agent baut dazu einen {@link CodeFixPrompt} und gibt ihn an das Modell,
 * wobei über {@link BaseAgent.safeInvoke | safeInvoke} eine robuste Ausführung
 * inkl. Logging/Fehlerbehandlung gewährleistet wird.
 *
 * **Einsatzgebiet:** „Auto-Fix“ nach der ersten Selector-Generierung – z. B.
 * fehlende Klammern, Semikolons oder Markdown-Rauschen entfernen.
 *
 * @extends BaseAgent
 *
 * @example
 * ```ts
 * const agent = new RefactorAgent(model, output);
 * const fixedSelectorsTs = await agent.generate(rawSelectorsTs);
 * // fixedSelectorsTs → direkt als .ts-Datei speicherbar
 * ```
 */
export class RefactorAgent extends BaseAgent {
  /**
   * @param model  Vorbereitete Chat-Instanz (z. B. `new ChatOllama({ model: 'llama3.2', temperature: 0 })`).
   * @param output VS Code Output-Channel für Status/Logs.
   */
  constructor(model: ChatOllama, output: vscode.OutputChannel) {
    super(model, output);
  }

  /**
   * Erzeugt den **Code-Fix-Prompt** und stößt die Reparatur an.
   *
   * @param code TypeScript-Inhalt der (ggf. fehlerhaften) Selektoren-Datei.
   * @returns Der vom Modell gelieferte, **bereinigte TypeScript-Code** (nur Code, keine Erklärungen).
   *
   * @remarks
   * Nutzt intern {@link CodeFixPrompt.getPrompt}, der strikt vorgibt,
   * **nur kompilierten TS-Code** ohne Zusatztext zurückzugeben.
   */
  async generate(code: string): Promise<string> {
    const prompt = new CodeFixPrompt().getPrompt(code);
    return this.invokeCodeRefactor(prompt);
  }

  /**
   * Niedrigschwelliger Prompt-Handler:
   * - schreibt Logeinträge (Start-Info),
   * - delegiert den eigentlichen Modellaufruf an {@link BaseAgent.safeInvoke}.
   *
   * @param prompt Vollständig formatierter Prompt-String (z. B. aus {@link CodeFixPrompt}).
   * @returns Bereinigter TypeScript-Code als String.
   *
   * @example
   * ```ts
   * const prompt = new CodeFixPrompt().getPrompt(brokenTs);
   * const fixed = await agent.invokeCodeRefactor(prompt);
   * ```
   */
  async invokeCodeRefactor(prompt: string): Promise<string> {
    this.output.appendLine("▶ Selectors reparieren…");
    return this.safeInvoke(prompt);
  }
}
