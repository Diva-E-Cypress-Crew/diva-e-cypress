import { cy } from 'cypress';

const cySelectors = {
  selAnlegen: '.list > li > a', // Anlegen button
  selWertentwicklung: '#wertentwicklung', // Wertentwicklung dropdown
  selAnlagenzeitraumEinmaligeAusgabe: '#anlagenzeitraum > :first-child', // Einmalige Ausgabe
  selAnlagenzeitraumJahreszeitraum: '#anlagenzeitraum > :nth-child(2)', // Jahreszeitraum
  selWertentwicklungLinienwert: 'option[value="linienwert"]', // Linienwert
  selWertentwicklungPunktwert: 'option[value="punktwert"]', // Punktwert
  selAnlagenhäufigkeitMondrunde: '#anlagenhäufigkeit > :nth-child(1)', // Anlagehäufigkeit - Monat und Runde
  selAnlagenhäufigkeitWochendrunde: '#anlagenhäufigkeit > :nth-child(2)', // Anlagehäufigkeit - Woche und Runde
  selKapitalverzinsungOption: 'option[value="kapitalverzinsung"]', // Kapitalverzinsung Option
  selVerwaltungsgebührOption: 'option[value="verwaltungsgehr"]' // Verwaltungsgebühr Option
};

export default cySelectors;