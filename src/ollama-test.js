import ollama from 'ollama'

const question = 'Write a cypress cucumber test which uses the following gherkin: \n' +
    '"Feature: Searching for a special term on Bing\n\n' +
    '  Scenario: Searching for "open AI" on Bing\n' +
    '    Given I open Bing homepage\n' +
    '    When I search for the text \'open AI\'\n' +
    '    Then I see search results for \'open AI\'"\n' +
    'The result should contain a cucumber file and an own selector file.'

console.log('question', question);

const response = await ollama.chat({
    model: 'llama3.2:latest',
    messages: [{ role: 'user', content: question }],
})
console.log('answer', response.message.content)