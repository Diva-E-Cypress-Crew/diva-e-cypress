import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

/**
 * Abstrakte Basisklasse für alle **LLM-gestützten Agents**.
 *
 * Zentralisiert:
 * - den **Modellaufruf** (LangChain `ChatOllama`),
 * - **Logging** in das VS Code Output-Panel,
 * - robustes **Fehler-Handling** inkl. hilfreicher Hinweise,
 * - das **Entpacken/Flatten** der Modellantwort zu einem String.
 *
 * @remarks
 * - Der Orchestrator erstellt das Modell (z. B. `llama3.2`, `temperature: 0`)
 *   und reicht es an konkrete Agents weiter.  
 * - Konkrete Implementierungen wie `SelectorsAgent`, `StepsAgent` oder
 *   `RefactorAgent` rufen die LLM-Interaktion über {@link BaseAgent.safeInvoke}
 *   auf und kümmern sich nur um Prompt-Aufbau und Nachbearbeitung.
 *
 * @example
 * ```ts
 * export class MyAgent extends BaseAgent {
 *   async generate(someInput: string): Promise<string> {
 *     const prompt = `Do something with: ${someInput}`;
 *     // Einheitlicher, fehlertoleranter Modellaufruf:
 *     const raw = await this.safeInvoke(prompt);
 *     return raw.trim();
 *   }
 * }
 * ```
 */
export abstract class BaseAgent {
  /**
   * @param model  Vorbereitete Chat-Instanz (z. B. `new ChatOllama({ model: 'llama3.2', temperature: 0 })`).
   * @param output Output-Channel für Logs und Hinweise.
   */
  protected constructor(
    protected model: ChatOllama,
    protected output: vscode.OutputChannel
  ) {}

  /**
   * Führt einen **sicheren Modellaufruf** mit einem einzigen `HumanMessage` aus
   * und gibt die **reine Textantwort** zurück.
   *
   * Handhabt interne Fehler und schreibt verständliche Hinweise in den
   * Output-Channel (z. B. ob `ollama serve` läuft oder das Modell gepullt ist).
   *
   * @param prompt Vollständiger Prompt-String für das Modell.
   * @returns Inhalt der Modellantwort als String (Code/Plaintext – ohne
   *   weitere Struktur). Arrays werden rekursiv zusammengeführt.
   *
   * @throws Re-throws den Originalfehler nach Logging, damit der aufrufende
   *   Agent entscheiden kann, wie weiter verfahren wird.
   *
   * @example
   * ```ts
   * const answer = await this.safeInvoke("Return only valid TypeScript.");
   * // -> "export function ... { ... }"
   * ```
   */
  protected async safeInvoke(prompt: string): Promise<string> {
    try {
      const resp = (await this.model.invoke([new HumanMessage(prompt)])) as AIMessage;
      return this.unwrapContent(resp.content);
    } catch (err: any) {
      this.output.appendLine(`❌ Modellaufruf fehlgeschlagen: ${err?.message ?? err}`);
      this.output.appendLine(
        "ℹ️ Prüfe: Läuft `ollama serve`? Ist das Modell gepullt (z. B. `ollama run llama3.2`)?"
      );
      throw err;
    }
  }

  /**
   * **Entpackt** unterschiedliche Antwortformen (String, Array, Sonstiges)
   * zu einem **einheitlichen String**.
   *
   * @param content Antwortinhalt aus der LLM-Nachricht (`AIMessage.content`).
   * @returns Zusammengeführter Text. Für Arrays werden die Elemente rekursiv
   *   zu Zeilen zusammengefügt; `null/undefined` wird als leerer String
   *   behandelt.
   */
  protected unwrapContent(content: unknown): string {
        if (typeof content === "string") {return content;}
        if (Array.isArray(content)) {return content.map(this.unwrapContent).join("\n");}
        return String(content ?? "");
    }
}