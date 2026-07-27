const { requireAuth, getSessionUser } = require('./utils/auth');
const { query } = require('./utils/db');
const { generateVisitDates } = require('./utils/schedule');

exports.handler = async (event) => {
  const authError = requireAuth(event);
  if (authError) return authError;

  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    try {
      if (id) {
        const contrat = await query(
          `select c.*, e.marque, e.type_appareil, e.numero_serie, et.nom as etablissement_nom
           from contrats c
           join echographes e on e.id = c.echographe_id
           join etablissements et on et.id = e.etablissement_id
           where c.id = $1`,
          [id]
        );
        if (contrat.rows.length === 0) {
          return { statusCode: 404, body: JSON.stringify({ error: 'Contrat introuvable' }) };
        }
        const maintenances = await query(
          `select * from maintenances where contrat_id = $1 order by numero_visite asc`,
          [id]
        );
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...contrat.rows[0], maintenances: maintenances.rows }) };
      }

      const result = await query(
        `select c.id, c.type_contrat, c.frequence_par_an, c.date_premiere_maintenance, c.statut,
                e.marque, e.type_appareil, e.numero_serie, et.nom as etablissement_nom,
                (select count(*) from maintenances m where m.contrat_id = c.id and m.statut = 'fait') as visites_faites,
                (select min(date_prevue) from maintenances m where m.contrat_id = c.id and m.statut = 'a_venir') as prochaine_visite
         from contrats c
         join echographes e on e.id = c.echographe_id
         join etablissements et on et.id = e.etablissement_id
         order by c.created_at desc`
      );
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.rows) };
    } catch (e) {
      console.error('ERREUR FONCTION:', e);
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Requête invalide' }) };
    }

    const { action } = body;

    if (action === 'marquer_fait') {
      const { maintenance_id, date_effective, notes } = body;
      if (!maintenance_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'maintenance_id manquant' }) };
      }
      const user = getSessionUser(event);
      try {
        await query(
          `update maintenances set statut = 'fait', date_effective = $1, notes = $2, technicien_id = $3 where id = $4`,
          [date_effective || new Date().toISOString().slice(0, 10), notes || null, user ? user.id : null, maintenance_id]
        );
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
      } catch (e) {
        console.error('ERREUR FONCTION:', e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
      }
    }

    if (action === 'renouveler') {
      const { contrat_id, date_premiere_maintenance } = body;
      if (!contrat_id || !date_premiere_maintenance) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Champs manquants pour le renouvellement.' }) };
      }
      try {
        const old = await query(`select * from contrats where id = $1`, [contrat_id]);
        if (old.rows.length === 0) {
          return { statusCode: 404, body: JSON.stringify({ error: 'Contrat introuvable' }) };
        }
        await query(`update contrats set statut = 'renouvele' where id = $1`, [contrat_id]);

        const c = old.rows[0];
        const inserted = await query(
          `insert into contrats (echographe_id, type_contrat, frequence_par_an, date_premiere_maintenance)
           values ($1,$2,$3,$4) returning id`,
          [c.echographe_id, c.type_contrat, c.frequence_par_an, date_premiere_maintenance]
        );
        const newContratId = inserted.rows[0].id;
        const dates = generateVisitDates(date_premiere_maintenance, c.frequence_par_an);
        for (let i = 0; i < dates.length; i++) {
          await query(
            `insert into maintenances (contrat_id, numero_visite, date_prevue) values ($1,$2,$3)`,
            [newContratId, i + 1, dates[i]]
          );
        }
        return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: newContratId }) };
      } catch (e) {
        console.error('ERREUR FONCTION:', e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
      }
    }

    if (action === 'modifier') {
      const { contrat_id, type_contrat, frequence_par_an, date_premiere_maintenance } = body;
      if (!contrat_id || !type_contrat || !frequence_par_an || !date_premiere_maintenance) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Champs obligatoires manquants.' }) };
      }
      if (![2, 3, 4].includes(Number(frequence_par_an))) {
        return { statusCode: 400, body: JSON.stringify({ error: 'La fréquence doit être 2, 3 ou 4 fois par an.' }) };
      }
      try {
        const existing = await query(`select id from contrats where id = $1`, [contrat_id]);
        if (existing.rows.length === 0) {
          return { statusCode: 404, body: JSON.stringify({ error: 'Contrat introuvable' }) };
        }
        await query(
          `update contrats set type_contrat=$1, frequence_par_an=$2, date_premiere_maintenance=$3 where id=$4`,
          [type_contrat, Number(frequence_par_an), date_premiere_maintenance, contrat_id]
        );
        // Le planning est régénéré entièrement (les visites déjà marquées "faites" sont remplacées)
        await query(`delete from maintenances where contrat_id = $1`, [contrat_id]);
        const dates = generateVisitDates(date_premiere_maintenance, Number(frequence_par_an));
        for (let i = 0; i < dates.length; i++) {
          await query(
            `insert into maintenances (contrat_id, numero_visite, date_prevue) values ($1,$2,$3)`,
            [contrat_id, i + 1, dates[i]]
          );
        }
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
      } catch (e) {
        console.error('ERREUR FONCTION:', e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
      }
    }

    if (action === 'supprimer') {
      const { contrat_id } = body;
      if (!contrat_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'contrat_id manquant' }) };
      }
      try {
        await query(`delete from contrats where id = $1`, [contrat_id]);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
      } catch (e) {
        console.error('ERREUR FONCTION:', e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
      }
    }

    // Création d'un nouveau contrat
    const { echographe_id, type_contrat, frequence_par_an, date_premiere_maintenance } = body;
    if (!echographe_id || !type_contrat || !frequence_par_an || !date_premiere_maintenance) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Champs obligatoires manquants.' }) };
    }
    if (![2, 3, 4].includes(Number(frequence_par_an))) {
      return { statusCode: 400, body: JSON.stringify({ error: 'La fréquence doit être 2, 3 ou 4 fois par an.' }) };
    }

    try {
      const inserted = await query(
        `insert into contrats (echographe_id, type_contrat, frequence_par_an, date_premiere_maintenance)
         values ($1,$2,$3,$4) returning id`,
        [echographe_id, type_contrat, frequence_par_an, date_premiere_maintenance]
      );
      const contratId = inserted.rows[0].id;
      const dates = generateVisitDates(date_premiere_maintenance, Number(frequence_par_an));
      for (let i = 0; i < dates.length; i++) {
        await query(
          `insert into maintenances (contrat_id, numero_visite, date_prevue) values ($1,$2,$3)`,
          [contratId, i + 1, dates[i]]
        );
      }
      return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: contratId, planning: dates }) };
    } catch (e) {
      console.error('ERREUR FONCTION:', e);
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Méthode non autorisée' };
};
