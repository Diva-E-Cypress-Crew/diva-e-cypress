// ollama-runner.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import ollama from 'ollama';
import puppeteer from 'puppeteer';

export function runOllama(outputChannel: vscode.OutputChannel, projectRoot: string) {
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
    // 1) DEBUG: Prüfen, ob projectRoot korrekt ist
    console.log('DEBUG projectRoot =', projectRoot);
    // Erwartet z. B. ".../DIVA-E-CYPRESS" als projectRoot

    // ─── 2) Feature-Datei einlesen ─────────────────────────────────────────
    // Pfad: <projectRoot>/features/demo.feature
    const featureFilePath = `${projectRoot}/features/demo.feature`;
    let featureFile: string;
    try {
      featureFile = fs.readFileSync(featureFilePath, 'utf8');
    } catch (err: any) {
      outputChannel.appendLine(
          `❌ Hauptfehler: Feature-Datei nicht gefunden unter "${featureFilePath}".\n` +
          `Bitte prüfe, ob die Datei existiert und ob "projectRoot" korrekt übergeben wurde.`
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

    message = `
Generate a clean TypeScript file named "ollama_selectors.ts" at path cypress/e2e/common/selectors/ollama_selectors.ts. 
Output only the TypeScript code—absolutely no comments, no markdown fences, no explanatory text. 
The file must consist exactly of the following exported helper functions at the top (in this order), and then any additional "sel..."‐functions for custom elements:

export const visitHomepage = () => {
  return cy.visit('/');
};

export const clickLabel = (label: string) => {
  const normalizedLabel = label.toLowerCase().replace(/\\s+/g, '-').trim();
  return cy.get('body').then(($body) => {
    if ($body.find('[data-cy="' + normalizedLabel + '"]').length > 0) {
      return cy.get('[data-cy="' + normalizedLabel + '"]', { timeout: 5000 }).click();
    }
    if ($body.find('.tile-' + normalizedLabel).length > 0) {
      return cy.get('.tile-' + normalizedLabel, { timeout: 5000 }).click();
    }
    return cy.contains(label).click();
  });
};

export const getLabel = (label: string) => {
  const normalizedLabel = label.toLowerCase().replace(/\\s+/g, '-').trim();
  return cy.get('body').then(($body) => {
    if ($body.find('[data-cy="' + normalizedLabel + '"]').length > 0) {
      return cy.get('[data-cy="' + normalizedLabel + '"]', { timeout: 5000 });
    }
    return cy.contains(label);
  });
};

For every UI element referenced in the .feature file that cannot reliably be found via clickLabel(...) or getLabel(...), create a corresponding selector function with the prefix "sel" followed by a CamelCase short description. Each must look exactly like this:

export const selMyCustomElement = () => {
  return cy.get('<insert CSS selector>');
};

After the last "export const ..." line, there must be no additional text or comments. The file ends immediately after the final semicolon.
`;

    const responseSelectors = await getResponse(message);
    const cleanedSelectors = stripCodeFences(responseSelectors);

    // ─── 4a) Selektoren-Datei schreiben ─────────────────────────────────────
    const selectorsDir = `${projectRoot}/common/selectors`;
    if (!fs.existsSync(selectorsDir)) {
      fs.mkdirSync(selectorsDir, { recursive: true });
    }
    const selectorsPath = `${selectorsDir}/ollama_selectors.ts`;
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

    message = `
Generate a clean TypeScript file named "ollama_steps.ts" under cypress/e2e/common/steps. 
Output only the TypeScript code—no comments, no markdown fences, no explanatory text. 
Use literal Step definitions matching exactly the .feature file:
- Import at the top:
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import {
  visitHomepage,
  clickLabel,
  getLabel,
  selAnlegen,
  selEndbetrag,
  selAnlagebetragInput,
  selEndbetragLabel,
  selEndbetragValue
} from '../../../common/selectors/ollama_selectors.js';

Then write each step exactly:
Given('the Customer is on the homepage', () => {
  return visitHomepage();
});
When('he clicks the "{string}" button', (label: string) => {
  return clickLabel(label);
});
Then('the "{string}" tile should be displayed', (label: string) => {
  return getLabel(label).should('be.visible');
});
Then('soll die Anlegen-Kachel anklickbar sein', () => {
  return selAnlegen().should('be.visible').click();
});
Then('wird der Endbetrag angezeigt', () => {
  return selEndbetrag().should('be.visible');
});
Then('soll die Anlagebetrag-Eingabe-Box sichtbar sein', () => {
  return selAnlagebetragInput().should('be.visible');
});
Then('soll der Endbetrag-Label angezeigt werden', () => {
  return selEndbetragLabel().should('be.visible');
});
Then('soll der Endbetrag-Wert angezeigt werden', () => {
  return selEndbetragValue().should('be.visible');
});

After the final semicolon, the file must end immediately with no additional text or comments.
`;

    const responseSteps = await getResponse(message);
    const cleanedSteps = stripCodeFences(responseSteps);

    // ─── 5a) Schritte-Datei schreiben ───────────────────────────────────────
    const stepsDir = `${projectRoot}/common/steps`;
    if (!fs.existsSync(stepsDir)) {
      fs.mkdirSync(stepsDir, { recursive: true });
    }
    const stepsPath = `${stepsDir}/ollama_steps.ts`;
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
