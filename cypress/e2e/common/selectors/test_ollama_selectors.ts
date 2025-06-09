// cypress/e2e/common/selectors/ollama_selectors.ts

// 1) Besuch der Startseite
export const visitHomepage = () => {
  return cy.visit('/');
};

// 2) Klick auf ein beliebiges Label/Tile per data-cy oder Klassennamen oder Text
export const clickLabel = (label: string) => {
  const normalizedLabel = label.toLowerCase().replace(/\s+/g, '-').trim();
  return cy.get('body').then(($body) => {
    // 2a) data-cy
    if ($body.find(`[data-cy="${normalizedLabel}"]`).length > 0) {
      return cy.get(`[data-cy="${normalizedLabel}"]`, { timeout: 5000 }).click();
    }
    // 2b) CSS-Klasse .tile-<normalizedLabel>
    if ($body.find(`.tile-${normalizedLabel}`).length > 0) {
      return cy.get(`.tile-${normalizedLabel}`, { timeout: 5000 }).click();
    }
    // 2c) Fallback: einfacher Text-Klick
    return cy.contains(label).click();
  });
};

// 3) Sichtbarkeit prüfen für ein Label/Element per data-cy oder per Text
export const getLabel = (label: string) => {
  const normalizedLabel = label.toLowerCase().replace(/\s+/g, '-').trim();
  return cy.get('body').then(($body) => {
    if ($body.find(`[data-cy="${normalizedLabel}"]`).length > 0) {
      return cy.get(`[data-cy="${normalizedLabel}"]`, { timeout: 5000 });
    }
    return cy.contains(label);
  });
};

// 4) Beispiel für deine tieferen CSS-Selektoren als einzelne Exporte

// Kachel „Anlegen“
export const selAnlegen = () =>
  cy.get('section:nth-child(2) div div:nth-child(2).cursor-pointer');

// Endbetrag-Feld (Label oder Container)
export const selEndbetrag = () =>
  cy.get('#calculator > section:nth-child(3) > div:nth-child(2) > div > section > div > div:nth-child(1) > div');

// Anlagebetrag-Eingabefeld
export const selAnlagebetragInput = () =>
  cy.get(
    '#calculator > section:nth-child(3) > div:nth-child(2) > div > div:nth-child(2) > div > div > section > div.w-full.p-9.bg-gray-50.relative.box-border > div > div:nth-child(1) > div > div > div.flex.w-full.justify-between.items-center.border-2.border-gray-200.h-12.bg-white.border-solid input'
  );

// Endbetrag-Label (kleiner Text-Span; Beispiel-ID „4“ kann variieren)
export const selEndbetragLabel = () => cy.get('#4 > div > span:nth-child(1)');

// Endbetrag-Wert (Span mit dem tatsächlich berechneten Betrag)
export const selEndbetragValue = () => cy.get('#4 > div > span:nth-child(2)');
