const { requireAuth, getSessionUser } = require('./utils/auth');
const { query } = require('./utils/db');

const TYPES_VALIDES = ['installation', 'panne', 'depannage', 'maintenance', 'autre'];

exports.handler = async (event) => {
  const authError = requireAuth(event);
  if (authError) return authError;

  if (event.httpMethod === 'GET') {
    const echographeId = event.queryStringParameters && event.queryStringParameters.echographe_id;
    try {
      const params = [];
      let where = '';
      if (echographeId) {
        params.push(echographeId);
        where = `where i.echographe_id = $${params.length}`;
      }
      const result = await query(
        `select i.id, i.echographe_id, i.type_intervention, i.description, i.date_intervention, i.created_at,
                e.marque, e.type_appareil, e.numero_serie,
                et.nom as etablissement_nom,
                u.nom_complet as technicien_nom
         from interventions i
         join echographes e on e.id = i.echographe_id
         join etablissements et on et.id = e.etablissement_id
         left join utilisateurs u on u.id = i.technicien_id
         ${where}
         order by i.date_intervention desc, i.created_at desc`,
        params
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

    const { echographe_id, type_intervention, description, date_intervention } = body;
    if (!echographe_id || !type_intervention) {
      return { statusCode: 400, body: JSON.stringify({ error: "Échographe et type d'intervention obligatoires." }) };
    }
    if (!TYPES_VALIDES.includes(type_intervention)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Type d'intervention invalide." }) };
    }

    const user = getSessionUser(event);

    try {
      const dateEffective = date_intervention || new Date().toISOString().slice(0, 10);
      const inserted = await query(
        `insert into interventions (echographe_id, technicien_id, type_intervention, description, date_intervention)
         values ($1,$2,$3,$4,$5) returning id`,
        [
          echographe_id,
          user ? user.id : null,
          type_intervention,
          (description || '').trim() || null,
          dateEffective,
        ]
      );

      let maintenanceCloturee = null;
      if (type_intervention === 'maintenance') {
        // On referme automatiquement la visite de maintenance planifiée la plus
        // ancienne (en retard ou à venir) pour cet échographe, afin d'éviter un
        // double suivi : l'intervention et la maintenance planifiée ne font plus
        // qu'un seul point de vérité, et la notification associée disparaît.
        const pending = await query(
          `select m.id
           from maintenances m
           join contrats c on c.id = m.contrat_id
           where c.echographe_id = $1 and m.statut in ('a_venir', 'retard')
           order by m.date_prevue asc
           limit 1`,
          [echographe_id]
        );
        if (pending.rows.length > 0) {
          await query(
            `update maintenances set statut = 'fait', date_effective = $1, technicien_id = $2 where id = $3`,
            [dateEffective, user ? user.id : null, pending.rows[0].id]
          );
          maintenanceCloturee = pending.rows[0].id;
        }
      }

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inserted.rows[0].id, maintenance_cloturee: maintenanceCloturee }),
      };
    } catch (e) {
      console.error('ERREUR FONCTION:', e);
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'id manquant' }) };
    }
    try {
      await query(`delete from interventions where id = $1`, [id]);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      console.error('ERREUR FONCTION:', e);
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Méthode non autorisée' };
};
