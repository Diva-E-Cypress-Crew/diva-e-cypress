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
(npx) cypress open
```
Über E2E Testing Broweser auswählen und Test ausführen. 

### Ollama 

## Installation

https://ollama.com/download

```bash
ollama run llama3.2
```

## Projekt-Konfigurationsdateien

| Datei             | Zweck / Beschreibung                                                                     |
|-------------------|------------------------------------------------------------------------------------------|
| package.json      | Enthält Metadaten, Abhängigkeiten, NPM-Skripte und Konfiguration der Extension           |
| package-lock.json | Automatisch gepflegter Lockfile für Abhängigkeits-Management (nicht manuell bearbeiten!) |
| tsconfig.json     | TypeScript-Compiler-Konfiguration, regelt Kompilierung und Projektstruktur               |
| typedoc.json      | Einstellungen für die automatische Code-Dokumentation mit TypeDoc                        |

**Hinweise:**  
- Für Änderungen an zentralen Konfigurationsdateien bitte immer im Team abstimmen.  
- Die wichtigsten NPM-Kommandos können in `package.json` unter `"scripts"` gefunden werden (z.B. `npm run docs` für Projektdokumentation).

---

## Projektstruktur (Kurzüberblick)

### Repository: "diva-e-cypress"
- `src/`  
  Enthält die Hauptlogik, Agents und Orchestrator für die KI-gestützte Testgenerierung.
- `prompts/`  
  Prompt-Templates für die KI-Befehle (Selectors, Steps, Verification).

### Repository: "diva-e-cypress-tests"
Beinhaltet die eigentliche Testumgebung mit den .feature - und generierten Dateien.

- `e2e/common/selectors/`
Enthält die automatisch generierten Selector-Dateien.
- `e2e/common/steps/`
Enthält die automatisch generierten Steps-Dateien.
- `e2e/demo/`
Beispiel .feature-Datei (demo.feature) für Testzwecke.
- `e2e/features/`
Weitere .feature-Dateien.

---

## Gesamtworkflow

1. Repo "diva-e-cypress" öffnen
2. Repo "diva-e-cypress-tests" öffnen
  - kann mit f5 geöffnet werden
3. LLM starten
  - Das LLM mit dem die Selectors - und Steps Dateien generiert werden sollen muss gestartet werden (z.B. Ollama)
4. Feature-Datei auswählen
  - Rechtsklick auf eine .feature-Datei (z. B. demo.feature) und per Extension den Prozess starten
5. Generierung
  - Die Selectors - und Steps Dateien werden nun erzeugt und in den enstsprechenden Ordnern abgelegt
6. Den Cypress-Test starten mit `npx cypress open`

---

### Weitere Hinweise

- **Feature-Dateien (`.feature`):**  
  Legt Testfälle in Gherkin-Syntax fest, die anschließend von der KI verarbeitet werden.
- **Automatische Dokumentation:**  
  Mit `npm run docs` (bzw. per TypeDoc) wird die gesamte JSDoc-Kommentierung zu einer HTML-Dokumentation generiert (im Ordner `docs/`).

