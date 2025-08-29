// src/agents/stepsAgent.ts
// src/agents/StepsAgent.ts
import * as vscode from "vscode";
import { ChatOllama } from "@langchain/ollama";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StepsPrompt } from "../../prompts/steps_instruction";

// simple helper to unwrap model content
function unwrapContent(content: unknown): string {
    if (typeof content === "string") {return content;}
    if (Array.isArray(content)) {
        return content.map(unwrapContent).join("\n");
    }
    return String(content ?? "");
}

export class StepsAgent {
    constructor(private model: ChatOllama, private output: vscode.OutputChannel) {}

    async generate(feature: string, selectorsTs: string): Promise<string> {
        const stepsPrompt = new StepsPrompt().getPrompt(
            feature,
            "../selectors/orchestrator_selectors",
            selectorsTs
        );

        return this.invokeForSteps(stepsPrompt, feature);
    }

    private async safeInvoke(prompt: string): Promise<string> {
        try {
            const resp = (await this.model.invoke([new HumanMessage(prompt)])) as AIMessage;
            return unwrapContent(resp.content);
        } catch (err: any) {
            this.output.appendLine(
                `❌ Modellaufruf fehlgeschlagen: ${err?.message ?? err}`
            );
            this.output.appendLine(
                "ℹ️ Prüfe: Läuft `ollama serve`? Ist das Modell gepullt (z. B. `ollama run llama3.2`)?"
            );
            throw err;
        }
    }

