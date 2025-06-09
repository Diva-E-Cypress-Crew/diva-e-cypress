Feature: MEAG Investmentrechner
  As a user
  I want to open the investmentrechner
  So that I can change the Anlagebetrag

  Scenario: - Anlegen and Endbetrag with <Anlagebetrag>
    Given the Customer is on the homepage
    When he Clicks Anlegen and Endbetrag
    Then the Endbetrag should be shown

    When he changes the Anlagebetrag "<Anlagebetrag>"
    Then a changed Endbetrag should be shown "<Endbetrag>"

    Examples:
      | Anlagebetrag | Endbetrag    |
      | 12.000       | 29.127,15    |
      | 75.000       | 182.044,69   |