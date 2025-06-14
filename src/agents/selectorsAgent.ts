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
  chat: (messages: ChatMessage[]) => Promise<string>;
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
      __dirname,
      '..', '..',
      'prompts',
      'selectors_instruction.txt'
    );
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // 2) Message-History erweitern
    const messages: ChatMessage[] = [
      ...this.msgs,
      { role: 'system',    content: systemPrompt },
      { role: 'user',      content: feature },
    ];

    // 3) An LLM schicken
    const response = await this.llmClient.chat(messages);
    return response;
  }
}
