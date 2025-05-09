import ollama from 'ollama'
import * as fs from 'fs'
import puppeteer from "puppeteer";

const messages: { role: 'user' | 'assistant', content: string }[] = []

async function getResponse(message: string): Promise<string> {
    messages.push({ role: 'user', content: message })
    const response = await ollama.chat({
        model: 'llama3.2',
        messages: messages,
    })
    messages.push({ role: 'assistant', content: response.message.content })
    return response.message.content.toString()
}

async function main() {
    const featureFile: string = fs.readFileSync('../cypress/e2e/features/demo.feature', 'utf8')
    let message: string = "Please remember this .feature file:\n" + featureFile
    let response = await getResponse(message)
    console.log(response)

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://meag.gitlab.diva-e.com/investmentrechner-2023/');
    const pageSourceHTML = await page.content();
    await browser.close();

    message = "Please remember the structure of this website:\n" + pageSourceHTML
    response = await getResponse(message)
    console.log(response)

    message = `Now I need you to help me write a cypress test based on the .feature file I provided earlier. 
               First I need the cy selectors for the elements referred to in the .feauture file. The querying behavior of this command is similar to how $(...) works in jQuery.
               Here is an example: cy.get('.list > li'). Give them reasonable names like selAnlegen for the "Anlegen" button. 
               \n\n
               As an answer please return me the typescript code. Dont comment your answer just be silent and send the code.`

    response = await getResponse(message)

    console.log(response)

    fs.writeFile('../cypress/e2e/common/selectors/ollama_selectors.ts', response, (err: NodeJS.ErrnoException | null) => {
        if (err) {
            console.error(err);
        } else {
            console.log('File written successfully.');
        }
    });

    message = `Now generate me the steps.ts file. Therefore import the selectors from ../selectors/ollama_selectors. 
                And write me the steps base one the cucumber .feature file you remembered earlier using Given, When, Then from "@badeball/cypress-cucumber-preprocessor";
               \n\n
               As an answer please return me the typescript code. Dont comment your answer just be silent and send the code.`

    response = await getResponse(message)

    console.log(response)

    fs.writeFile('../cypress/e2e/common/steps/ollama_steps.ts', response, (err: NodeJS.ErrnoException | null) => {
        if (err) {
            console.error(err);
        } else {
            console.log('File written successfully.');
        }
    });
}

main().catch(console.error)

