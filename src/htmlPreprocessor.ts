import puppeteer from 'puppeteer';
import {promises as fs} from 'fs';
import path from 'path';
// @ts-ignore
import open from "open";

/**
 * Repräsentiert einen **gefilterten DOM-Knoten**:
 * - `tag`: HTML-Tagname in Kleinschreibung (z. B. `"div"`, `"span"`).
 * - `id`: Element-ID oder `null`, wenn keine vorhanden ist.
 * - `classList`: Liste der CSS-Klassen (leer, wenn keine vorhanden).
 * - `textContent`: **direkter** Textinhalt dieses Elements (ohne Kindtexte) oder `null`, wenn keiner vorhanden.
 * - `children`: bereits **gefilterte** Kindknoten.
 *
 * `null` bedeutet: Der betrachtete Knoten wurde **ausgeschlossen** (kein Text im Subtree).
 */
type FilteredNode = {
    tag: string;
    id: string | null;
    classList: string[];
    textContent: string | null;
    children: FilteredNode[];
} | null;

/**
 * HTML-Preprozessor für die **textzentrierte Reduktion** einer Webseite:
 *
 * - Lädt eine Seite per **Puppeteer** (Headless-Chromium),
 * - filtert alle DOM-Knoten weg, die **weder direkten Text** haben, **noch** in deren Subtree Text vorkommt,
 * - erhält pro Element nur **tag**, **id**, **classList**, **direkten Text** und die **gefilterten Kinder**,
 * - kann daraus **minimales HTML** generieren, speichern und im Browser öffnen.
 *
 * Typische Verwendung:
 * - Reduktion von Rauschen (Layout/Container ohne Text),
 * - Erzeugen eines **kleinen HTML-Snapshots**, der sich gut als LLM-Kontext eignet.
 */
export class htmlPreprocessor {
    /**
     * Lädt eine Seite und baut einen **gefilterten DOM-Baum**, der ausschließlich
     * Text-tragende Elemente (direkt oder in der Tiefe) enthält.
     *
     * Strategie:
     * - `hasTextInSubtree`: prüft rekursiv, ob im Subtree **irgendein** sichtbarer Text vorkommt
     *   (inkl. direkter Textknoten des Elements),
     * - `filterNode`: übernimmt Element nur, wenn **direkter Text** vorhanden **oder** mindestens
     *   ein Kind im Subtree Text enthält; für Kinder wird derselbe Filter angewendet.
     *
     * @param url Die zu ladende URL (z. B. `https://example.com`).
     * @returns   Root des **gefilterten DOM-Baums** oder `null`, wenn kein Text gefunden wurde.
     *
     * @example
     * ```ts
     * const pre = new htmlPreprocessor();
     * const tree = await pre.extractFilteredDOM('https://example.com');
     * if (tree) {
     *   const html = await pre.generateHTML(tree);
     *   await pre.saveHTML(tree, 'filtered.html');
     * }
     * ```
     *
     * @remarks
     * - Verwendet `page.goto(url, { waitUntil: 'load' })`.
     * - Schließt Browserinstanz nach der Extraktion.
     */
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

    /**
     * Rekursive **Serialisierung** eines `FilteredNode`-Baums zu minimalem HTML.
     *
     * Regeln:
     * - Nur `id` und `class` werden als Attribute beibehalten,
     * - `textContent` wird als **direkter** Textknoten des Elements eingefügt,
     * - Kinder werden rekursiv gerendert und angehängt.
     *
     * @param node Wurzel oder Teilbaum des gefilterten DOMs.
     * @returns    Minimales HTML als String für diesen Teilbaum (oder leerer String bei `null`).
     * @private
     */
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

    /**
     * Verpackt den serialisierten Teilbaum in ein **vollständiges HTML-Dokument**.
     *
     * @param filteredDOM Root des gefilterten DOMs.
     * @returns           Vollständiges HTML (inkl. `<!DOCTYPE html>`, `<head>` und `<body>`).
     * @throws            Wenn `filteredDOM` leer ist (z. B. keine Textknoten vorhanden).
     */
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

    /**
     * Hilfsfunktion: Speichert das generierte HTML in eine Datei.
     *
     * @param filteredDOM Gezielter Root/Teilbaum (typisch: Ergebnis aus {@link extractFilteredDOM}).
     * @param outputPath  Dateipfad für die Ausgabe (Standard: `'filtered-dom.html'`).
     * @returns           Promise, das erfüllt, sobald die Datei geschrieben wurde.
     */
    async saveHTML(filteredDOM: FilteredNode, outputPath: string = 'filtered-dom.html'): Promise<void> {
        const htmlContent = await this.generateHTML(filteredDOM);
        await fs.writeFile(outputPath, htmlContent, 'utf8');
        console.log(`Filtered HTML saved to ${outputPath}`);
    }

    /**
     * Hilfsfunktion: Speichert das HTML und öffnet es im **Standardbrowser**.
     *
     * @param filteredDOM Gezielter Root/Teilbaum (typisch: Ergebnis aus {@link extractFilteredDOM}).
     * @param outputPath  Dateipfad für die Ausgabe (Standard: `'filtered-dom.html'`).
     * @returns           Promise, das erfüllt, sobald die Datei gespeichert und geöffnet wurde.
     */
    async openInBrowser(filteredDOM: FilteredNode, outputPath: string = 'filtered-dom.html'): Promise<void> {
        await this.saveHTML(filteredDOM, outputPath);
        const absolutePath = path.resolve(outputPath);
        await open(absolutePath);
    }
}
