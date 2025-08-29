import {AIMessage, HumanMessage} from "@langchain/core/messages";

private async invokeCodeRefactor(prompt: string): Promise<string> {
    this.output.appendLine('▶ Selectors Reparieren…');

    return await this.safeInvoke(prompt);


    private async safeInvoke(prompt: string): Promise<string> {
        try {
            const resp = await this.model.invoke([new HumanMessage(prompt)]) as AIMessage;
            return this.unwrapContent(resp.content);
        } catch (err: any) {
            this.output.appendLine(`❌ Modellaufruf fehlgeschlagen: ${err?.message ?? err}`);
            throw err;
        }
    }
}