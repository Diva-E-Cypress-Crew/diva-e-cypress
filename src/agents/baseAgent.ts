// src/agents/BaseAgent.ts
import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

export abstract class BaseAgent {
    protected constructor(protected model: ChatOllama, protected output: vscode.OutputChannel) {}

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

    protected unwrapContent(content: unknown): string {
        if (typeof content === "string") {return content;}
        if (Array.isArray(content)) {return content.map(this.unwrapContent).join("\n");}
        return String(content ?? "");
    }
}
