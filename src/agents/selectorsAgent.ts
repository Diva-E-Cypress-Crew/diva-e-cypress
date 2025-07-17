// src/agents/selectorsAgent.ts
import { SelectorsPrompt } from '../../prompts/selectors_instruction';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLmClient {
  chat: (messages: ChatMessage[]) => Promise<any>;
}

export class SelectorsAgent {
  constructor(
    private msgs: ChatMessage[],
    private llmClient: LLmClient
  ) {}

  public async generate(
    feature: string,
    htmlSnapshot: string
  ): Promise<string> {
    // Prompt laden
    const prompt = new SelectorsPrompt().getPrompt(feature, htmlSnapshot);

    const messages: ChatMessage[] = [
      ...this.msgs,
      { role: 'user', content: prompt }
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

    // Keine weitere Extraktion, kein Parsen!!
    return text
      .replace(/^```(?:ts)?\r?\n/, '')  // Falls das LLM trotzdem mal Codefences macht
      .replace(/\r?\n```$/, '')
      .trim();
  }
}