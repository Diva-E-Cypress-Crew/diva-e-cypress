```typescript
import { cy } from 'cypress';
import selectors from '../selectors/ollama_selectors';

export default {
  Feature: 'Ollama Features',
  Scenarios: [
    {
      Description: 'Anlegen Button Should Be Clickable',
      Scenario: {
        Given('I am on the homepage'),
        When('I click the Anlage button'),
        Then('The Anlagen button should be clicked and the results table should be displayed')
      }
    },
    {
      Description: 'Vermittler Should Be Found',
      Scenario: {
        Given('I am on the homepage'),
        When('I search for Vermittler'),
        Then('A Vermittler should be found in the search results')
      }
    },
    {
      Description: 'Anlage Result Table Should Contain Correct Data',
      Scenario: {
        Given('I am on the homepage'),
        When('I click the Anlegen button'),
        Then('The anlage result table should contain correct data, including investment amount and cost')
      }
    }
  ]
};
```