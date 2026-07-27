const bcrypt = require('bcryptjs');
const { signSession } = require('./utils/auth');
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

  const { nom_utilisateur, password } = body;
  if (!nom_utilisateur || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: "Nom d'utilisateur et mot de passe requis." }) };
  }

  try {
    const result = await query(
      `select id, nom_utilisateur, nom_complet, mot_de_passe_hash from utilisateurs where nom_utilisateur = $1`,
      [nom_utilisateur.trim()]
    );

    if (result.rows.length === 0) {
      return { statusCode: 401, body: JSON.stringify({ error: "Nom d'utilisateur ou mot de passe incorrect." }) };
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.mot_de_passe_hash);
    if (!valid) {
      return { statusCode: 401, body: JSON.stringify({ error: "Nom d'utilisateur ou mot de passe incorrect." }) };
    }

    return {
      statusCode: 200,
      headers: { 'Set-Cookie': signSession(user), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, nom_complet: user.nom_complet }),
    };
  } catch (e) {
    console.error('ERREUR FONCTION:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
