import { cy } from 'cypress';
import { ollamaSelectors as selectors } from '../selectors/ollama_selectors';

export default {
  Given('Ich öffne die Seite für die Modellrechnung'), () => {
    cy.visit('/');
  },

  When('Ich wähle mein Anlagenzeitraum'), () => {
    cy.get(selectors.selAnlagenzeitraumEinmaligeAusgabe).click();
  },

  When('ich wähle einen Wertentwickungsverlauf', () => {
    cy.get(selectors.selWertentwicklung).select('option[value="linienwert"]');
  }),

  When('Ich wähle Anlagehäufigkeit', () => {
    cy.get(selectors.selAnlagenhäufigkeitMondrunde).click();
  }),

  When('Ich wähle die Kapitalverzinsung Option'), () => {
    cy.get(selectors.selKapitalverzinsungOption).select('option[value="kapitalverzinsung"]');
  }),

  Then('Die Modellrechnungsseite wird geladen', () => {
    cy.get(selectors.selAnlegen).should('be.visible');
  }),

  When('Ich überprüfe die Ergebnisse der Rechenung'), () => {
    cy.get(selectors(selWertentwicklungPunktwert).select('option[value="punktwert"]');
  },

  Then('Die korrekten Ergebnisse werden angezeigt', () => {
    // Implement the assert logic here
    // For example:
    cy.get('.correct-result').should('be.visible');
  }),
};