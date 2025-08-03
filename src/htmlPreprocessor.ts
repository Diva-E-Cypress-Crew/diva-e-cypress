import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
// @ts-ignore
import open from "open";

type FilteredNode = {
    tag: string;
    id: string | null;
    classList: string[];
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

                const children: FilteredNode[] = [];
                node.childNodes.forEach((child) => {
                    const filteredChild = filterNode(child);
                    if (filteredChild) {
                        children.push(filteredChild);
                    }
                });

                if (hasIdOrClass || children.length > 0) {
                    return {
                        tag: element.tagName.toLowerCase(),
                        id: element.id || null,
                        classList: element.classList.length > 0 ? Array.from(element.classList) : [],
                        children,
                    };
                }

                // Exclude nodes without id/class and without children with id/class
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
        const { tag, id, classList, children } = node;
        const idAttr = id ? ` id="${id}"` : '';
        const classAttr = classList.length > 0 ? ` class="${classList.join(' ')}"` : '';
        const childrenHTML = children.map(child => this.nodeToHTML(child)).join('');
        return `<${tag}${idAttr}${classAttr}>${childrenHTML}</${tag}>`;
    }

    async saveAndOpenHTML(filteredDOM: FilteredNode, filename = 'filteredDOM.html') {
        if (!filteredDOM) {
            throw new Error('No DOM structure to save');
        }

        const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Filtered DOM</title></head>
      <body>
      ${this.nodeToHTML(filteredDOM)}
      </body>
      </html>
    `;

        const filePath = path.resolve(process.cwd(), filename);
        await fs.writeFile(filePath, htmlContent, 'utf-8');
        console.log(`File saved to ${filePath}`);

        await open(filePath);
    }
}
