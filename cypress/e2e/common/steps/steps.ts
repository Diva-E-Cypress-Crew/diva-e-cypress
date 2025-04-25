import {Given, When, Then} from "@badeball/cypress-cucumber-preprocessor";
import {
    selAnlegen, selEndbetrag, selAnlagebetragInput, selEndbetragLabel, selEndbetragValue
} from "../selectors/investmentrechner_selectors";

Given('the Customer is on the homepage', () => {
    cy.visit('/')
})

When('he Clicks Anlegen and Endbetrag', () => {
    selAnlegen().click()
    selEndbetrag().click()
})

Then('the Endbetrag should be shown', () => {
    selEndbetragValue().should('contain', '36.408,94')
})

When('he changes the Anlagebetrag {string}', (value: string) => {
    selAnlagebetragInput().clear().type(value + '{enter}')
    selEndbetragLabel().click()
})

Then('a changed Endbetrag should be shown {string}', (value: string) => {
    selEndbetragValue().should('contain', value)
})


