// Reproduit côté client la logique de netlify/functions/utils/schedule.js
// pour afficher un aperçu en direct du planning avant l'enregistrement du contrat.

function addMonthsUTC(date, months) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function generateVisitDatesPreview(datePremiere, frequencePerAn) {
  if (!datePremiere || !frequencePerAn) return [];
  const start = new Date(datePremiere + 'T00:00:00Z');
  const interval = 12 / frequencePerAn;
  const dates = [];
  for (let i = 0; i < frequencePerAn; i++) {
    dates.push(addMonthsUTC(start, interval * i).toISOString().slice(0, 10));
  }
  return dates;
}
