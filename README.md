# Projekt Wissensmanagement: Diva-E 

**Version:** 1.0.2 (Projektabschluss HTW Berlin SoSe2025)

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

## Mitglieder
- Leander Piepenbring   
- Tobias Lindhorst       
- Maximilian Berthold    
- Felix Riedel         
- Grace Leton Dodi

**Ansprechpartner Diva-E:** Alexander Thoms

---

## Installation

**Vorraussetzungen:**
- Ollama inkl. LLama 3.2
- Cypress

1. Erweiterungen-Ansicht (Shortcut: ⇧⌘X auf macOS bzw. Ctrl+Shift+X unter Windows/Linux).
2. Klicke oben rechts auf das ⋯-Menü (Weitere Aktionen).
3. VSIX installieren….
4. Navigiere zu diva-e-cypress-X.X.X.vsix und wähle sie aus.

---

## Setup

```bash
npm install
```

### Cypress Starten
```bash
(npx) cypress open
```
Über E2E Testing Browser auswählen und Test ausführen. 

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

### Repository: **diva-e-cypress**

```
--- src
├── agents
│   ├── baseAgent.ts
│   ├── codeRefactorAgent.ts
│   ├── selectorsAgent.ts
│   ├── stepsAgent.ts
│   └── verificationAgent.ts
├── extension.ts
├── htmlPreprocessor.ts
├── orchestrator.ts
├── prompts
│   ├── code_fix.ts
│   ├── promptTemplate.ts
│   ├── selectors_instruction.ts
│   ├── steps_instruction.ts
│   └── verification_instruction.ts
├── stepsGenerator.ts
└── switchUrl.ts
````

- `src/`
  Enthält die Hauptlogik des Projekts mit Agents, Orchestrator und Hilfsmodulen für die KI-gestützte Testgenerierung.

  - `agents/`
    Sammlung spezialisierter Agents, die jeweils einen Teil der Orchestrator-Logik abbilden:

    - **baseAgent.ts** – Gemeinsame Basisfunktionalitäten für alle Agents.
    - **codeRefactorAgent.ts** – Agent zur automatischen Code-Refaktorierung.
    - **selectorsAgent.ts** – Verantwortlich für die Generierung und Verwaltung von Selektoren.
    - **stepsAgent.ts** – Erzeugt Testschritte aus Feature-Beschreibungen.
    - **verificationAgent.ts** – Kümmert sich um die Validierung und Überprüfung der Testergebnisse.

  - **orchestrator.ts**
    Zentrale Steuerungslogik für LLM-Aufrufe und die Koordination der Agents.

  - **extension.ts**
    Bindeglied zum interaktiven VS-Code-Plugin in der Test-Umgebung.

  - **htmlPreprocessor.ts**
    Vorverarbeitung der Ziel-Webseite mit Puppeteer zur Optimierung der Prompt-Erstellung.

  - **stepsGenerator.ts**
    Liest Feature-Dateien ein und erstellt Schablonen für die Generierung von Step-Klassen.

  - **switchUrl.ts**
    Hilfsmodul zum einfachen Wechsel von URLs innerhalb der Cypress-Tests.

* `prompts/`
  Beinhaltet modulare Prompt-Templates für verschiedene KI-Aufgaben. Diese sind leicht anpassbar, z. B. bei LLM-Wechseln oder Umstrukturierungen:

  - **code_fix.ts** – Vorlage für Codekorrekturen.
  - **promptTemplate.ts** – Generische Prompt-Struktur als Basismodell.
  - **selectors_instruction.ts** – Vorgaben für die Selektoren-Erzeugung.
  - **steps_instruction.ts** – Regeln und Muster zur Step-Generierung.
  - **verification_instruction.ts** – Vorgaben für die Überprüfung und Validierung von Tests.



### Repository: "diva-e-cypress-tests"

```
cypress
├── downloads
├── e2e
│   ├── common
│   │   ├── selectors
│   │   │   └── orchestrator_selectors.ts
│   │   └── steps
│   │       └── orchestrator_steps.ts
│   └── features
│       └── orchestrator.feature
└── support
    └── e2e.js
