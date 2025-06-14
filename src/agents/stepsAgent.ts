// src/agents/stepsAgent.ts

import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage, LLmClient } from './selectorsAgent';

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
      __dirname, '..', '..', 'prompts', 'steps_instruction.txt'
    );
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // 2) Message-History erweitern
    const messages: ChatMessage[] = [
      ...this.msgs,
      { role: 'assistant', content: selectorsCode },
      { role: 'system',    content: systemPrompt   },
      { role: 'user',      content: feature        }
    ];

    // 3) Raw-Antwort vom LLM holen
    const raw = await this.llmClient.chat(messages);

    // 4) Text extrahieren
    let text: string;
    if (typeof raw === 'string') {
      text = raw;
    } else if (Array.isArray(raw.choices) && raw.choices[0]?.message?.content) {
      text = raw.choices[0].message.content;
    } else if (Array.isArray(raw.choices) && raw.choices[0]?.text) {
      text = raw.choices[0].text;
    } else {
      console.error('Unexpected LLM response shape in StepsAgent:', raw);
      text = JSON.stringify(raw);
    }

    return text.trim();
  }
}
