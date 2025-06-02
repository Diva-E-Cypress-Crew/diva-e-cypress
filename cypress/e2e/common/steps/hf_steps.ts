import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import { getAnlagenButton, getEinmalbetragInput, getEndbetragValue, waitForEndbetragUpdate, getChartContainer } from '../selectors/hf_selectors.js';
Given('the Customer is on the homepage', () => {
    cy.visit('/');
});
When('the Customer is on the homepage', () => {
  cy.visit('/');
});

When('he Clicks Anlegen and Endbetrag', () => {
  getAnlagenButton().click();
  cy.contains('div', 'Endbetrag').click(); // Select "Endbetrag" calculation target
});

When('he changes the Anlagebetrag "<Anlagebetrag>"', (anlagebetrag: string) => {
  getEinmalbetragInput().clear().type(anlagebetrag);
});

Then('a changed Endbetrag should be shown "<Endbetrag>"', (endbetrag: string) => {
  waitForEndbetragUpdate(endbetrag);
  getEndbetragValue().should('contain.text', endbetrag);
});

Then('the chart should reflect the updated values', () => {
  getChartContainer().should('be.visible');
});