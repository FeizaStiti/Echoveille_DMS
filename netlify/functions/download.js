const { requireAuth } = require('./utils/auth');
const { query } = require('./utils/db');

const LABELS_INTERVENTION = {
  installation: 'une installation',
  panne: 'un dépannage (panne signalée)',
  depannage: 'un dépannage',
  autre: 'une intervention',
};

exports.handler = async (event) => {
  const authError = requireAuth(event);
  if (authError) return authError;

  try {
    // Marquer automatiquement en retard les maintenances passées non faites
    await query(
      `update maintenances set statut = 'retard'
       where statut = 'a_venir' and date_prevue < current_date`
    );

    const [echoCount, etabCount, contratsActifs, alertes48h, retards, interventionsRecentes, maintenancesRecentes] = await Promise.all([
      query(`select count(*)::int as n from echographes`),
      query(`select count(*)::int as n from etablissements`),
      query(`select count(*)::int as n from contrats where statut = 'actif'`),
      query(
        `select m.id, m.date_prevue, m.numero_visite, c.id as contrat_id, c.type_contrat,
                e.marque, e.type_appareil, e.numero_serie, et.nom as etablissement_nom
         from maintenances m
         join contrats c on c.id = m.contrat_id
         join echographes e on e.id = c.echographe_id
         join etablissements et on et.id = e.etablissement_id
         where m.statut = 'a_venir'
           and m.date_prevue between current_date and current_date + interval '2 days'
         order by m.date_prevue asc`
      ),
      query(
        `select m.id, m.date_prevue, m.numero_visite, c.id as contrat_id, c.type_contrat,
                e.marque, e.type_appareil, e.numero_serie, et.nom as etablissement_nom
         from maintenances m
         join contrats c on c.id = m.contrat_id
         join echographes e on e.id = c.echographe_id
         join etablissements et on et.id = e.etablissement_id
         where m.statut = 'retard'
         order by m.date_prevue asc`
      ),
      query(
        `select i.id, i.type_intervention, i.description, i.date_intervention,
                e.marque, e.type_appareil, et.nom as etablissement_nom,
                u.nom_complet as technicien_nom
         from interventions i
         join echographes e on e.id = i.echographe_id
         join etablissements et on et.id = e.etablissement_id
         left join utilisateurs u on u.id = i.technicien_id
         order by i.created_at desc
         limit 10`
      ),
      query(
        `select m.id, m.numero_visite, m.date_effective,
                e.marque, e.type_appareil, et.nom as etablissement_nom,
                u.nom_complet as technicien_nom
         from maintenances m
         join contrats c on c.id = m.contrat_id
         join echographes e on e.id = c.echographe_id
         join etablissements et on et.id = e.etablissement_id
         left join utilisateurs u on u.id = m.technicien_id
         where m.statut = 'fait' and m.technicien_id is not null
         order by m.date_effective desc nulls last
         limit 10`
      ),
    ]);

    const activites = [
      ...interventionsRecentes.rows.map((i) => ({
        id: 'int-' + i.id,
        date: i.date_intervention,
        technicien_nom: i.technicien_nom,
        message: `a effectué ${LABELS_INTERVENTION[i.type_intervention] || 'une intervention'} sur ${i.marque} ${i.type_appareil} — ${i.etablissement_nom}`,
      })),
      ...maintenancesRecentes.rows.map((m) => ({
        id: 'maint-' + m.id,
        date: m.date_effective,
        technicien_nom: m.technicien_nom,
        message: `a effectué la visite de maintenance n°${m.numero_visite} sur ${m.marque} ${m.type_appareil} — ${m.etablissement_nom}`,
      })),
    ]
      .filter((a) => a.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    return {
      statusCode: 200,
      body: JSON.stringify({
        stats: {
          echographes: echoCount.rows[0].n,
          etablissements: etabCount.rows[0].n,
          contrats_actifs: contratsActifs.rows[0].n,
        },
        alertes_48h: alertes48h.rows,
        retards: retards.rows,
        activites,
      }),
    };
  } catch (e) {
    console.error('ERREUR FONCTION:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
