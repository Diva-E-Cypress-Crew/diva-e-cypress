import cy from 'cypress';

cy.get('#form-container')
  .should('be.visible')

cy.get('.list > li')
  .each((listItem) => {
    cy.wrap(listItem).get('.anlage-plan-ueberpruefe').should('be.visible');
    cy.wrap(listItem).get('.anlage-plan-ueberpruefe').click();
    cy.wrap(listItem).get('.anlage-plan-wertentwicklung').should('be.visible');
  });

cy.get('.anlage-plan-wertentwicklung')
  .each((item) => {
    cy.wrap(item).get('#ausgabe-aufschlag').should('be.visible');
    cy.wrap(item).get('#meag-fonds-gewinnanteil').should('be.visible');
    cy.wrap(item).get('#meag-fonds-gewinnanteil > input').should('have.value', '0.1');
    cy.wrap(item).get('#steuerliche-auswirkungen').should('be.visible');
  });

cy.get('.form-button')
  .click();

cy.get('.anlage-plan-ueberpruefe')
  .each((listItem) => {
    cy.wrap(listItem).get('#kosten-funktion').should('have.value', '1000.00');
    cy.wrap(listItem).get('#verluste-funktion').should('be.visible');
  });
  