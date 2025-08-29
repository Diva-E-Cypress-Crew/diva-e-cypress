import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

function unwrapContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) return content.map(unwrapContent).join("\n");
    return String(content ?? "");
}

export class RefactorAgent {
    constructor(private model: ChatOllama, private output: vscode.OutputChannel) {}

    async invokeCodeRefactor(prompt: string): Promise<string> {
        this.output.appendLine("▶ Selectors reparieren…");
        return await this.safeInvoke(prompt);
    }

    private async safeInvoke(prompt: string): Promise<string> {
        try {
            const resp = (await this.model.invoke([
                new HumanMessage(prompt),
            ])) as AIMessage;
            return unwrapContent(resp.content);
        } catch (err: any) {
            this.output.appendLine(
                `❌ Modellaufruf fehlgeschlagen: ${err?.message ?? err}`
            );
            throw err;
        }
    }
}
