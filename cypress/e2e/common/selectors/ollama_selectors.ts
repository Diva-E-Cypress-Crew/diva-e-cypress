```typescript
import { cy } from 'cypress';

export const selectors = {
  // Element to click the Anlage button
  selAnlegen: '.btn-list__item--button',

  // Element to find Vermittler
  selVermittler: '#find-your-berater-button',

  // Input for inputting name
  selNameInput: 'input[name="name"]',

  // Input for inputting email
  selEmailInput: 'input[name="email"]',

  // Button to click "Anlegen" button
  selAnlagenButton: '.btn-list__item--button',

  // Element containing the table data of the anlage result
  selAnlageResultTable: '#results-table',

  // Input field for entering investment amount
  selInvestmentAmountInput: 'input[name="amount"]',

  // Button to click "Anlegen" button
  selAnlagenKostenButton: '.btn-list__item--button',

  // Element containing the result text of the anlage cost
  selAnlagenKostenText: '#results-table > tbody > tr:nth-child(2) > td:nth-child(3) > span',

  // Input field for entering investment period
  selInvestmentPeriodInput: 'input[name="period"]',
};
```