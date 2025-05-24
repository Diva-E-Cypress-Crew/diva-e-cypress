# 🧩 Generate Feature – VS Code Extension

Mit dieser VS Code-Erweiterung kannst du ganz einfach `.feature`-Dateien aus bestehenden `.ts`- oder `.txt`-Dateien per Rechtsklick generieren.

Ideal für Cucumber-Testszenarien in BDD-Projekten – z. B. mit Cypress und Gherkin.

---

## 🚀 Features

- ✅ Rechtsklick auf `.ts` oder `.txt` → **„Feature-Datei generieren“**
- 📝 Erstellt automatisch eine `.feature`-Datei im selben Ordner
- 🔒 Funktioniert auch in privaten Workspaces/Projekten

---

## 📸 Beispiel

1. Rechtsklick auf eine `.ts`-Datei  
2. Befehl auswählen: **Feature-Datei generieren**
3. Ergebnis: Eine neue `.feature`-Datei wird im selben Ordner erstellt

---

## 📦 Voraussetzungen

- Visual Studio Code ab Version **1.100.0**
- Die Datei muss im `.ts`- oder `.txt`-Format sein
- Der Inhalt sollte sinnvoll für `.feature`-Konvertierung sein (z. B. Gherkin-ähnlich)

---

## ⚙️ Extension-Einstellungen

Diese Extension hat keine konfigurierbaren Einstellungen – sie funktioniert direkt nach der Installation.

---

## 🐞 Bekannte Probleme

- ⚠️ Aktuell werden `.js`-Dateien nicht unterstützt (nur `.ts` und `.txt`)
- Es wird der gesamte Dateiinhalt in die `.feature`-Datei übernommen – ohne Validierung

---

## 📋 Release Notes

### 0.0.1

- Initiale Version
- Rechtsklick-Funktion für `.ts` und `.txt` implementiert

---

## 🤝 Mitwirken

Dieses Projekt ist aktuell **privat** und wird in einem Team entwickelt.  
Wenn du mithelfen möchtest oder Feedback hast, kontaktiere bitte die Repository-Verantwortlichen.

---

**Viel Spaß mit deiner Extension! 🚀**
