import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import olammaSelectors from '../selectors/ollama_selectors';

const olammaSelectors = new ollamaSelectors();

Given('Anlegen Button ist sichtbar', () => {
  cy.get(olammaSelectors.ANLEGEN_BUTTON).should('be.visible');
});

When('Anlageplan überprüfen', () => {
  cy.get(olammaSelectors.LIST_ITEM).each((listItem) => {
    cy.wrap(listItem).get(ollamaSelectors.ANLAGE_PLAN_UBERPRUEFE).should('be.visible');
    cy.wrap(listItem).get(ollamaSelectors.ANLAGE_PLAN_UBERPRUEFE).click();
    cy.wrap(listItem).get(ollamaSelectors.ANLAGE_PLAN_WERTENTWERKUNG).should('be.visible');
  });
});

Then('Ausgabeaufschlag und Gewinnanteil sind sichtbar', () => {
  cy.get(olammaSelectors.LIST_ITEM).each((listItem) => {
    cy.wrap(listItem).get(ollamaSelectors.AUSGABEAUFSCLAG).should('be.visible');
    cy.wrap(listItem).get(ollamaSelectors.MEAG_FONDS_GEWINNANTEIL).should('be.visible');
    cy.wrap(listItem).get(ollamaSelectors.MEAG_FONDS_GEWINNANTEIL + ' > input').should('have.value', '0.1');
  });
});

When('Form abschicken', () => {
  cy.get(olammaSelectors.FORM_BUTTON).click();
});

Then('Verluste funktion ist sichtbar', () => {
  cy.get(ollamaSelectors.LIST_ITEM).each((listItem) => {
    cy.wrap(listItem).get(ollamaSelectors.KOSTEN_FUNKTION).should('have.value', '1000.00');
    cy.wrap(listItem).get(ollamaSelectors.VERLIсте_FUNKTION).should('be.visible');
  });
});