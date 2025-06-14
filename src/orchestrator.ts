// src/orchestrator.ts

import * as fs from 'fs';
import * as path from 'path';
import { window, OutputChannel } from 'vscode';
import ollama from 'ollama';

import { ChatMessage, SelectorsAgent } from './agents/selectorsAgent';
import { StepsAgent }                   from './agents/stepsAgent';
import {
  VerificationAgent,
  VerifyResult
} from './agents/verificationAgent';

export class Orchestrator {
  private msgs: ChatMessage[] = [];
  private output: OutputChannel;

  private llmClient = {
    chat: async (messages: ChatMessage[]): Promise<string> => {
      const resp: any = await (ollama as any).chat({
        model: 'llama3.2',
        messages
      });
      return (
        resp.choices?.[0]?.message?.content ??
        resp.choices?.[0]?.text ??
        JSON.stringify(resp)
      ).trim();
    }
  };

  constructor(private featureFile: string) {
    this.output = window.createOutputChannel('LLM-Orchestrator');
  }

  public async run(): Promise<void> {
    try {
      this.output.clear();
      this.output.show(true);
      this.output.appendLine(`🚀 Orchestrator started for ${path.basename(this.featureFile)}`);

      // 1) Load feature
      const feature = fs.readFileSync(this.featureFile, 'utf-8');
      this.msgs.push({ role: 'user', content: feature });

      // 2) Calculate fixed filenames
      const dir     = path.dirname(this.featureFile);
      const selFile = 'orchestrator_selectors.ts';
      const stpFile = 'orchestrator_steps.ts';

      // 3) SelectorsAgent
      this.output.appendLine('🔍 Running SelectorsAgent…');
      const selAgent      = new SelectorsAgent(this.msgs, this.llmClient);
      const selectorsCode = await selAgent.generate(feature);
      const selPath       = path.join(dir, selFile);
      fs.writeFileSync(selPath, selectorsCode, 'utf-8');
      this.msgs.push({ role: 'assistant', content: selectorsCode });
      this.output.appendLine(`✅ Selectors overwritten in ${selFile}`);

      // 4) StepsAgent
      this.output.appendLine('📝 Running StepsAgent…');
      const stpAgent  = new StepsAgent(this.msgs, this.llmClient);
      const stepsCode = await stpAgent.generate(feature, selectorsCode);
      const stpPath   = path.join(dir, stpFile);
      fs.writeFileSync(stpPath, stepsCode, 'utf-8');
      this.msgs.push({ role: 'assistant', content: stepsCode });
      this.output.appendLine(`✅ Steps overwritten in ${stpFile}`);

      // 5) VerificationAgent
      this.output.appendLine('✔️ Running VerificationAgent…');
      const verifier: VerificationAgent = new VerificationAgent(this.llmClient);
      const result: VerifyResult = await verifier.verify(selectorsCode, stepsCode);

      if (result.passed) {
        this.output.appendLine('🎉 Verification passed: both files are valid.');
      } else {
        this.output.appendLine('❌ Verification failed – applying fixes…');
        if (result.correctedSelectors) {
          fs.writeFileSync(selPath, result.correctedSelectors, 'utf-8');
          this.output.appendLine(`🔄 selectors fixed in ${selFile}`);
        }
        if (result.correctedSteps) {
          fs.writeFileSync(stpPath, result.correctedSteps, 'utf-8');
          this.output.appendLine(`🔄 steps fixed in ${stpFile}`);
        }
      }
    } catch (err: any) {
      window.showErrorMessage(`Orchestrator error: ${err.message || err}`);
    }
  }
}
