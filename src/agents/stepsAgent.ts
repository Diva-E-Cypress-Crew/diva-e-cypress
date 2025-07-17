// src/agents/stepsAgent.ts

import { StepsPrompt } from '../../prompts/steps_instruction';
import { ChatMessage, LLmClient } from './selectorsAgent';

/**
 * Agent, der aus Feature‐Text + Selektoren Step‐Definitions baut.
 */
export class StepsAgent {
  constructor(
    private msgs: ChatMessage[],
    private llmClient: LLmClient
  ) {}

  public async generate(
    feature: string,
    selectorsTs: string
  ): Promise<string> {
    const selectorsModulePath = '../selectors/orchestrator_selectors';
    const systemPrompt = new StepsPrompt()
      .getPrompt(feature, selectorsModulePath, selectorsTs);

    const messages: ChatMessage[] = [
      ...this.msgs,
      { role: 'system', content: systemPrompt }
    ];

    const raw = await this.llmClient.chat(messages);

    let text: string;
    if (typeof raw === 'string') {
      text = raw;
    } else if (
      Array.isArray(raw.choices) &&
      raw.choices[0]?.message?.content
    ) {
      text = raw.choices[0].message.content;
    } else if (
      Array.isArray(raw.choices) &&
      raw.choices[0]?.text
    ) {
      text = raw.choices[0].text;
    } else {
      text = JSON.stringify(raw);
    }

    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith('`') && text.endsWith('`'))
    ) {
      try { text = JSON.parse(text); } catch {}
    }

    return text
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .trim();
  }
}
