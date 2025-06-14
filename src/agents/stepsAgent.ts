// src/agents/stepsAgent.ts

import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage } from './selectorsAgent';
import { LLmClient } from './selectorsAgent';

/**
 * Agent, der aus Feature-Text + Selektoren die Step-Definitions baut.
 */
export class StepsAgent {
  constructor(
    private msgs: ChatMessage[],
    private llmClient: LLmClient
  ) {}

  public async generate(
    feature: string,
    selectorsCode: string
  ): Promise<string> {
    // 1) Prompt laden
    const promptPath = path.join(
      __dirname,
      '..', '..',
      'prompts',
      'steps_instruction.txt'
    );
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // 2) Message-History erweitern
    const messages: ChatMessage[] = [
      ...this.msgs,
      // Zuerst den Assist-Context mit den generierten Selektoren
      { role: 'assistant', content: selectorsCode },
      // Dann das System-Prompt für Steps
      { role: 'system',    content: systemPrompt  },
      // Dann der Feature-Text nochmal als User-Input
      { role: 'user',      content: feature       },
    ];

    // 3) An LLM schicken
    const response = await this.llmClient.chat(messages);
    return response;
  }
}
