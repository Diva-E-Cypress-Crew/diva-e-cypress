
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

import {OutputChannel} from "vscode";
import {ChatMessageHistory} from "langchain/memory";

export class CodeLlama {
    private model: ChatOllama;
    private chatHistory = new ChatMessageHistory();

    constructor(
        private featureFile: string,
        private baseUrl: string,
        private outputChannel: OutputChannel
    ) {
        this.model = new ChatOllama({ model: 'codellama:instruct', temperature: 0 });
    }

    public async run(): Promise<void> {
        const feature = fs.readFileSync(this.featureFile, 'utf-8');

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(this.baseUrl, {waitUntil: 'networkidle0'});
        await page.waitForSelector('body');
        const htmlSnapshot = await page.content();
        await browser.close();

        this.outputChannel.appendLine("Hello World");
        this.outputChannel.appendLine(feature);
        this.outputChannel.appendLine(htmlSnapshot);


    }

    public async chat(userInput: string): Promise<void> {
        await this.chatHistory.addMessage(new HumanMessage(userInput));

        const messages = await this.chatHistory.getMessages();

        const response = await this.model.invoke(messages);

        await this.chatHistory.addMessage(response);

        this.outputChannel.appendLine(`User: ${userInput}`);
        this.outputChannel.appendLine(`CodeLlama: ${response.content}`);
    }
}
