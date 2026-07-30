const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./utils/auth');
const { query } = require('./utils/db');

let supabase;
function getSupabase() {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY manquant. Ajoutez-les dans les variables d\'environnement de votre hébergeur pour activer le stockage des fichiers joints.');
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}
const BUCKET = 'echoveille-files';

async function saveFile(base64File, prefix) {
  if (!base64File || !base64File.data) return { key: null, nom: null };
  const key = `${prefix}-${Date.now()}-${base64File.nom.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const buffer = Buffer.from(base64File.data, 'base64');
  const { error } = await getSupabase().storage.from(BUCKET).upload(key, buffer, {
    contentType: base64File.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(`Échec de l'envoi du fichier : ${error.message}`);
  return { key, nom: base64File.nom };
}

exports.handler = async (event) => {
  const authError = requireAuth(event);
  if (authError) return authError;

  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    try {
      if (id) {
        const result = await query(
          `select e.*, et.nom as etablissement_nom, et.type as etablissement_type, et.ville as etablissement_ville
           from echographes e
           join etablissements et on et.id = e.etablissement_id
           where e.id = $1`,
          [id]
        );
        if (result.rows.length === 0) {
          return { statusCode: 404, body: JSON.stringify({ error: 'Échographe introuvable' }) };
        }
        const contrats = await query(
          `select * from contrats where echographe_id = $1 order by created_at desc`,
          [id]
        );
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...result.rows[0], contrats: contrats.rows }) };
      }

      const result = await query(
        `select e.id, e.marque, e.type_appareil, e.numero_serie, e.date_installation, e.garantie_fin,
                e.fiche_travail_key, e.fiche_travail_nom, e.bon_livraison_key, e.bon_livraison_nom,
                et.nom as etablissement_nom, et.type as etablissement_type, et.ville as etablissement_ville
         from echographes e
         join etablissements et on et.id = e.etablissement_id
         order by e.created_at desc`
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

    const {
      marque, type_appareil, numero_serie, date_installation, garantie_fin,
      etablissement_nom, etablissement_type, etablissement_ville,
      fiche_travail, bon_livraison,
    } = body;

    if (!marque || !type_appareil || !numero_serie || !date_installation || !etablissement_nom || !etablissement_type) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Champs obligatoires manquants.' }) };
    }

    try {
      const marqueNormalisee = marque.trim();
      const typeNormalise = type_appareil.trim();
      const serieNormalisee = numero_serie.trim();
      const nomNormalise = etablissement_nom.trim();
      let etabResult = await query(
        `select id from etablissements where lower(trim(nom)) = lower($1)`,
        [nomNormalise]
      );
      let etablissementId;
      if (etabResult.rows.length > 0) {
        etablissementId = etabResult.rows[0].id;
      } else {
        const inserted = await query(
          `insert into etablissements (nom, type, ville) values ($1, $2, $3) returning id`,
          [nomNormalise, etablissement_type, etablissement_ville || null]
        );
        etablissementId = inserted.rows[0].id;
      }

      const ficheSaved = await saveFile(fiche_travail, 'fiche');
      const bonSaved = await saveFile(bon_livraison, 'bon');

      const result = await query(
        `insert into echographes
          (marque, type_appareil, numero_serie, etablissement_id, date_installation, garantie_fin,
           fiche_travail_key, fiche_travail_nom, bon_livraison_key, bon_livraison_nom)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id`,
        [marqueNormalisee, typeNormalise, serieNormalisee, etablissementId, date_installation, garantie_fin || null,
         ficheSaved.key, ficheSaved.nom, bonSaved.key, bonSaved.nom]
      );

      return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: result.rows[0].id }) };
    } catch (e) {
      if (e.code === '23505') {
        return { statusCode: 409, body: JSON.stringify({ error: 'Ce numéro de série existe déjà.' }) };
      }
      console.error('ERREUR FONCTION:', e);
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === 'PUT') {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'id manquant' }) };
    }
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Requête invalide' }) };
    }

    const {
      marque, type_appareil, numero_serie, date_installation, garantie_fin,
      etablissement_nom, etablissement_type, etablissement_ville,
    } = body;

    if (!marque || !type_appareil || !numero_serie || !date_installation || !etablissement_nom || !etablissement_type) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Champs obligatoires manquants.' }) };
    }

    try {
      const nomNormalise = etablissement_nom.trim();
      let etabResult = await query(
        `select id from etablissements where lower(trim(nom)) = lower($1)`,
        [nomNormalise]
      );
      let etablissementId;
      if (etabResult.rows.length > 0) {
        etablissementId = etabResult.rows[0].id;
        if (etablissement_ville) {
          await query(`update etablissements set ville = $1, type = $2 where id = $3`, [etablissement_ville, etablissement_type, etablissementId]);
        }
      } else {
        const inserted = await query(
          `insert into etablissements (nom, type, ville) values ($1, $2, $3) returning id`,
          [nomNormalise, etablissement_type, etablissement_ville || null]
        );
        etablissementId = inserted.rows[0].id;
      }

      await query(
        `update echographes set marque=$1, type_appareil=$2, numero_serie=$3, etablissement_id=$4,
         date_installation=$5, garantie_fin=$6 where id=$7`,
        [marque.trim(), type_appareil.trim(), numero_serie.trim(), etablissementId, date_installation, garantie_fin || null, id]
      );

      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      if (e.code === '23505') {
        return { statusCode: 409, body: JSON.stringify({ error: 'Ce numéro de série existe déjà.' }) };
      }
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
      await query(`delete from echographes where id = $1`, [id]);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      console.error('ERREUR FONCTION:', e);
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Méthode non autorisée' };
};
