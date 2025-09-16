# Projekt Wissensmanagement: Diva-E 

**Version:** 1.0.0 (Projektabschluss HTW Berlin SoSe2025)

## Automatisches Erstellen von Cypress Tests unter Verwendung von KI Tools
- Es soll ein Tool entwickelt werden, das eine bestehende Testanforderung auf Basis eines Cucumber Files für eine gegebene Testanwendung analysiert und daraus entsprechend Cypress Tests erzeugt.
### Ziel des Projekts:
Im Rahmen des Moduls "Projekt Wissensmanagement" an der HTW Berlin war das Ziel, zusammen mit der Firma diva-e ein Tool zu entwickeln, das mithilfe von LLMs (Large Language Models) automatisiert Cypress Tests generiert. Basis hierfür sind Testanforderungen, die in Form von Cucumber-Feature-Dateien vorliegen. Ziel war es, eine Visual Studio Code Extension zu erstellen, mithilfe welcher Nutzer durch einen einfachen Rechtsklick auf eine Feature-Datei den Prozess der Testgenerierung starten können. 

Das Projekt diente dazu, einen Prototypen zu entwickeln, der die Machbarkeit und Sinnhaftigkeit eines solchen Tools demonstriert. Ein weiteres Ziel war es, die Performance von lokalen LLMs über Ollama für einen derartigen Anwendungsfall zu überprüfen.

### Mögliche zukünftige Verbesserungen:
#### - Verwendung leistungsstärkerer LLMs:
  Es hat sich im Laufe des Projekts gezeigt, das es grundsätzlich möglich ist, Cypress Tests automatisiert zu generieren. Allerdings sind aufgrund der Begrenzungen der lokalen LLMs, insbesondere die Kontextlänge, bisher keine komplexen Testfälle zuverlässig umsetzbar. Daher wäre es interessant, mit leistungsstarken Cloud-basierten LLMs (bspw. GPT-5, Gemini 2.5 Pro) zu überprüfen, ob diese in der Lage sind, auch komplexere Cypress Tests zu generieren.
#### - Implementierung einer grafischen Benutzeroberfläche (GUI):
  Ebenfalls wäre es denkbar, über eine GUI die Wahl verschiedener LLMs zu ermöglichen. Außerdem ist es aktuell so, dass die entsprechende URL am Anfang der Feature-Datei angegeben werden muss. Die Wahl der URL könnte hier auch über diese GUI erfolgen.

### Anmerkungen:
- 


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
oder alternativ / manuell:
```bash
npm install -D cypress@13.6.3
npm install -D cypress-cucumber-preprocessor@4.3.1
npm install -D typescript@5.3.3
npm install -D @badeball/cypress-cucumber-preprocessor@20.0.1
npm install -D @shelex/cypress-allure-plugin@2.40.1
```

Zur Sicherstellung, dass alle Packages auf den neusten Stand installiert sind. 

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

**Erweiterung der Dokumentation:**
- Falls die Dokumentation erweitert werden soll, pushen Sie die Änderungen mit `nmp run docs`  
---

## Projektstruktur (Kurzüberblick)

### Repository: "diva-e-cypress"
- `src/`  
  Enthält die Hauptlogik, Agents und Orchestrator für die KI-gestützte Testgenerierung.
  - `agents`  
  Hier sind alle Orchestrator-Abschnitte (Agents) einzeln abgebildet, um eine bessere Organisation zu gewährleisten.
  Der Aufbau jedes Agents ist in dem jeweiligen Abschnitt genauer erklärt.
  - `test`  
  Hier ist die eigentliche Backend-Logik dokumentiert. 
  Orchestrator: Kernlogik der LLM-Aufrufe, von hier werden die einzelnen Dateien angesteuert und aufgerufen.
  extension.ts: Zum interaktiven VS-Code Plugin in der Test-Umgebung.
  htmlPreprocessor.ts: Auslagerung der Vorverarbeitung der Webseite für die LLM-Prompts durch Puppeteer.
  stepsGenerator.ts: Erweiterung der Steps-Generierung. Die Feature wird vor dem Aufrufen der LLMs ausgelesen und eine Schablone für die Steps-Klassen generiert.
  switchUrl.ts: Ergänzung eines vereinfachten URL-Wechsels für die Cypress-Tests.


