// src/orchestrator.ts

import * as fs from 'fs';
import * as path from 'path';
import { window, workspace, OutputChannel } from 'vscode';
import ollama from 'ollama';

import { ChatMessage, SelectorsAgent } from './agents/selectorsAgent';
import { StepsAgent } from './agents/stepsAgent';
import {
  VerificationAgent,
  VerifyResult,
} from './agents/verificationAgent';

export class Orchestrator {
  // we accumulate chat history here
  private msgs: ChatMessage[] = [];
  private output: OutputChannel;

  // simple wrapper over ollama.chat
  private llmClient = {
    chat: async (messages: ChatMessage[]): Promise<string> => {
      const resp: any = await (ollama as any).chat({
        model: 'llama3.2',
        messages,
      });
      // adjust depending on your version of ollama-client
      return (
        resp.choices?.[0]?.message?.content ??
        resp.choices?.[0]?.text ??
        String(resp)
      );
    },
  };

  constructor(private featureFile: string) {
    this.output = window.createOutputChannel('LLM-Orchestrator');
  }

  public async run(): Promise<void> {
    try {
      // ─── 1) Load Feature ─────────────────────────────────────────────────────
      const feature = fs.readFileSync(this.featureFile, 'utf-8');
      this.msgs.push({ role: 'user', content: feature });
      this.output.appendLine(
        `🔖 Loaded feature: ${path.basename(this.featureFile)}`
      );

      // ─── 2) Generate Selectors ──────────────────────────────────────────────
      this.output.appendLine('🔍 Running SelectorsAgent...');
      const selectorsAgent = new SelectorsAgent(this.msgs, this.llmClient);
      const selectorsCode = await selectorsAgent.generate(feature);
      const selectorsPath = this.writeFile(
        'generated_selectors.ts',
        selectorsCode
      );
      this.msgs.push({ role: 'assistant', content: selectorsCode });
      this.output.appendLine(`✅ selectors written to ${selectorsPath}`);

      // ─── 3) Generate Steps ─────────────────────────────────────────────────
      this.output.appendLine('📝 Running StepsAgent...');
      const stepsAgent = new StepsAgent(this.msgs, this.llmClient);
      const stepsCode = await stepsAgent.generate(feature, selectorsCode);
      const stepsPath = this.writeFile('generated_steps.ts', stepsCode);
      this.msgs.push({ role: 'assistant', content: stepsCode });
      this.output.appendLine(`✅ steps written to ${stepsPath}`);

      // ─── 4) LLM-based Verification ────────────────────────────────────────
      this.output.appendLine('✔️ Running VerificationAgent...');
      const verifier = new VerificationAgent(this.llmClient);
      const result: VerifyResult = await verifier.verify(
        selectorsCode,
        stepsCode
      );

      if (result.passed) {
        this.output.appendLine('🎉 Verification passed: ALL_OK');
      } else {
        this.output.appendLine(
          '❌ Verification found issues — applying LLM-suggested fixes...'
        );
        if (result.correctedSelectors) {
          const fixedSelPath = this.writeFile(
            'fixed_selectors.ts',
            result.correctedSelectors
          );
          this.output.appendLine(`🔄 corrected selectors → ${fixedSelPath}`);
        }
        if (result.correctedSteps) {
          const fixedStepsPath = this.writeFile(
            'fixed_steps.ts',
            result.correctedSteps
          );
          this.output.appendLine(`🔄 corrected steps → ${fixedStepsPath}`);
        }
      }

      this.output.show(true);
    } catch (err: any) {
      window.showErrorMessage(`Orchestrator error: ${err.message || err}`);
    }
  }

  /**
   * Helper to write into cypress/e2e folder
   */
  private writeFile(filename: string, content: string): string {
    const wsRoot = workspace.workspaceFolders?.[0].uri.fsPath ?? process.cwd();
    const outDir = path.join(wsRoot, 'cypress', 'e2e');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, content, 'utf-8');
    this.output.appendLine(`Wrote: ${outPath}`);
    return outPath;
  }
}
