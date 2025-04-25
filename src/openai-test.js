import OpenAI from "openai";

const openai = new OpenAI();


async function main() {
    // const question = 'Write a cypress cucumber test which opens google.com and search for "open AI". The result should contain a cucumber file and  an own selector file'
    // const question = 'Write a cypress cucumber test which opens google.com and search for "open AI". Use the following gherkin: \n"Feature: Searching for a special term on Google\n\n' +
    //     '  Scenario: Searching for "open AI" on Google\n' +
    //     '    Given I open Google homepage\n' +
    //     '    When I search for the text \'open AI\'\n' +
    //     '    Then I see search results for \'open AI\'"\n' +
    //     'The result should contain a cucumber file and an own selector file.'

    const question = 'Write a cypress cucumber test which uses the following gherkin: \n' +
        '"Feature: Searching for a special term on Bing\n\n' +
        '  Scenario: Searching for "open AI" on Bing\n' +
        '    Given I open Bing homepage\n' +
        '    When I search for the text \'open AI\'\n' +
        '    Then I see search results for \'open AI\'"\n' +
        'The result should contain a cucumber file and an own selector file.'

    console.log('question', question);
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: question }],
        model: "gpt-4o-mini",
    });

    console.log('answer', completion.choices);
}

main();
