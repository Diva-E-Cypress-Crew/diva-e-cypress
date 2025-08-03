
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

import {OutputChannel} from "vscode";
import {ChatMessageHistory} from "langchain/memory";
import {SelectorsPrompt} from "../prompts/selectorsPrompt";
import {htmlPreprocessor} from "./htmlPreprocessor";


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
        const userInput: string = "Hello CodeLlama!";
        await this.chatHistory.addMessage(new HumanMessage(userInput));
        let messages = await this.chatHistory.getMessages();
        let response = await this.model.invoke(messages);
        await this.chatHistory.addMessage(response);

        this.outputChannel.appendLine(`User: ${userInput}`);
        this.outputChannel.appendLine(`CodeLlama: ${response.content}`);

        await (async () => {
            const extractor = new htmlPreprocessor();
            const dom = await extractor.extractFilteredDOM(this.baseUrl);
            await extractor.saveAndOpenHTML(dom);
        })();

        //Puppeteer
        // const browser = await puppeteer.launch();
        // const page    = await browser.newPage();
        // await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        // await page.waitForSelector('body');
        // const htmlSnapshot = await page.content();
        // await browser.close();

        //Selectors
        // const selectorsPrompt = new SelectorsPrompt(this.featureFile, this.baseUrl, htmlSnapshot);
        //
        // const { default: llamaTokenizer } = await import('llama-tokenizer-js');
        // const tokens = llamaTokenizer.encode(selectorsPrompt.getPrompt());
        // this.outputChannel.appendLine(tokens.length.toString());


        // await this.chatHistory.addMessage(new HumanMessage(selectorsPrompt.getPrompt()));
        // messages = await this.chatHistory.getMessages();
        // response = await this.model.invoke(messages);
        // await this.chatHistory.addMessage(response);
        //
        // this.outputChannel.appendLine(`User: ${selectorsPrompt}`);
        // this.outputChannel.appendLine(`CodeLlama: ${response.content}`);


    }

}
