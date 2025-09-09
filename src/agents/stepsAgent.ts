import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import { StepsPrompt } from "../../prompts/steps_instruction";
import {BaseAgent} from "./baseAgent";


export class StepsAgent extends BaseAgent {
    constructor(model: ChatOllama, output: vscode.OutputChannel) {
        super(model, output);
    }

    async generate(feature: string, selectorsTs: string): Promise<string> {
        const stepsPrompt = new StepsPrompt().getPrompt(
            feature,
            "../selectors/orchestrator_selectors",
            selectorsTs
        );

        return this.invokeForSteps(stepsPrompt);
    }

    private async invokeForSteps(prompt: string): Promise<string> {
        this.output.appendLine("▶ Erzeuge Steps…");
        this.output.appendLine(`🧩 StepsPrompt-Länge: ${prompt.length}`);

        let resp = await this.safeInvoke(prompt);
        let code = this.sanitizeStepsOutput(resp);

        this.output.appendLine("✅ Steps generiert.");
        this.output.appendLine(`📦 Steps-Vorschau:\n${code.slice(0, 300)}\n…`);
        return code;
    }

    private sanitizeStepsOutput(text: string): string {
        let code = this.extractFirstCodeBlock(text) ?? text;
        const firstImport = code.search(/^\s*import\s+/m);
        if (firstImport > 0) {
            code = code.slice(firstImport);
        }
        code = code.replace(/^\s*\/\/.*$/gm, "").trim();
        return code;
    }

    private extractFirstCodeBlock(text: string): string | null {
        const match = text.match(/```[a-z]*\n([\s\S]*?)```/);
        return match ? match[1] : null;
    }
}


