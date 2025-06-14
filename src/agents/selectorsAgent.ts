// src/agents/selectorsAgent.ts

import * as fs from 'fs';
import * as path from 'path';

/**
 * Einfacher Typ für Chat-Messages
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Minimaler Typ für einen LLM-Client
 */
export interface LLmClient {
  chat: (messages: ChatMessage[]) => Promise<any>;
}

/**
 * Agent, der aus Feature-Text Selektoren generiert.
 */
export class SelectorsAgent {
  constructor(
    private msgs: ChatMessage[],
    private llmClient: LLmClient
  ) {}

  public async generate(feature: string): Promise<string> {
    // 1) Prompt laden
    const promptPath = path.join(
      __dirname, '..', '..', 'prompts', 'selectors_instruction.txt'
    );
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // 2) Message-History erweitern
    const messages: ChatMessage[] = [
      ...this.msgs,
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: feature }
    ];

    // 3) Raw-Antwort vom LLM holen
    const raw = await this.llmClient.chat(messages);

    // 4) Text extrahieren (anpassen, falls dein Client anderes Shape liefert)
    let text: string;
    if (typeof raw === 'string') {
      text = raw;
    } else if (Array.isArray(raw.choices) && raw.choices[0]?.message?.content) {
      text = raw.choices[0].message.content;
    } else if (Array.isArray(raw.choices) && raw.choices[0]?.text) {
      text = raw.choices[0].text;
    } else {
      console.error('Unexpected LLM response shape in SelectorsAgent:', raw);
      text = JSON.stringify(raw);
    }

    return text.trim();
  }
}
