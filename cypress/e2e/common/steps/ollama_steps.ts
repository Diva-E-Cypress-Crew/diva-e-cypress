import { selector } from '../selectors/ollama_selectors';

export const steps = {
  'Anlegen': (cy) => cy.get(selector.anlegenButton).click(),
  'Löschen': (cy) => cy.get(selector.loeschButton).click(),
  'Überprüfen': (cy) => cy.get(selector.ueberpruefeLabel).should('contain', 'Überprüfung erfolgreich'),
};