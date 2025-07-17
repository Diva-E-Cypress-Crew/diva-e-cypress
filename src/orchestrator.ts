import * as fs from 'fs';
import * as path from 'path';
import { window, OutputChannel } from 'vscode';
import ollama from 'ollama';
import puppeteer from 'puppeteer';

import { ChatMessage, SelectorsAgent } from './agents/selectorsAgent';
import { StepsAgent }                  from './agents/stepsAgent';
// import { VerificationAgent }        from './agents/verificationAgent';

function stripFences(text: string): string {
  return text.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
}

export class Orchestrator {
  private msgs: ChatMessage[] = [];
  private output: OutputChannel;
  private llmClient = {
    chat: async (messages: ChatMessage[]): Promise<string> => {
      const res: any = await (ollama as any).chat({
        model: 'gemma2:9b',
        messages
      });
      return (
        res.choices?.[0]?.message?.content ??
        res.message?.content ??
        res.choices?.[0]?.text ??
        JSON.stringify(res)
      ).trim();
    }
  };

  constructor(
    private featureFile: string,
    private baseUrl: string
  ) {
    this.output = window.createOutputChannel('LLM-Orchestrator');
  }

  public async run(): Promise<void> {
    try {
      this.output.clear();
      this.output.show(true);
      this.output.appendLine(`🚀 Orchestrator started for ${path.basename(this.featureFile)}`);

      // 1) Feature einlesen
      const feature = fs.readFileSync(this.featureFile, 'utf-8');
      this.msgs.push({ role: 'user', content: "You are an Expert at writing Cypress Tests and I need your help for writing tests for my homepage: " + this.baseUrl });
      this.msgs.push({ role: 'user', content: "Therefore first take a look at the following feature file: \n" + feature });


      // 2) Ausgabe-Pfade
      const dir     = path.dirname(path.dirname(this.featureFile));
      const selPath = path.join(dir, 'common/selectors/orchestrator_selectors.ts');
      const stpPath = path.join(dir, 'common/steps/orchestrator_steps.ts');

      // 3) HTML via Puppeteer
      this.output.appendLine('🔍 Reading HTML');
      const browser = await puppeteer.launch();
      const page    = await browser.newPage();
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      await page.waitForSelector('body'); 
      const htmlSnapshot = await page.content();
      this.msgs.push({ role: 'user', content: "Please remember the structure of this website (full HTML):\n" + htmlSnapshot });
      this.output.appendLine('🌍 Puppeteer page.url(): ' + page.url()); // DEBUG: Zeige finale URL
      const snapDir = path.resolve(__dirname, '..', 'log');
      if (!fs.existsSync(snapDir)) {
        fs.mkdirSync(snapDir, { recursive: true });
      }
      const debugPath = path.join(snapDir, 'debug_snapshot.html');
      fs.writeFileSync(debugPath, htmlSnapshot, 'utf-8');
      this.output.appendLine(`🐞 Debug HTML Snapshot written to ${debugPath} !`);
      await browser.close();

      // 4) Selector-Agent
      this.output.appendLine('🔍 Running SelectorsAgent…');
      const selAgent = new SelectorsAgent(this.msgs, this.llmClient);
      let selectorsCode = await selAgent.generate(feature, htmlSnapshot);
      selectorsCode = stripFences(selectorsCode);
      fs.writeFileSync(selPath, selectorsCode, 'utf-8');
      this.output.appendLine(`✅ Selectors written to common/selectors/orchestrator_selectors.ts`);
      this.msgs.push({ role: 'assistant', content: selectorsCode });

      // 5) Steps-Agent
      this.output.appendLine('📝 Running StepsAgent…');
      const stpAgent = new StepsAgent(this.msgs, this.llmClient);
      let stepsCode = await stpAgent.generate(feature, selectorsCode);
      stepsCode = stripFences(stepsCode);
      fs.writeFileSync(stpPath, stepsCode, 'utf-8');
      this.output.appendLine(`✅ Steps written to common/steps/orchestrator_steps.ts`);
      this.msgs.push({ role: 'assistant', content: stepsCode });

      // 6) Log schreiben
      const now    = new Date();
      const ts     = now.toISOString().replace(/:/g, '-').split('.')[0];
      const logDir = path.resolve(__dirname, '..', 'log');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logPath = path.join(logDir, `${ts}_log.txt`);
      fs.writeFileSync(logPath, JSON.stringify(this.msgs, null, 2), 'utf-8');
      this.output.appendLine(`📄 Log written to ${logPath}`);

      // 7) VerificationAgent ausgegraut
      /*
      this.output.appendLine('✔️ Running VerificationAgent…');
      const verifier = new VerificationAgent(this.llmClient);
      const result   = await verifier.verify(selectorsCode, stepsCode, htmlSnapshot);

      if (result.passed) {
        this.output.appendLine('🎉 Verification passed.');
      } else {
        this.output.appendLine('❌ Verification failed – applying fixes…');
      }
      */
    } catch (err: any) {
      window.showErrorMessage(`Orchestrator error: ${err.message}`);
    }
  }
}
