// cypress/e2e/common/steps/ollama_steps.ts

import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import {
  visitHomepage,
  clickLabel,
  getLabel,
  selAnlegen,
  selEndbetrag,
  selAnlagebetragInput,
  selEndbetragLabel,
  selEndbetragValue,
} from '../selectors/test_ollama_selectors.js';

// 1) Gegeben: Kunde ist auf der Startseite
Given('the Customer is on the homepage', () => {
  return visitHomepage();
});

// 2) Wenn: er klickt auf den Button mit dem im Feature angegebenen Namen
When('he clicks the {string} button', (label: string) => {
  return clickLabel(label);
});

// 3) Dann: das entsprechende Tile sollte sichtbar sein
Then('the {string} tile should be displayed', (label: string) => {
  return getLabel(label).should('be.visible');
});

// (Optional) Beispiel dafür, wie ihr eure tieferen Selektoren verwenden könnt:
Then('soll die Anlegen-Kachel anklickbar sein', () => {
  return selAnlegen().should('be.visible').click();
});

Then('wird der Endbetrag angezeigt', () => {
  return selEndbetrag().should('be.visible');
});
