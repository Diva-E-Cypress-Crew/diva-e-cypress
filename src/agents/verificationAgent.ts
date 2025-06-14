// src/agents/verificationAgent.ts

import * as fs from 'fs';
import * as path from 'path';

import { ChatMessage } from './selectorsAgent';  // unser gemeinsamer Message-Typ

/**
 * Ergebnis der Überprüfung:
 * - passed: true, wenn LLM “ALL_OK” zurückgegeben hat
 * - correctedSelectors / correctedSteps nur befüllt, wenn LLM Korrekturen vorschlägt
 */
export interface VerifyResult {
  passed: boolean;
  correctedSelectors?: string;
  correctedSteps?: string;
}

export class VerificationAgent {
  constructor(
    private llmClient: { chat: (msgs: ChatMessage[]) => Promise<string> }
  ) {}

  public async verify(
    selectorsCode: string,
    stepsCode: string
  ): Promise<VerifyResult> {
    // 1) Prompt laden
    const promptPath = path.join(
      __dirname,
      '..', '..',
      'prompts',
      'verification_instruction.txt'
    );
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // 2) Chat-History aufbauen
    const messages: ChatMessage[] = [
      { role: 'system',    content: systemPrompt       },
      { role: 'user',      content: selectorsCode      },
      { role: 'user',      content: stepsCode          },
    ];

    // 3) LLM aufrufen
    const reply = await this.llmClient.chat(messages);

    // 4) Auswertung
    if (reply.trim() === 'ALL_OK') {
      return { passed: true };
    }

    // 5) Beim “Fehlerfall”: Parsen der beiden Blöcke
    const selMatch  = reply.match(/BEGIN selectors\.ts([\s\S]*?)END selectors\.ts/);
    const stepMatch = reply.match(/BEGIN steps\.ts([\s\S]*?)END steps\.ts/);

    return {
      passed: false,
      correctedSelectors: selMatch  ? selMatch[1].trim()  : undefined,
      correctedSteps:    stepMatch ? stepMatch[1].trim() : undefined,
    };
  }
}
