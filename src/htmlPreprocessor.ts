import puppeteer from 'puppeteer';
import {promises as fs} from 'fs';
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
            function hasTextInSubtree(node: ChildNode): boolean {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent?.trim();
                    return !!(text && text.length > 0);
                }

                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return false;
                }

                // Check direct text content first
                const element = node as HTMLElement;
                const directTextContent = Array.from(element.childNodes)
                    .filter(child => child.nodeType === Node.TEXT_NODE)
                    .map(child => child.textContent?.trim())
                    .filter(text => text && text.length > 0)
                    .join(' ');

                if (directTextContent.length > 0) {
                    return true;
                }

                // Recursively check children
                return Array.from(element.childNodes).some(child => hasTextInSubtree(child));
            }

            function filterNode(node: ChildNode): FilteredNode {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return null;
                }

                const element = node as HTMLElement;

                // Get direct text content (excluding child elements)
                const directTextContent = Array.from(element.childNodes)
                    .filter(child => child.nodeType === Node.TEXT_NODE)
                    .map(child => child.textContent?.trim())
                    .filter(text => text && text.length > 0)
                    .join(' ');

                const hasDirectText = directTextContent.length > 0;

                // Process children and keep only those that have text in their subtree
                const children: FilteredNode[] = [];
                element.childNodes.forEach((child) => {
                    if (hasTextInSubtree(child)) {
                        const filteredChild = filterNode(child);
                        if (filteredChild) {
                            children.push(filteredChild);
                        }
                    }
                    // If child has no text in subtree, it's completely excluded
                });

                // Keep element if it has direct text OR has children with text
                // This ensures parent elements are preserved when children have text
                if (hasDirectText || children.length > 0) {
                    return {
                        tag: element.tagName.toLowerCase(),
                        id: element.id || null,
                        classList: element.classList.length > 0 ? Array.from(element.classList) : [],
                        textContent: hasDirectText ? directTextContent : null,
                        children,
                    };
                }

                // Exclude nodes without text and without children that have text
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

    async generateHTML(filteredDOM: FilteredNode): Promise<string> {
        if (!filteredDOM) {
            throw new Error('No DOM structure to save');
        }

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Filtered DOM</title>
            </head>
            <body>
            ${this.nodeToHTML(filteredDOM)}
            </body>
            </html>
        `;
    }

    // Utility method to save HTML to file
    async saveHTML(filteredDOM: FilteredNode, outputPath: string = 'filtered-dom.html'): Promise<void> {
        const htmlContent = await this.generateHTML(filteredDOM);
        await fs.writeFile(outputPath, htmlContent, 'utf8');
        console.log(`Filtered HTML saved to ${outputPath}`);
    }

    // Utility method to open the generated HTML in browser
    async openInBrowser(filteredDOM: FilteredNode, outputPath: string = 'filtered-dom.html'): Promise<void> {
        await this.saveHTML(filteredDOM, outputPath);
        const absolutePath = path.resolve(outputPath);
        await open(absolutePath);
    }
}