const bcrypt = require('bcryptjs');
const { query } = require('./utils/db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Requête invalide' }) };
  }

  const { nom_utilisateur, nom_complet, password } = body;
  if (!nom_utilisateur || !nom_complet || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Champs obligatoires manquants.' }) };
  }
  if (password.length < 6) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }) };
  }

  try {
    const existing = await query(`select count(*)::int as n from utilisateurs`);
    if (existing.rows[0].n > 0) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Un compte existe déjà. La création initiale n'est plus disponible — connectez-vous, puis ajoutez des comptes depuis la page Équipe." }),
      };
    }

    const hash = await bcrypt.hash(password, 10);
    await query(
      `insert into utilisateurs (nom_utilisateur, nom_complet, mot_de_passe_hash, role) values ($1,$2,$3,'admin')`,
      [nom_utilisateur.trim(), nom_complet.trim(), hash]
    );

    return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('ERREUR FONCTION:', e);
    if (e.code === '23505') {
      return { statusCode: 409, body: JSON.stringify({ error: "Ce nom d'utilisateur existe déjà." }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
