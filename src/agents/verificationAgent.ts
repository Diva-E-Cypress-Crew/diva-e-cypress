// src/agents/verificationAgent.ts

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage, LLmClient } from './selectorsAgent';

export interface VerifyResult {
  passed: boolean;
  errors: string[];
  correctedSelectors?: string;
  correctedSteps?: string;
}

export class VerificationAgent {
  constructor(private llmClient: LLmClient) {}

  public async verify(
    selectorsCode: string,
    stepsCode: string
  ): Promise<VerifyResult> {
    const errors: string[] = [];

    // 1) Syntax‐Check via transpileModule
    const selDiag = ts.transpileModule(selectorsCode, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
      reportDiagnostics: true
    }).diagnostics ?? [];
    const stpDiag = ts.transpileModule(stepsCode, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
      reportDiagnostics: true
    }).diagnostics ?? [];

    selDiag.concat(stpDiag).forEach(d => {
      errors.push(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    });

    // 2) Konsistenz‐Check Imports vs. Exports
    const selExports = this.extractExports(selectorsCode);
    const stpImports = this.extractImports(stepsCode);
    const missing    = stpImports.filter(name => !selExports.includes(name));
    if (missing.length) {
      errors.push(`Missing selector exports for: ${missing.join(', ')}`);
    }

    // 3) Wenn keine Fehler, fertig
    if (errors.length === 0) {
      return { passed: true, errors };
    }

    // 4) LLM‐Fix nur bei Fehlern
    const promptPath = path.join(
      __dirname, '..', '..', 'prompts', 'verification_instruction.txt'
    );
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    const messages: ChatMessage[] = [
      { role: 'system',    content: systemPrompt   },
      { role: 'assistant', content: selectorsCode },
      { role: 'assistant', content: stepsCode     },
      {
        role: 'user',
        content:
          'Errors:\n' +
          errors.map(e => `- ${e}`).join('\n') +
          '\n\nPlease return exactly a JSON object with two keys:\n' +
          '"selectors": "<full corrected selectors file or null>",\n' +
          '"steps":    "<full corrected steps file or null>"\n' +
          'Use actual newlines, no escapes or fences.'
      }
    ];

    const raw = await this.llmClient.chat(messages);

    let fixedSelectors: string|undefined;
    let fixedSteps:    string|undefined;
    try {
      const obj = JSON.parse(raw);
      if (typeof obj.selectors === 'string') fixedSelectors = obj.selectors;
      if (typeof obj.steps     === 'string') fixedSteps    = obj.steps;
    } catch {
      errors.push('LLM response was not valid JSON');
    }

    return {
      passed: false,
      errors,
      correctedSelectors: fixedSelectors,
      correctedSteps:    fixedSteps
    };
  }

  private extractExports(code: string): string[] {
    const sf = ts.createSourceFile('sel.ts', code, ts.ScriptTarget.Latest, true);
    const names: string[] = [];
    sf.forEachChild(node => {
      if (
        ts.isVariableStatement(node) &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            names.push(decl.name.text);
          }
        });
      }
    });
    return names;
  }

  private extractImports(code: string): string[] {
    const sf = ts.createSourceFile('stp.ts', code, ts.ScriptTarget.Latest, true);
    const names: string[] = [];
    sf.forEachChild(node => {
      if (
        ts.isImportDeclaration(node) &&
        node.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        node.importClause.namedBindings.elements.forEach(el => {
          names.push(el.name.text);
        });
      }
    });
    return names;
  }
}
