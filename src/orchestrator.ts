import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { window, OutputChannel } from 'vscode';
import ollama from 'ollama';

import { ChatMessage, SelectorsAgent } from './agents/selectorsAgent';
import { StepsAgent } from './agents/stepsAgent';
import { VerificationAgent } from './agents/verificationAgent';

// remove import { runCypress } from './cypressRunner'; 
// (we won't call runCypress() directly here anymore)

export class Orchestrator {
  private msgs: ChatMessage[] = [];
  private output: OutputChannel;

  private llmClient = {
    chat: async (messages: ChatMessage[]): Promise<string> => {
      const resp: any = await (ollama as any).chat({
        model: 'llama3.2',
        messages
      });
      const content =
        resp.choices?.[0]?.message?.content
          ?? resp.message?.content
          ?? resp.choices?.[0]?.text
          ?? JSON.stringify(resp);
      return content.trim();
    }
  };

  constructor(private featureFile: string) {
    this.output = window.createOutputChannel('LLM-Orchestrator');
  }

  public async run(): Promise<void> {
    try {
      this.output.clear();
      this.output.show(true);
      this.output.appendLine(
        `🚀 Orchestrator started for ${path.basename(this.featureFile)}`
      );

      const feature = fs.readFileSync(this.featureFile, 'utf-8');
      this.msgs.push({ role: 'user', content: feature });

      const dir = path.dirname(this.featureFile);
      const selFile = 'orchestrator_selectors.ts';
      const stpFile = 'orchestrator_steps.ts';

      this.output.appendLine('🔍 Running SelectorsAgent…');
      const selAgent = new SelectorsAgent(this.msgs, this.llmClient);
      const selectorsCode = await selAgent.generate(feature);
      const selPath = path.join(dir, selFile);
      fs.writeFileSync(selPath, selectorsCode, 'utf-8');
      this.msgs.push({ role: 'assistant', content: selectorsCode });
      this.output.appendLine(`✅ Selectors written to ${selFile}`);

      this.output.appendLine('📝 Running StepsAgent…');
      const stpAgent = new StepsAgent(this.msgs, this.llmClient);
      const stepsCode = await stpAgent.generate(feature, selectorsCode);
      const stpPath = path.join(dir, stpFile);
      fs.writeFileSync(stpPath, stepsCode, 'utf-8');
      this.msgs.push({ role: 'assistant', content: stepsCode });
      this.output.appendLine(`✅ Steps written to ${stpFile}`);

      // ——— 5) CypressAgent — spawn a separate Node.js process ———
      this.output.appendLine('📝 Running CypressAgent…');
      this.output.appendLine(this.featureFile);

      // Path to the JS file that runs Cypress (compiled from cypressRunner.ts)
      const runnerPath = path.resolve(__dirname, 'cypressRunner.js');

      const cypressProc = spawn('node', [runnerPath, this.featureFile], {
        shell: true,
        cwd: process.cwd(),
      });

      let cypressLog = '';

      cypressProc.stdout.on('data', (data) => {
        const text = data.toString();
        this.output.appendLine(text);
        cypressLog += text;
      });

      cypressProc.stderr.on('data', (data) => {
        const text = data.toString();
        this.output.appendLine(text);
        cypressLog += text;
      });

      await new Promise<void>((resolve) => {
        cypressProc.on('close', (code) => {
          if (code !== 0) {
            this.output.appendLine(`❌ Cypress exited with code ${code}`);
          } else {
            this.output.appendLine('✅ Cypress run completed successfully');
          }
          resolve();
        });
      });

      // you can log full Cypress output if you want:
      this.output.appendLine('--- Cypress output end ---');

      // ——— 6) VerificationAgent —————————
      this.output.appendLine('✔️ Running VerificationAgent…');
      const verifier = new VerificationAgent(this.llmClient);
      const result = await verifier.verify(selectorsCode, stepsCode);

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
