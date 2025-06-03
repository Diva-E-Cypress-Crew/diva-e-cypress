import * as vscode from 'vscode';
import * as fs from 'fs'
import ollama from 'ollama';
import puppeteer from "puppeteer";

export function runOllama(outputChannel: vscode.OutputChannel, projectRoot: String) {
  const messages: { role: 'user' | 'assistant', content: string }[] = []

  async function getResponse(message: string): Promise<string> {
    messages.push({ role: 'user', content: message })
    const response = await (ollama as any).chat({
      model: 'llama3.2',
      messages: messages,
    })
    messages.push({ role: 'assistant', content: response.message.content })
    outputChannel.appendLine(response.message.content) // Log response here
    return response.message.content.toString()
  }

  function stripCodeFences(text: string): string {
    return text
      .replace(/^```[a-zA-Z]*\r?\n/, '')
      .replace(/\r?\n```$/, '');
  }

  async function main() {
    const featureFile: string = fs.readFileSync(`${projectRoot}/features/demo.feature`, 'utf8')
    let message: string = "Please remember this .feature file:\n" + featureFile
    let response = await getResponse(message)

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://meag.gitlab.diva-e.com/investmentrechner-2023/');
    const pageSourceHTML = await page.content();
    await browser.close();

    message = "Please remember the structure of this website:\n" + pageSourceHTML
    response = await getResponse(message)

    message = `Now I need you to help me write a cypress test based on the .feature file I provided earlier. [...]`
    response = await getResponse(message);

    const cleanedSelectors = stripCodeFences(response);

    fs.writeFile(
      `${projectRoot}/common/selectors/ollama_selectors.ts`,
      cleanedSelectors,
      (err) => {
        if (err) outputChannel.appendLine(`❌ Error writing selectors file: ${err.message}`);
        else outputChannel.appendLine('✅ selectors-Datei erfolgreich geschrieben.');
      }
    );

    message = `Now generate me the steps.ts file. [...]`
    response = await getResponse(message);

    const cleanedSteps = stripCodeFences(response);

    fs.writeFile(
      `${projectRoot}/common/steps/ollama_steps.ts`,
      cleanedSteps,
      (err) => {
        if (err) outputChannel.appendLine(`❌ Error writing steps file: ${err.message}`);
        else outputChannel.appendLine('✅ steps-Datei erfolgreich geschrieben.');
      }
    );
  }

  main().catch(err => outputChannel.appendLine(`❌ Main error: ${err.message}`));
}
