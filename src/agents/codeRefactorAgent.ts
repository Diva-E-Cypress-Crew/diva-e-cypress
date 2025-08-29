import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import {BaseAgent} from "./baseAgent";


export class RefactorAgent extends BaseAgent {
    constructor(model: ChatOllama, output: vscode.OutputChannel) {
        super(model, output);
    }

    async invokeCodeRefactor(prompt: string): Promise<string> {
        this.output.appendLine("▶ Selectors reparieren…");
        return this.safeInvoke(prompt);
    }
}