- `prompts/`  
  Prompt-Templates für die KI-Befehle (Selectors, Steps, Verification).
  Einfach modifizierbar, für Umstrukturierung oder Wechseln von LLMs.

### Repository: "diva-e-cypress-tests"
Beinhaltet die eigentliche Testumgebung mit den .feature - und generierten Dateien.
Falls Fehler beim Ausführen der Cypress-Tests in der Cypress Konsole aufkommen, stellen Sie sicher, dass nur eine eindeutige steps.ts | selectors.ts und feature hinterlegt sind.

- `e2e/common/selectors/`
Enthält die automatisch generierten Selector-Dateien.
- `e2e/common/steps/`
Enthält die automatisch generierten Steps-Dateien.
- `e2e/demo/`
Beispiel .feature-Datei (demo.feature) für Testzwecke.
- `e2e/features/`
Weitere .feature-Dateien, welche eine Gherkin-Logik enthalten die genau so befolgt werden muss um einen funktionierenden Cypress-Test zu gewährleisten.


#### Beispiel einer Muster-Feature-Datei:
``` 
# url: https://meag.gitlab.diva-e.com/investmentrechner-2023/

Feature: MEAG Investmentrechner – Button-Klick (minimal)

  Scenario: Klick auf "Anlegen"-Tile
    Given the Customer is on the homepage
    When  he clicks the "Anlegen" button
    Then  the "Was möchten Sie berechnen?" title should be displayed
```

---

## Gesamtworkflow

1. Repo "diva-e-cypress" öffnen
2. Repo "diva-e-cypress-tests" öffnen
    - kann mit f5 geöffnet werden (falls es nicht auf Anhieb funktioniert, stellen Sie sicher, dass eine .ts geöffnet ist)
3. LLM starten
    - Das LLM mit dem die Selectors - und Steps Dateien generiert werden sollen muss gestartet werden (z.B. Ollama)
    - `ollama run llama3.2`
4. Feature-Datei auswählen
    - Rechtsklick auf eine .feature-Datei (z. B. demo.feature) und per Extension den Prozess starten
    - Öffnen mit "Generate Cypress Test (Ollama)"
    - Die anderen Auswahlmöglichkeiten sind aus Testzwecken noch enthalten und können mit anderen LLMs ersetzt werden, falls gewünscht.
5. Generierung
    - Die Selectors - und Steps Dateien werden nun erzeugt und in den enstsprechenden Ordnern abgelegt.
    - Die Generierung kann über das Terminal verfolgt werden - Status.
6. Den Cypress-Test starten mit `npx cypress open`
    - Falls Fehler beim Ausführen der Cypress-Tests in der Cypress Konsole aufkommen, stellen Sie sicher, dass nur eine eindeutige steps.ts | selectors.ts und feature hinterlegt sind.

---

### Weitere Hinweise

- **Feature-Dateien (`.feature`):**  
  - Legt Testfälle in Gherkin-Syntax fest, die anschließend von der KI verarbeitet werden.
  - Stellen Sie das richtige Format sicher! Eine Beispiel Feature liegt im Test-Projekt.
  - Gherkin-Logik sollte verfolgt werden und die URL für die gewünschte Webseite sollte an der passenden Stelle im richtigen Format liegen.
  ``` 
  # url: https://blabla.de/
  ``` 

- **Automatische Dokumentation:**  
  Mit `npm run docs` (bzw. per TypeDoc) wird die gesamte JSDoc-Kommentierung zu einer HTML-Dokumentation generiert (im Ordner `docs/`).

