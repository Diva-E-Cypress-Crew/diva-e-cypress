// cypress/support/selectors.ts

export const getAnlagenButton = () => cy.contains('div', 'Anlegen');

export const getEinmalbetragInput = () => cy.contains('div', 'Einmalbetrag').siblings('div').first();

export const getEndbetragValue = () => {
  return cy.contains('div', 'Endbetrag')
    .siblings('div')
    .first()
    .should('be.visible')
    .should('contain.text', ',')
    .invoke('text');
};

export const getChartContainer = () => cy.get('#highcharts-l4ys0z3-0');

export const waitForEndbetragUpdate = (expectedEndbetrag: string) => {
  return cy.contains('div', expectedEndbetrag, { timeout: 10000 });
};