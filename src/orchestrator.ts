// src/orchestrator.ts

import * as fs from 'fs';
import * as path from 'path';
import { window, OutputChannel } from 'vscode';
import ollama from 'ollama';

import { ChatMessage, SelectorsAgent } from './agents/selectorsAgent';
import { StepsAgent }                   from './agents/stepsAgent';
import { VerificationAgent }            from './agents/verificationAgent';
import puppeteer from "puppeteer";

function stripCodeFences(text: string): string {
    // Entfernt versehentlich eingebettete ```-Ticks, falls das LLM welche liefert
    return text.replace(/^```[a-zA-Z]*\r?\n/, '').replace(/\r?\n```$/, '');
  }

export class Orchestrator {
  private msgs: ChatMessage[] = [];
  private output: OutputChannel;

  // 1) LLM‐Client so anpassen, dass nur message.content zurückkommt:
  private llmClient = {
    chat: async (messages: ChatMessage[]): Promise<string> => {
      const resp: any = await (ollama as any).chat({
        model: 'gemma2:9b',
        messages
      });
      // Ollama liefert { model, created_at, message: { role, content } }
      const content =
        resp.choices?.[0]?.message?.content   // falls resp.choices vorhanden
          ?? resp.message?.content            // standard-Ollama-Format
          ?? resp.choices?.[0]?.text          // fallback
          ?? JSON.stringify(resp);            // ultimative Fallback
      return content.trim();
    }
  };

  constructor(private featureFile: string, private baseUrl: string) {
    this.output = window.createOutputChannel('LLM-Orchestrator');
  }

  

  public async run(): Promise<void> {
    try {
      this.output.clear();
      this.output.show(true);
      this.output.appendLine(
        `🚀 Orchestrator started for ${path.basename(this.featureFile)}`
      );

      // ——— 1) Feature laden ——————————————
      const feature = fs.readFileSync(this.featureFile, 'utf-8');
      this.msgs.push({ role: 'user', content: "You are an Expert at writing Cypress Tests and I need your help for writing tests for my homepage: " + this.baseUrl });
      this.msgs.push({ role: 'user', content: "Therefore first take a look at the following feature file: \n" + feature });

      // ——— 2) Ausgabedateien festlegen ——————
      const dir     = path.dirname(path.dirname(this.featureFile));
      const selFile = 'common/selectors/orchestrator_selectors.ts';
      const stpFile = 'common/steps/orchestrator_steps.ts';

      
      // ——— 3) SelectorsAgent ————————————
      // HTML lesen
      this.output.appendLine('🔍 Reading HTML');
      let pageSourceHTML: string;
      try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(this.baseUrl);
        pageSourceHTML = await page.content();
        await browser.close();
      } catch (err: any) {
        this.output.appendLine(`❌ Main error beim Abrufen der HTML-Seite: ${err.message}`);
        return;
      }
      let message = 'Please remember the structure of this website (full HTML):\n' + pageSourceHTML;
      this.msgs.push({ role: 'user', content: message });

      // Agent aufrufen
      this.output.appendLine('🔍 Running SelectorsAgent…');
      const selAgent      = new SelectorsAgent(this.msgs, this.llmClient);
      let selectorsCode = await selAgent.generate(feature);
      const selPath       = path.join(dir, selFile);

      selectorsCode = stripCodeFences(selectorsCode);
      fs.writeFileSync(selPath, selectorsCode, 'utf-8');
      this.msgs.push({ role: 'assistant', content: selectorsCode });
      this.output.appendLine(`✅ Selectors written to ${selFile}`);

      // ——— 4) StepsAgent ——————————————
      this.output.appendLine('📝 Running StepsAgent…');
      const stpPath   = path.join(dir, stpFile);
      const stpAgent  = new StepsAgent(this.msgs, this.llmClient);
      let stepsCode = await stpAgent.generate(feature, selectorsCode);
      stepsCode = stripCodeFences(stepsCode);
      fs.writeFileSync(stpPath, stepsCode, 'utf-8');
      this.msgs.push({ role: 'assistant', content: stepsCode });
      this.output.appendLine(`✅ Steps written to ${stpFile}`);

      // ——— 5) VerificationAgent —————————
      this.output.appendLine('✔️ Running VerificationAgent…');
      const verifier = new VerificationAgent(this.llmClient);
      const result   = await verifier.verify(selectorsCode, stepsCode);

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

      const now = new Date();
      const dateTime = now.toISOString().replace(/[:]/g, '-').replace(/\..+/, ''); // e.g., "2025-06-28T15-30-00"
      const fileName = `${dateTime}_log.txt`;
      const logDir = path.resolve(__dirname, '..', 'log'); // up from src/
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const filePath = path.join(logDir, fileName);

      // Convert msgs to text (you can use JSON.stringify or format as needed)
      const fileContent = JSON.stringify(this.msgs, null, 2);

      // Write to the file
      fs.writeFileSync(filePath, fileContent, 'utf8');

      console.log(`Log written to ${filePath}`);
    } catch (err: any) {
      window.showErrorMessage(`Orchestrator error: ${err.message || err}`);
    }
  }
}
