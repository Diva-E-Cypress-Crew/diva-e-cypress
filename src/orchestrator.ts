// src/orchestrator.ts

import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

// LangChain / LangGraph
import { ChatOllama } from '@langchain/ollama';
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Eigene Prompt‑Templates
import { SelectorsPrompt } from '../prompts/selectors_instruction';
import { StepsPrompt }     from '../prompts/steps_instruction';

export class Orchestrator {
  private model: ChatOllama;

  constructor(
    private featureFile: string,
    private baseUrl: string
  ) {
    // Ollama‑Chatmodell initialisieren
    this.model = new ChatOllama({ model: 'llama3.2', temperature: 0 });
  }

  public async run(): Promise<void> {
    // ─── 1) Feature einlesen ────────────────────────────────────────────────
    const feature = fs.readFileSync(this.featureFile, 'utf-8');

    // ─── 2) HTML‑Snapshot via Puppeteer ─────────────────────────────────────
    const browser = await puppeteer.launch();
    const page    = await browser.newPage();
    await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body');
    const htmlSnapshot = await page.content();
    await browser.close();

    // ─── 3) Graph‑Definition ────────────────────────────────────────────────
    const workflow = new StateGraph(MessagesAnnotation)
      // Node für Selektoren
      .addNode('selectors', async (state) => {
        // Hinweis: wir geben hier als logFile einfach einen leeren String mit,
        // da aktuell keine Test‑Logs vorliegen.
        const promptStr = new SelectorsPrompt()
          .getPrompt(feature, htmlSnapshot);

        const aiMsg = await this.model.invoke([
          ...state.messages,
          new HumanMessage(promptStr),
        ]);
        return { messages: [aiMsg] };
      })
      .addEdge('__start__', 'selectors')

      // Node für Steps
      .addNode('steps', async (state) => {
        const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
        const selectorsCode = Array.isArray(lastMsg.content)
          ? lastMsg.content.join('')
          : lastMsg.content;

        const promptStr = new StepsPrompt().getPrompt(
          feature,
          '../selectors/orchestrator_selectors',
          selectorsCode
        );

        const aiMsg = await this.model.invoke([
          ...state.messages,
          new HumanMessage(promptStr),
        ]);
        return { messages: [aiMsg] };
      })
      .addEdge('selectors', 'steps')
      .addConditionalEdges('steps', () => '__end__');

    // ─── 4) Workflow kompilieren & ausführen ────────────────────────────────
    const app = workflow.compile();
    const finalState = await app.invoke(
      { messages: [new HumanMessage('start')] },
      { configurable: { thread_id: 'diva-e-cypress-orchestrator' } }
    );

    // ─── 5) Inhalte union‑sicher in string umwandeln ────────────────────────
    const selRaw = (finalState.messages[1] as AIMessage).content;
    const selResult = Array.isArray(selRaw)
      ? selRaw.map(c => typeof c === 'string' ? c : JSON.stringify(c)).join('')
      : selRaw;

    const stpRaw = (finalState.messages[2] as AIMessage).content;
    const stpResult = Array.isArray(stpRaw)
      ? stpRaw.map(c => typeof c === 'string' ? c : JSON.stringify(c)).join('')
      : stpRaw;

    // ─── 6) Ergebnisse abspeichern ──────────────────────────────────────────
    const projectDir = path.dirname(path.dirname(this.featureFile));

    // Selectors-Datei
    const selPath = path.join(projectDir, 'common/selectors/orchestrator_selectors.ts');
    fs.mkdirSync(path.dirname(selPath), { recursive: true });
    fs.writeFileSync(selPath, selResult, 'utf-8');

    // Steps-Datei
    const stpPath = path.join(projectDir, 'common/steps/orchestrator_steps.ts');
    fs.mkdirSync(path.dirname(stpPath), { recursive: true });
    fs.writeFileSync(stpPath, stpResult, 'utf-8');
  }
}
