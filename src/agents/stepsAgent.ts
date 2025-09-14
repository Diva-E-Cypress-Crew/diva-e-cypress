/**
 * Erzeugt aus einem Gherkin-Feature, dem Pfad/Inhalt der Selectors-Datei
 * sowie einer temporären Steps-Skelettdatei fertige **Cypress Step-Definitions** (TypeScript).
 *
 * Ablauf (vereinfacht):
 * 1) Prompt über {@link StepsPrompt} aufbauen (enthält strikte Formatregeln).
 * 2) Modell über {@link BaseAgent.safeInvoke} aufrufen.
 * 3) Antwort **sanitizen**: nur TS behalten (ab erstem `import`, Kommentare raus).
 *
 * Hinweise:
 * - Die Prompt-Regeln verlangen u. a. exakte Header-Imports (`Given/When/Then` + `import * as sel ...`)
 *   und 1:1-Reproduktion der Step-Texte (keine Regex/Parameter-Platzhalter). :contentReference[oaicite:3]{index=3}
 * - Rückgabe ist **nur TypeScript-Code** (keine Erklärungen/Markdown).
 */
import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import { StepsPrompt } from "../../prompts/steps_instruction";
import {BaseAgent} from "./baseAgent";


/**
 * Agent zur Generierung der **Cypress-Step-Definitions** auf Basis eines Features
 * und der zuvor erzeugten Selectors.
 *
 * Verwendet {@link StepsPrompt}, ruft das Modell über die Basisklasse auf
 * und bereinigt die Antwort zu kompilierbarem TS.
 */
export class StepsAgent extends BaseAgent {
    /**
     * @param model  Vorbereitete Chat-Instanz (z. B. `new ChatOllama({ model: 'llama3.2', temperature: 0 })`).
     * @param output VS Code Output-Channel für Logs/Status.
     */
    constructor(model: ChatOllama, output: vscode.OutputChannel) {
        super(model, output);
    }

    /**
     * Baut den {@link StepsPrompt} aus Feature, Selectors-Modulpfad/Inhalt
     * und einer temporären Steps-Datei und startet die Generierung.
     *
     * @param feature     Gherkin-Featuretext (Inhalt der `.feature`-Datei).
     * @param selectorsTs Inhalt der Selectors-TS-Datei (Exports der Helper).
     * @param tempStepsTs Inhalt der temporären Steps-TS-Datei (Skelett mit TODOs).
     * @returns           Bereinigter TypeScript-Code mit vollständigen Step-Definitions.
     *
     * @example
     * ```ts
     * const agent = new StepsAgent(model, output);
     * const steps = await agent.generate(featureText, selectorsTs, tempStepsTs);
     * // → direkt als orchestrator_steps.ts speicherbar
     * ```
     */
    async generate(feature: string, selectorsTs: string, tempStepsTs: string): Promise<string> {
        const stepsPrompt = new StepsPrompt().getPrompt(
            feature,
            "../selectors/orchestrator_selectors",
            selectorsTs,
            tempStepsTs
        );

        return this.invokeForSteps(stepsPrompt);
    }

    /**
     * Führt den Modellaufruf aus, protokolliert Status/Längen
     * und **sanitizt** die Antwort zu reinem TypeScript.
     *
     * @param prompt Vollständig formatierter Prompt-String.
     * @returns      Finaler Steps-Code (nur TypeScript).
     * @private
     */
    private async invokeForSteps(prompt: string): Promise<string> {
        this.output.appendLine("▶ Erzeuge Steps…");
        this.output.appendLine(`🧩 StepsPrompt-Länge: ${prompt.length}`);

        let resp = await this.safeInvoke(prompt);
        let code = this.sanitizeStepsOutput(resp);

        this.output.appendLine("✅ Steps generiert.");
        this.output.appendLine(`📦 Steps-Vorschau:\n${code.slice(0, 300)}\n…`);
        return code;
    }

    /**
     * Wandelt Modellantwort in **reinen TS-Code** um:
     * - Falls Markdown-Codeblock vorhanden, nutze dessen Inhalt,
     * - schneide alles **ab erstem `import`** vorangestellten Text ab,
     * - entferne Zeilenkommentare.
     *
     * @param text Modellantwort (Rohtext).
     * @returns    Bereinigter TypeScript-Code.
     * @private
     */
    private sanitizeStepsOutput(text: string): string {
        let code = this.extractFirstCodeBlock(text) ?? text;
        const firstImport = code.search(/^\s*import\s+/m);
        if (firstImport > 0) {
            code = code.slice(firstImport);
        }
        code = code.replace(/^\s*\/\/.*$/gm, "").trim();
        return code;
    }

    /**
     * Extrahiert den **ersten Markdown-Codeblock** (``` … ```).
     * Gibt den Blockinhalt zurück oder `null`, wenn kein Block vorhanden ist.
     *
     * @param text Modellantwort (Rohtext).
     * @returns    Inhalt des ersten Codeblocks oder `null`.
     * @private
     */
    private extractFirstCodeBlock(text: string): string | null {
        const match = text.match(/```[a-z]*\n([\s\S]*?)```/);
        return match ? match[1] : null;
    }
}
