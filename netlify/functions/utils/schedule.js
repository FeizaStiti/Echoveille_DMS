// Génère les dates de visite d'un contrat sur 1 an, à intervalle régulier,
// en partant de la date de la première maintenance.
// frequence_par_an: 2 -> tous les 6 mois | 3 -> tous les 4 mois | 4 -> tous les 3 mois

function monthsBetweenVisits(frequencePerAn) {
  return 12 / frequencePerAn;
}

function addMonthsUTC(date, months) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function generateVisitDates(datePremiere, frequencePerAn) {
  const start = new Date(datePremiere + 'T00:00:00Z');
  const interval = monthsBetweenVisits(frequencePerAn);
  const dates = [];
  for (let i = 0; i < frequencePerAn; i++) {
    dates.push(toISODate(addMonthsUTC(start, interval * i)));
  }
  return dates;
}

module.exports = { generateVisitDates };
