/**
 * Aktualisiert die `baseUrl` in `cypress.config.ts` anhand eines Hinweises in der
 * **ersten Zeile** einer Gherkin-Feature-Datei.
 *
 * Erwartetes Format in Zeile 1 der Feature-Datei:
 *   `# url: https://example.org/pfad`
 *
 * Ablauf:
 * 1) Feature-Datei lesen und in der **ersten Zeile** nach einem `# url: ...`-Muster suchen.
 * 2) Ausgehend vom Feature-Pfad den Cypress-Ordner sowie den Pfad zu `cypress.config.ts`
 *    im Projektroot auflösen.
 * 3) In der Config die Zeile mit `baseUrl: '...'` per Regex finden und den Wert ersetzen.
 * 4) Alle Schritte ins `OutputChannel` loggen; bei Erfolg die neue URL zurückgeben.
 *
 * Hinweise:
 * - Wenn keine URL in Zeile 1 steht, wird **nichts** geändert und `null` zurückgegeben.
 * - Wenn `cypress.config.ts` nicht existiert oder die Regex keine `baseUrl` findet,
 *   wird ebenfalls **nicht** geändert und `null` zurückgegeben.
 * - Die Regex akzeptiert einfache/doppelte/backtick Anführungszeichen und erwartet ein
 *   **abschließendes Komma** nach `baseUrl`.
 */
 
// src/utils/updateCypressConfig.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Liest die erste Zeile der Feature-Datei, extrahiert (falls vorhanden) die URL im
 * Format `# url: ...` und ersetzt in `cypress.config.ts` die `baseUrl` durch diese URL.
 *
 * @param featureFile Vollständiger Pfad zur `.feature`-Datei.
 * @param output      VS Code Output-Channel für Status-/Fehlermeldungen.
 * @returns           Die neu gesetzte URL bei Erfolg, sonst `null`.
 *
 * @example
 * ```ts
 * const newUrl = switchUrl('/abs/path/to/cypress/e2e/features/foo.feature', output);
 * if (newUrl) {
 *   output.appendLine(`Neue baseUrl: ${newUrl}`);
 * }
 * ```
 */
export function switchUrl(
    featureFile: string,
    output: vscode.OutputChannel
): string | null {
    try {
        // ────────── Feature-Datei lesen ──────────
        const feature = fs.readFileSync(featureFile, 'utf-8');
        const firstLine = feature.split(/\r?\n/)[0].trim();

        let extractedUrl: string | null = null;
        const urlMatch = firstLine.match(/#\s*url:\s*(.+)/i);
        if (urlMatch) {
            extractedUrl = urlMatch[1].trim();
            //output.appendLine(`🌍 URL aus Feature gelesen: ${extractedUrl}`);
        } else {
            output.appendLine(`⚠️ Keine URL in erster Zeile gefunden.`);
            return null;
        }

        // ────────── Cypress-Ordner ermitteln ──────────
        // Beispiel: ...\cypress\e2e\features\orchestrator.feature
        const featureDir = path.dirname(featureFile);
        const cypressDir = path.resolve(featureDir, '..', '..'); // → e2e → cypress
        output.appendLine(`📂 Cypress-Ordner: ${cypressDir}`);

        const configPath = path.resolve(cypressDir, '..', 'cypress.config.ts');
        output.appendLine(`⚙️ Cypress Config: ${configPath}`);

        if (!fs.existsSync(configPath)) {
            output.appendLine(`❌ Cypress Config nicht gefunden: ${configPath}`);
            return null;
        }

        // ────────── Config öffnen & baseUrl ersetzen ──────────
        let configContent = fs.readFileSync(configPath, 'utf-8');
        const baseUrlRegex = /baseUrl:\s*['"`](.+?)['"`],/;

        const match = configContent.match(baseUrlRegex);
        if (match) {
            const oldUrl = match[1];
            configContent = configContent.replace(
                baseUrlRegex,
                `baseUrl: '${extractedUrl}',`
            );
            fs.writeFileSync(configPath, configContent, 'utf-8');
            //output.appendLine(`✅ baseUrl ersetzt: ${oldUrl} → ${extractedUrl}`);
            return extractedUrl;
        } else {
            output.appendLine(`⚠️ Keine baseUrl in config gefunden, keine Ersetzung durchgeführt.`);
            return null;
        }
    } catch (err: any) {
        output.appendLine(`❌ Fehler beim Update der Cypress Config: ${err.message}`);
        return null;
    }
}
