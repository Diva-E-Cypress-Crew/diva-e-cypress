# Projekt Wissensmanagement: Diva-E 

## Automatisches Erstellen von Cypress Tests unter Verwendung von KI Tools
- Es soll ein Tool entwickelt werden, das eine bestehende Testanforderung auf Basis eines Cucumber Files für eine gegebene Testanwendung analysiert und daraus entsprechend Cypress Tests erzeugt.

**Ansprechpartner:** Alexander Thoms


## Mitglieder
- Leander Piepenbring   
- Tobias Lindhorst       
- Maximilian Berthold    
- Felix Riedel         
- Grace Leton Dodi

## KanBan - Board
https://miro.com/welcomeonboard/M2orVW90Z3ZxM3lVTWcwM2tSdURoZU1MeExKalk0NnFhZFprQ0xpOXZlUjJnQUFLVWh4WHo0YU9oNjZQS3IzLzVkWE5sZ1hnekFsOFAvc1RVWUE3REZZQ3JXRHFjNUIxay96a090WGVrNkkwSTdxM1hxZUVMVmQwUFZpR1dQKzFQdGo1ZEV3bUdPQWRZUHQzSGl6V2NBPT0hdjE=?share_link_id=3607064566

## Setup
```bash
npm install
```
oder alternativ:
```bash
npm install -D cypress@13.6.3
npm install -D cypress-cucumber-preprocessor@4.3.1
npm install -D typescript@5.3.3
npm install -D @badeball/cypress-cucumber-preprocessor@20.0.1
npm install -D @shelex/cypress-allure-plugin@2.40.1
```
### Cypress Starten
```bash
 "cypress:open": "cypress open",
```
Über E2E Testing Broweser auswählen und Test ausführen. 