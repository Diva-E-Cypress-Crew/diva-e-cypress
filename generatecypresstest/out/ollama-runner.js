import * as ollama from "ollama";
import * as fs from 'fs';
import puppeteer from "puppeteer";
const messages = [];
async function getResponse(message) {
    messages.push({ role: 'user', content: message });
    const response = await ollama.chat({
        model: 'llama3.2',
        messages: messages,
    });
    messages.push({ role: 'assistant', content: response.message.content });
    return response.message.content.toString();
}
/**
 * Entfernt führende und abschließende ```-Marker (mit optionalem Language-Tag)
 */
function stripCodeFences(text) {
    return text
        // Entfernt den ersten ```Zeile (z.B. ``` oder ```typescript)
        .replace(/^```[a-zA-Z]*\r?\n/, '')
        // Entfernt das abschließende ```
        .replace(/\r?\n```$/, '');
}
async function main() {
    const featureFile = fs.readFileSync('cypress/e2e/features/demo.feature', 'utf8');
    let message = "Please remember this .feature file:\n" + featureFile;
    let response = await getResponse(message);
    console.log(response);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://meag.gitlab.diva-e.com/investmentrechner-2023/');
    const pageSourceHTML = await page.content();
    await browser.close();
    message = "Please remember the structure of this website:\n" + pageSourceHTML;
    response = await getResponse(message);
    console.log(response);
    message = `Now I need you to help me write a cypress test based on the .feature file I provided earlier. 
               First I need the cy selectors for the elements referred to in the .feauture file. The querying behavior of this command is similar to how $(...) works in jQuery.
               Here is an example: cy.get('.list > li'). Give them reasonable names like selAnlegen for the "Anlegen" button. 
               \n\n
               As an answer please return me the typescript code. Dont comment your answer just be silent and send the code.`;
    response = await getResponse(message);
    const cleanedSelectors = stripCodeFences(response);
    fs.writeFile('cypress/e2e/common/selectors/ollama_selectors.ts', cleanedSelectors, (err) => {
        if (err)
            console.error(err);
        else
            console.log('selectors-Datei erfolgreich geschrieben.');
    });
    message = `Now generate me the steps.ts file. Therefore import the selectors from ../selectors/ollama_selectors. 
                And write me the steps base one the cucumber .feature file you remembered earlier using Given, When, Then from "@badeball/cypress-cucumber-preprocessor";
               \n\n
               As an answer please return me the typescript code. Dont comment your answer just be silent and send the code.`;
    response = await getResponse(message);
    const cleanedSteps = stripCodeFences(response);
    fs.writeFile('cypress/e2e/common/steps/ollama_steps.ts', cleanedSteps, (err) => {
        if (err)
            console.error(err);
        else
            console.log('steps-Datei erfolgreich geschrieben.');
    });
}
main().catch(console.error);
//# sourceMappingURL=ollama-runner.js.map