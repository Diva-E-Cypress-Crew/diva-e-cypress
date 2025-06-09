Feature: MEAG Investmentrechner – Button-Klick (minimal)

  Scenario: Klick auf "Anlegen"-Tile
    Given the Customer is on the homepage
    When  he clicks the "Anlegen" button
    Then  the "Anlegen" tile should be displayed