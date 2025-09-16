import * as fs from "fs";

/**
 * Unterstützte **Gherkin-Schlüsselwörter** (englisch), die am **Zeilenanfang**
 * erkannt werden. Die Schlüsselwörter `And` und `But` erben die Bedeutung vom
 * zuletzt gesehenen Schritt (siehe {@link generateStepDefinitions}).
 *
 * Hinweis: Für andere Sprachen (z. B. Deutsch mit „Gegeben sei“/„Wenn“/„Dann“)
 * müsste diese Liste entsprechend angepasst werden.
 * 
 * Diese Struktur ist eine Hilfsmethode für Open-Source-LLMs, welche Probleme mit der Generierung von sauberer Gherkin-Strukturen zu haben.
 */
const stepKeywords = ["Given", "When", "Then", "And", "But"];

/**
 * Erzeugt aus einer `.feature`-Datei ein **TypeScript-Snippet** mit
 * leeren **Cypress-Cucumber Step-Definitions**.
 *
 * Funktionsweise:
 * - Liest die Datei zeilenweise.
 * - Erkennt Schritte, die **am Zeilenanfang** mit einem der Keywords beginnen.
 * - `And`/`But` werden auf das **zuletzt gesehene Keyword** (Fallback: `Given`) gemappt.
 * - Entfernt doppelte Step-Zeilen (de-duping via `Set`).
 * - Kommentare (`# …`) und Leerzeilen werden ignoriert.
 *
 * Einschränkungen (bewusst simpel gehalten):
 * - Keine tiefe Gherkin-Parserlogik (z. B. Szenarien, Tabellen, Outlines werden
 *   nicht gesondert behandelt).
 * - Platzhalter/Parameter in Steps werden **nicht** extrahiert oder typisiert;
 *   der Text wird als **Plain String** in die Signatur übernommen.
 * - Es wird **keine Datei geschrieben**. Der zurückgegebene **String** enthält
 *   den kompletten TS-Quelltext (inkl. Import), den der Aufrufer selbst speichern kann.
 *
 * @param featureFilePath Pfad zur `.feature`-Datei.
 * @returns TypeScript-Quelltext mit Import und leeren Step-Definitionen.
 *
 * @example
 * ```ts
 * import { writeFileSync } from "fs";
 * import { generateStepDefinitions } from "./stepsGenerator";
 *
 * const tsSource = generateStepDefinitions("features/login.feature");
 * writeFileSync("e2e/common/orchestrator_steps.ts", tsSource, "utf-8");
 * ```
 */
export function generateStepDefinitions(
    featureFilePath: string
): string {
    const content = fs.readFileSync(featureFilePath, "utf-8");
    const lines = content.split(/\r?\n/);

    const stepsSet = new Set<string>();
    let lastKeyword: string | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue; // skip empty & comments

        const keyword = stepKeywords.find((k) => trimmed.startsWith(k));

        if (keyword) {
            const stepText = trimmed.substring(keyword.length).trim();

            // @ts-ignore
            const resolvedKeyword =
                keyword === "And" || keyword === "But" ? lastKeyword ?? "Given" : keyword;

            if (resolvedKeyword) {
                const key = `${resolvedKeyword}:${stepText}`;
                if (!stepsSet.has(key)) {
                    stepsSet.add(key);
                }
                lastKeyword = resolvedKeyword;
            }
        }
    }

    const steps = Array.from(stepsSet).map((entry) => {
        const [kw, text] = entry.split(":", 2);
        return `${kw}("${text}", () => {\n  // TODO: implement step\n});\n`;
    });

    return `import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";\n\n` + steps.join("\n");

}