```

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

## Workflow: Cypress-Tests mit *diva-e-cypress Extension* & Ollama

1. **Cypress-Projekt öffnen**

   - Öffnen Sie ein bestehendes oder neues Cypress-Projekt in VS Code.
   - Die *diva-e-cypress*-Extension (VSIX) muss bereits installiert sein.

2. **LLM starten (Ollama)**

   - Starten Sie Ollama und LLama 3.2 

     ```bash
     ollama run llama3.2
     ```

3. **Feature-Datei auswählen**

   - Rechtsklick auf eine `.feature`-Datei
   - Über die Extension den Prozess starten:

   -  **"Generate Cypress Test"** auswählen.
     <img width="521" height="594" alt="image" src="https://github.com/user-attachments/assets/4a5429a4-1500-4009-9caa-f1294bc0b719" />


4. **Generierung der Testdateien**

   - Die **Selectors**- und **Steps**-Dateien werden automatisch erzeugt und in die entsprechenden Projektordner geschrieben.
   - Den Fortschritt der Generierung können Sie im VS Code Terminal mitverfolgen.

5. **Cypress-Test ausführen**

   - Starten Sie die Tests mit:

     ```bash
     npx cypress open
     ```
   - ⚠️ Falls Fehler auftreten:

     - Prüfen, ob nur **eine eindeutige** `steps.ts`, `selectors.ts` und `.feature`-Datei im Projekt hinterlegt ist.


## Für Entwickler: 
1. Repo "diva-e-cypress" öffnen
2. `extension.ts` in VSCode öffnen
3. `F5` zum testen der Erweiterung
    - ein neues VSCode Fenster öffnet sich, hier kann der Ordner mit den Cypress Tests ausgewählt werden
4. Repo "diva-e-cypress-tests" öffnen
5. LLM starten
    - `ollama run llama3.2`
7. Feature-Datei auswählen
    - Rechtsklick auf eine .feature-Datei (z. B. demo.feature) und per Extension den Prozess starten
    - Öffnen mit "Generate Cypress Test"
8. Generierung
    - Die Selectors - und Steps Dateien werden nun erzeugt und in den enstsprechenden Ordnern abgelegt.
    - Die Generierung kann über das Terminal verfolgt werden - Status.
9. Den Cypress-Test starten mit `npx cypress open`
    - Falls Fehler beim Ausführen der Cypress-Tests in der Cypress Konsole aufkommen, stellen Sie sicher, dass nur eine eindeutige steps.ts | selectors.ts und feature hinterlegt sind.

---

### Weitere Hinweise

- **Feature-Dateien (`.feature`):**  
  - Legt Testfälle in Gherkin-Syntax fest, die anschließend von der KI verarbeitet werden.
  - Stellen Sie das richtige Format sicher! Eine Beispiel Feature liegt im Test-Projekt.
  - Gherkin-Logik sollte verfolgt werden und die URL für die gewünschte Webseite sollte an der passenden Stelle im richtigen Format liegen.
  ``` 
  # url: https://myurl.com/
  ``` 

- **Automatische Dokumentation:**  
  Mit `npm run docs` (bzw. per TypeDoc) wird die gesamte JSDoc-Kommentierung zu einer HTML-Dokumentation generiert (im Ordner `docs/`).

---

### Erweiterung bauen (Nur für Entwickler)

Erst muss die Erweiterung verpackt werden in eine `.vsix` Datei. 

``` 
  vsce package
``` 

Dann kann sie lokal installiert werden.
(Linux/Mac: code muss als PATH Variable hinzugefügt werden)

``` 
  code --install-extension my-extension-0.0.1.vsix
``` 