    private async invokeForSteps(prompt: string, feature: string): Promise<string> {
        this.output.appendLine("▶ Erzeuge Steps…");
        this.output.appendLine(`🧩 StepsPrompt-Länge: ${prompt.length}`);

        let resp = await this.safeInvoke(prompt);
        let code = this.sanitizeStepsOutput(resp);

        if (!this.looksLikeSteps(code)) {
            this.output.appendLine("⚠️ Steps ungültig – versuche strengere Instruktion…");
            const retryPrompt = `${prompt}\n\nReturn ONLY TypeScript step-definitions. Begin with:
        import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
        import * as sel from '../selectors/orchestrator_selectors';`;
            resp = await this.safeInvoke(retryPrompt);
            code = this.sanitizeStepsOutput(resp);
        }

        // Universelle Regex-Steps injizieren (falls fehlen)
        code = this.ensureUniversalSteps(code);

        // String-basierte Steps auf das Feature runter filtern (Regex-Steps immer behalten)
        code = this.filterStepsToFeature(code, feature);

        if (!this.looksLikeSteps(code)) {
            this.output.appendLine("❌ Steps nach Filterung ungültig. Vorschau:");
            this.output.appendLine(code.slice(0, 300));
            throw new Error("Post-filter step-definition code not valid.");
        }

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

    private ensureUniversalSteps(code: string): string {
        if (!/from\s+['"]@badeball\/cypress-cucumber-preprocessor['"]/.test(code)) {
            code = `import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';\n` + code;
        }
        if (!/import\s+\*\s+as\s+sel\s+from\s+'\.\.\/selectors\/orchestrator_selectors'/.test(code)) {
            code = code.replace(
                /import\s+\*\s+as\s+sel\s+from\s+['"][^'"]+['"];/,
                "import * as sel from '../selectors/orchestrator_selectors';"
            );
            if (!/import\s+\*\s+as\s+sel\s+from\s+'\.\.\/selectors\/orchestrator_selectors'/.test(code)) {
                code = `import * as sel from '../selectors/orchestrator_selectors';\n` + code;
            }
        }

        const haveClicks = /When\(\s*\/\^.*clicks/i.test(code);
        const haveShown  = /Then\(\s*\/\^\(\?:the \)\?.+ should be (?:shown|visible)/i.test(code);
        const haveChange = /When\(\s*\/\^he changes the/i.test(code);
        const haveHome   = /Given\(\s*\/\^the Customer is on the homepage/i.test(code);

        const universal = `
Given(/^the Customer is on the homepage$/i, () => {
  return sel.visitHomepage();
});

When(/^he clicks\\s+"?(.+?)"?$/i, (label: string) => {
  return sel.clickLabel(label);
});

Then(/^(?:the )?(.+?) should be (?:shown|visible)$/i, (text: string) => {
  return sel.getHeading(text)
    .then($h => $h && ($h as any).length ? cy.wrap($h) : sel.getLabel(text))
    .should('be.visible');
});

When(/^he changes the\\s+(.+?)\\s+"?(.+?)"?$/i, (field: string, value: string) => {
  return sel.inputByLabel(field).clear().type(value);
});

Then(/^a changed\\s+(.+?)\\s+should be shown\\s+"?(.+?)"?$/i, (_field: string, value: string) => {
  return sel.getLabel(value).should('be.visible');
});
`.trim();

        const importEnd = code.match(/^(?:import[\s\S]*?\n)+/);
        const head = importEnd ? importEnd[0] : '';
        const body = code.slice(head.length);

        const blocks = universal.split('\n\n');
        const inject =
            (haveHome  ? '' : `\n${blocks[0]}\n`) +
            (haveClicks? '' : `\n${blocks[1]}\n`) +
            (haveShown ? '' : `\n${blocks[2]}\n`) +
            (haveChange? '' : `\n${blocks[3]}\n`) +
            ( /Then\(\s*\/\^a changed/i.test(code) ? '' : `\n${blocks[4]}\n` );

        return head + inject.trim() + '\n' + body.trim();
    }

    private filterStepsToFeature(code: string, feature: string): string {
        const norm = (s: string) =>
            s.replace(/"<[^"]+>"/g, '"{string}"')
                .replace(/<[^>]+>/g, '{string}')
                .replace(/\s+/g, ' ')
                .toLowerCase()
                .trim();

        const featureLines = feature.split(/\r?\n/).map(norm);

        const headerMatch = code.match(/^[\s\S]*?(?=(?:\bGiven\b|\bWhen\b|\bThen\b)\s*\()/);
        const header = headerMatch ? headerMatch[0] : '';

        const kept: string[] = [];

        // Regex-basierte Steps IMMER behalten
        const reBlockRegex =
            /(Given|When|Then|And|But)\(\s*\/[\s\S]*?\/[a-z]*\s*,\s*\([^)]*\)\s*=>\s*\{[\s\S]*?}\s*\);/gi;
        let m: RegExpExecArray | null;
        while ((m = reBlockRegex.exec(code)) !== null) {kept.push(m[0]);}

        const hasUniversalClick   = kept.some(s => /When\(\s*\/\^.*clicks/i.test(s));
        const hasUniversalShown   = kept.some(s => /Then\(\s*\/\^\(\?:the \)\?.+ should be (?:shown|visible)/i.test(s));
        const hasUniversalHome    = kept.some(s => /Given\(\s*\/\^the Customer is on the homepage/i.test(s));
        const hasUniversalChange  = kept.some(s => /When\(\s*\/\^he changes the/i.test(s));

        const isCoveredByUniversal = (p: string) =>
            (hasUniversalHome   && /^the customer is on the homepage\b/.test(p))
            || (hasUniversalClick  && /^he clicks\b/.test(p))
            || (hasUniversalShown  && /^the .+ should be (shown|visible)\b/.test(p))
            || (hasUniversalChange && /^he changes the\b/.test(p))
            || (hasUniversalShown  && /^a changed .+ should be shown\b/.test(p));

        // String-basierte Steps nur behalten, wenn im Feature vorhanden UND
        // nicht durch Universal-Regex bereits abgedeckt
        const reBlockStr =
            /(Given|When|Then|And|But)\(\s*(['"])(.*?)\2\s*,\s*\([^)]*\)\s*=>\s*\{[\s\S]*?}\s*\);/gi;

        while ((m = reBlockStr.exec(code)) !== null) {
            const raw  = m[3];
            const pat  = norm(raw);
            if (isCoveredByUniversal(pat)) {continue;}
            let keep = featureLines.some(line => line.includes(pat));
            if (!keep) {
                const idx = pat.indexOf('{string}');
                if (idx !== -1) {
                    const prefix = pat.slice(0, idx).trim();
                    keep = !!prefix && featureLines.some(line => line.startsWith(prefix));
                }
            }
            if (keep) {kept.push(m[0]);}
        }

        return (header + '\n' + kept.join('\n')).trim();
    }

    private looksLikeSteps(code: string): boolean {
        const hasImportGWT = /(^|\n)\s*import\s+{?\s*Given\s*,\s*When\s*,\s*Then\s*}?/.test(code);
        const refersSelPath =
            /import\s+\*\s+as\s+sel\s+from\s+'(?:\.\/orchestrator_selectors|\.\.\/selectors\/orchestrator_selectors)'/.test(code);
        const usesSelCalls   = /\bsel\.\w+\s*\(/.test(code);
        const noCyVisitProxy = !/\bcy\.visitHomepage\s*\(/.test(code);
        const noCyGetSel     = !/cy\.get\s*\(\s*sel\./.test(code);
        const noLocation     = !/cy\.location\s*\(/.test(code);

        return hasImportGWT && refersSelPath && usesSelCalls &&
            noCyVisitProxy && noCyGetSel && noLocation;
    }
}


