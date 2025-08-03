import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
// @ts-ignore
import open from "open";

type FilteredNode = {
    tag: string;
    id: string | null;
    classList: string[];
    textContent: string | null;
    children: FilteredNode[];
} | null;

export class htmlPreprocessor {
    async extractFilteredDOM(url: string): Promise<FilteredNode> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'load' });

        const filteredDOM = await page.evaluate(() => {
            function filterNode(node: ChildNode): FilteredNode {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return null;
                }

                const element = node as HTMLElement;
                const hasIdOrClass = element.id || element.classList.length > 0;

                // Get direct text content (excluding child elements)
                const directTextContent = Array.from(element.childNodes)
                    .filter(child => child.nodeType === Node.TEXT_NODE)
                    .map(child => child.textContent?.trim())
                    .filter(text => text && text.length > 0)
                    .join(' ');

                const hasTextContent = directTextContent.length > 0;

                const children: FilteredNode[] = [];
                element.childNodes.forEach((child) => {
                    const filteredChild = filterNode(child);
                    if (filteredChild) {
                        children.push(filteredChild);
                    }
                });

                // Keep element if it has id/class, text content, or children with id/class/text
                if (hasIdOrClass || hasTextContent || children.length > 0) {
                    return {
                        tag: element.tagName.toLowerCase(),
                        id: element.id || null,
                        classList: element.classList.length > 0 ? Array.from(element.classList) : [],
                        textContent: hasTextContent ? directTextContent : null,
                        children,
                    };
                }

                // Exclude nodes without id/class, text content, and without qualifying children
                return null;
            }

            return filterNode(document.body);
        });

        await browser.close();
        return filteredDOM;
    }

    private nodeToHTML(node: FilteredNode): string {
        if (!node) {
            return '';
        }
        const { tag, id, classList, textContent, children } = node;
        const idAttr = id ? ` id="${id}"` : '';
        const classAttr = classList.length > 0 ? ` class="${classList.join(' ')}"` : '';

        const childrenHTML = children.map(child => this.nodeToHTML(child)).join('');
        const content = textContent ? textContent + childrenHTML : childrenHTML;

        return `<${tag}${idAttr}${classAttr}>${content}</${tag}>`;
    }

    async generateHTML(filteredDOM: FilteredNode) {
        if (!filteredDOM) {
            throw new Error('No DOM structure to save');
        }

        const htmlContent: string = `
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><title>Filtered DOM</title></head>
                <body>
                ${this.nodeToHTML(filteredDOM)}
                </body>
                </html>
        `;

        return htmlContent;
    }
}