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
[Miro(veraltet)](https://miro.com/app/board/uXjVIMEqWZo=/?share_link_id=682357976358)
[Trello](https://trello.com/b/JGFZBSRz/projekt-wm)
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
cypress open
```
Über E2E Testing Broweser auswählen und Test ausführen. 

### Ollama 

## Installation

https://ollama.com/download

```bash
ollama run llama3.2
```