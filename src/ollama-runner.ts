// ollama-runner.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import ollama from 'ollama';
import puppeteer from 'puppeteer';
import path from "node:path";

export function runOllama(outputChannel: vscode.OutputChannel, featureFilePath: string, context: vscode.ExtensionContext) {
  const messages: { role: 'user' | 'assistant'; content: string }[] = [];

  async function getResponse(message: string): Promise<string> {
    messages.push({ role: 'user', content: message });
    const response = await (ollama as any).chat({
      model: 'llama3.2',
      messages,
    });
    messages.push({ role: 'assistant', content: response.message.content });
    outputChannel.appendLine(response.message.content);
    return response.message.content.toString();
  }

  function stripCodeFences(text: string): string {
    // Entfernt versehentlich eingebettete ```-Ticks, falls das LLM welche liefert
    return text.replace(/^```[a-zA-Z]*\r?\n/, '').replace(/\r?\n```$/, '');
  }

  async function main() {
    // 1) DEBUG: Prüfen, ob featureFilePath korrekt ist
    console.log('DEBUG featureFilePath =', featureFilePath);
    // Erwartet z. B. ".../DIVA-E-CYPRESS" als featureFilePath

    // ─── 2) Feature-Datei einlesen ─────────────────────────────────────────
    // Pfad: <featureFilePath>/features/demo.feature
    let featureFile: string;
    try {
      featureFile = fs.readFileSync(featureFilePath, 'utf8');
    } catch (err: any) {
      outputChannel.appendLine(
          `❌ Hauptfehler: Feature-Datei nicht gefunden unter "${featureFilePath}".\n` +
          `Bitte prüfe, ob die Datei existiert und ob "featureFilePath" korrekt übergeben wurde.`
      );
      return;
    }

    // Sende dem LLM das komplette Feature-File
    let message = 'Please remember this entire .feature file:\n' + featureFile;
    await getResponse(message);

    // ─── 3) HTML der Zielseite per Puppeteer holen ────────────────────────
    let pageSourceHTML: string;
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto('https://meag.gitlab.diva-e.com/investmentrechner-2023/');
      pageSourceHTML = await page.content();
      await browser.close();
    } catch (err: any) {
      outputChannel.appendLine(`❌ Main error beim Abrufen der HTML-Seite: ${err.message}`);
      return;
    }

    // Sende dem LLM das komplette HTML der Zielseite
    message = 'Please remember the structure of this website (full HTML):\n' + pageSourceHTML;
    await getResponse(message);

    // ─── 4) Prompt für ollama_selectors.ts ────────────────────────────────
    //
    // **NEUE INSTRUKTION**: Ollama soll **ausschließlich** TS‐Code ausgeben.
    // Keine Kommentare, keine Markdown‐Fences, keine weiteren Erklärungen.
    // Nur reine "export const <Name> = () => { return cy.get(...); };"‐Blöcke.


      //'C:\Users\Felix\AppData\Local\Programs\Microsoft VS Code\prompts\selectors_instruction.txt'

    let messagePath = context.asAbsolutePath('prompts/selectors_instruction.txt');
    message = fs.readFileSync(messagePath, 'utf-8');

    const responseSelectors = await getResponse(message);
    const cleanedSelectors = stripCodeFences(responseSelectors);

    // ─── 4a) Selektoren-Datei schreiben ─────────────────────────────────────
    const selectorsDir = path.dirname(featureFilePath);
    const featureName: string = path.basename(selectorsDir)
    if (!fs.existsSync(selectorsDir)) {
      fs.mkdirSync(selectorsDir, { recursive: true });
    }
    const selectorsPath = `${selectorsDir}/${featureName}_selectors.ts`;
    fs.writeFile(selectorsPath, cleanedSelectors, (err) => {
      if (err) {
        outputChannel.appendLine(`❌ Error writing selectors file: ${err.message}`);
      } else {
        outputChannel.appendLine(`✅ selectors-Datei erfolgreich geschrieben: ${selectorsPath}`);
      }
    });

    // ─── 5) Prompt für ollama_steps.ts ─────────────────────────────────────
    //
    // **NEUE INSTRUKTION**: Ollama soll **ausschließlich** TS‐Code ausgeben.
    // Keine Kommentare, keine Markdown‐Fences, keine weiteren Erklärungen.
    // Nur reine Step-Definitionen in der Form:
    // Given('...', () => { return helper(); });
    // When('...', (arg) => { return helper(arg); });
    // Then('...', () => { return helper().should(...); });
    // Nach dem letzten Semikolon endet die Datei.

    messagePath = context.asAbsolutePath('prompts/steps_instruction.txt');
    message = fs.readFileSync(messagePath, 'utf-8');

    const responseSteps = await getResponse(message);
    const cleanedSteps = stripCodeFences(responseSteps);

    // ─── 5a) Schritte-Datei schreiben ───────────────────────────────────────
    const stepsDir = path.dirname(featureFilePath);
    if (!fs.existsSync(stepsDir)) {
      fs.mkdirSync(stepsDir, { recursive: true });
    }
    const stepsPath = `${stepsDir}/${featureName}_steps.ts`;
    fs.writeFile(stepsPath, cleanedSteps, (err) => {
      if (err) {
        outputChannel.appendLine(`❌ Error writing steps file: ${err.message}`);
      } else {
        outputChannel.appendLine(`✅ steps-Datei erfolgreich geschrieben: ${stepsPath}`);
      }
    });
  }

  main().catch((err) => outputChannel.appendLine(`❌ Main error: ${err.message}`));
}
