// src/huggingface-runner.ts

import * as dotenv from 'dotenv';
dotenv.config();

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { InferenceClient } from '@huggingface/inference';

/**
 * Huggingface-Runner: Verwendet @huggingface/inference für Chat-Completions,
 * um aus einer Cucumber-Feature-Datei und dem HTML-Aufbau einer Website automatisch
 * Cypress-Selectors- und Steps-Dateien zu generieren.
 *
 * Diese Version verkleinert das übermittelte HTML, um HTTP-Fehler ("Payload Too Large") zu vermeiden,
 * und fängt Fehler in getResponse() ab, damit die Dateien dennoch geschrieben werden.
 *
 * Voraussetzung: Die Umgebungsvariable HUGGINGFACE_API_TOKEN muss gesetzt sein.
 */
export function runHuggingface(outputChannel: vscode.OutputChannel, projectRoot: string) {
  // Nachricht-Verlauf für chatCompletion aufbauen
  const messages: { role: 'user' | 'assistant'; content: string }[] = [];

  // Welches Modell soll verwendet werden?
  const HF_MODEL = 'Qwen/Qwen3-32B';

  // Token aus Umgebungsvariable lesen
  const apiToken = 'API-KEY';
  if (!apiToken) {
    outputChannel.appendLine('❌ Fehlender HUGGINGFACE_API_TOKEN. Bitte als ENV-Variable setzen.');
    return;
  }

  // InferenceClient instanziieren
  const client = new InferenceClient(apiToken);

  /**
   * Sendet eine user-Nachricht an das HF-Modell und gibt die assistant-Antwort zurück.
   * Fehler werden geloggt, und es wird in diesem Fall ein leerer String zurückgegeben,
   * damit main() nicht abbricht.
   */
  async function getResponse(message: string): Promise<string> {
    // 1) Neue user-Nachricht in den lokalen Verlauf pushen:
    messages.push({ role: 'user', content: message });

    // 2) Anfrage-Payload zusammenbauen
    const requestPayload = {
      provider: 'hf-inference' as const,
      model: HF_MODEL,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7
      },
      options: {
        wait_for_model: true
      }
    };

    try {
      const hfResponse: any = await client.chatCompletion(requestPayload);
      const firstChoice = hfResponse.choices?.[0];
      if (!firstChoice || !firstChoice.message || !firstChoice.message.content) {
        outputChannel.appendLine('⚠️ Ungültige Antwort von Hugging Face (keine choices/message gefunden).');
        return '';
      }
      const assistantContent = (firstChoice.message.content as string).trim();
      messages.push({ role: 'assistant', content: assistantContent });
      outputChannel.appendLine(assistantContent);
      return assistantContent;
    } catch (err: any) {
      outputChannel.appendLine(`⚠️ HF-Request fehlgeschlagen: ${err.message}`);
      return '';
    }
  }

  /**
   * Entfernt ```-Codeblöcke (mit oder ohne Sprach-Markierung) aus einer Antwort.
   */
  function stripCodeFences(text: string): string {
    return text
      .replace(/^```[a-zA-Z]*\r?\n/, '')
      .replace(/\r?\n```$/, '')
      .trim();
  }

  /**
   * Hauptfunktion:
   * 1) Liest Feature-File ein
   * 2) Lädt per Puppeteer die Ziel-Website und extrahiert HTML
   * 3) Kürzt das HTML, um es an HF zu schicken
   * 4) Fragt HF-Modell nach einer selectors-Datei
   * 5) Speichert selectors-Datei
   * 6) Fragt HF-Modell nach einer steps-Datei
   * 7) Speichert steps-Datei
   */
  async function main() {
    // Pfad zur Feature-Datei
    const featurePath = path.join(projectRoot, 'features', 'demo.feature');
    if (!fs.existsSync(featurePath)) {
      outputChannel.appendLine(`❌ Feature-Datei nicht gefunden: ${featurePath}`);
      return;
    }

    // 1) Feature-File einlesen
    const featureContent = fs.readFileSync(featurePath, 'utf8');
    let message: string = `Bitte merke dir dieses .feature File:\n${featureContent}`;
    const featureReply = await getResponse(message);
    if (featureReply !== '') {
      outputChannel.appendLine('✅ 1. Anfrage (Feature-Inhalt) war erfolgreich.');
    } else {
      outputChannel.appendLine('⚠️ 1. Anfrage (Feature-Inhalt) lieferte leere Antwort oder Fehler.');
    }

    // 2) Puppeteer: HTML der Ziel-Website einlesen
    let pageSourceHTML: string;
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto('https://meag.gitlab.diva-e.com/investmentrechner-2023/');
      pageSourceHTML = await page.content();
      await browser.close();
    } catch (err: any) {
      outputChannel.appendLine(`❌ Puppeteer-Fehler beim Einlesen der Seite: ${err.message}`);
      pageSourceHTML = '';
    }

    const fullLength = pageSourceHTML.length;
    outputChannel.appendLine(`🔍 Originales HTML hat ${fullLength} Zeichen.`);

    // 3) HTML kürzen auf maximal 15000 Zeichen, um Payload-Limits zu vermeiden
    const MAX_HTML_CHARS = 15000;
    const truncatedHTML =
      fullLength > MAX_HTML_CHARS
        ? pageSourceHTML.slice(0, MAX_HTML_CHARS)
        : pageSourceHTML;
    outputChannel.appendLine(`🔍 Verkürztes HTML hat ${truncatedHTML.length} Zeichen.`);

    message = `Bitte merke dir die Struktur dieser Website (gekürzt auf ${truncatedHTML.length} Zeichen):\n${truncatedHTML}`;
    const htmlReply = await getResponse(message);
    if (htmlReply !== '') {
      outputChannel.appendLine('✅ 2. Anfrage (gekürztes HTML) war erfolgreich.');
    } else {
      outputChannel.appendLine('⚠️ 2. Anfrage (gekürztes HTML) lieferte leere Antwort oder Fehler.');
    }

    // 4a) selectors-Datei generieren
    message = `Erzeuge basierend auf dem zuvor gegebenen .feature File und der Website-Struktur eine Cypress-Selectors-Datei in TypeScript.
Bitte gib nur den reinen TypeScript-Code in einem \`\`\`ts ... \`\`\` Block aus.`;
    const responseSelectors = await getResponse(message);
    const cleanedSelectors = stripCodeFences(responseSelectors);
    outputChannel.appendLine(`🔍 CleanedSelectors-Länge: ${cleanedSelectors.length} Zeichen.`);

    // Ordner "common/selectors" sicherstellen
    const selectorsDir = path.join(projectRoot, 'common', 'selectors');
    if (!fs.existsSync(selectorsDir)) {
      fs.mkdirSync(selectorsDir, { recursive: true });
    }

    // selectors-Datei schreiben
    const selectorsPath = path.join(selectorsDir, 'hf_selectors.ts');
    fs.writeFile(selectorsPath, cleanedSelectors, (err) => {
      if (err) {
        outputChannel.appendLine(`❌ Fehler beim Schreiben der selectors-Datei: ${err.message}`);
      } else {
        outputChannel.appendLine(`✅ selectors-Datei erfolgreich geschrieben: ${selectorsPath}`);
      }
    });

    // 4b) steps-Datei generieren
    message = `Erzeuge nun basierend auf dem .feature File und der generierten selectors-Datei eine Cypress-Steps-Datei in TypeScript.
Bitte gib nur den reinen TypeScript-Code in einem \`\`\`ts ... \`\`\` Block aus.`;
    const responseSteps = await getResponse(message);
    const cleanedSteps = stripCodeFences(responseSteps);
    outputChannel.appendLine(`🔍 CleanedSteps-Länge: ${cleanedSteps.length} Zeichen.`);

    // Ordner "common/steps" sicherstellen
    const stepsDir = path.join(projectRoot, 'common', 'steps');
    if (!fs.existsSync(stepsDir)) {
      fs.mkdirSync(stepsDir, { recursive: true });
    }

    // steps-Datei schreiben
    const stepsPath = path.join(stepsDir, 'hf_steps.ts');
    fs.writeFile(stepsPath, cleanedSteps, (err) => {
      if (err) {
        outputChannel.appendLine(`❌ Fehler beim Schreiben der steps-Datei: ${err.message}`);
      } else {
        outputChannel.appendLine(`✅ steps-Datei erfolgreich geschrieben: ${stepsPath}`);
      }
    });
  }

  // Starte den Workflow und fange Fehler ab
  main().catch((err) => {
    outputChannel.appendLine(`❌ Fehler im Hauptprozess: ${err.message}`);
  });
}
