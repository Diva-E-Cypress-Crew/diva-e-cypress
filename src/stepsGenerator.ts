import * as fs from "fs";

const stepKeywords = ["Given", "When", "Then", "And", "But"];

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
