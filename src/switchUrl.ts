// src/utils/updateCypressConfig.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Reads the first line of the feature file, extracts URL (if present),
 * then updates cypress.config.ts with that URL as baseUrl.
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
            output.appendLine(`🌍 URL aus Feature gelesen: ${extractedUrl}`);
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
            output.appendLine(`✅ baseUrl ersetzt: ${oldUrl} → ${extractedUrl}`);
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
