import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import {BaseAgent} from "./baseAgent";
import {SelectorsPrompt} from "../../prompts/selectors_instruction";
import {CodeFixPrompt} from "../../prompts/code_fix";


export class RefactorAgent extends BaseAgent {
    constructor(model: ChatOllama, output: vscode.OutputChannel) {
        super(model, output);
    }

    async generate(code: string): Promise<string> {
        const prompt = new CodeFixPrompt().getPrompt(code);
        return this.invokeCodeRefactor(prompt);
    }

    async invokeCodeRefactor(prompt: string): Promise<string> {
        this.output.appendLine("▶ Selectors reparieren…");
        return this.safeInvoke(prompt);
    }
}
