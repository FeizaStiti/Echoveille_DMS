const bcrypt = require('bcryptjs');
const { requireAuth, getSessionUser } = require('./utils/auth');
const { query } = require('./utils/db');

exports.handler = async (event) => {
  const authError = requireAuth(event);
  if (authError) return authError;

  if (event.httpMethod === 'GET') {
    try {
      const result = await query(
        `select id, nom_utilisateur, nom_complet, role, created_at from utilisateurs order by created_at asc`
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

    const { nom_utilisateur, nom_complet, password } = body;
    if (!nom_utilisateur || !nom_complet || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Champs obligatoires manquants.' }) };
    }
    if (password.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }) };
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      const result = await query(
        `insert into utilisateurs (nom_utilisateur, nom_complet, mot_de_passe_hash, role)
         values ($1,$2,$3,'technicien') returning id`,
        [nom_utilisateur.trim(), nom_complet.trim(), hash]
      );
      return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: result.rows[0].id }) };
    } catch (e) {
      console.error('ERREUR FONCTION:', e);
      if (e.code === '23505') {
        return { statusCode: 409, body: JSON.stringify({ error: "Ce nom d'utilisateur existe déjà." }) };
      }
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'id manquant' }) };
    }
    const currentUser = getSessionUser(event);
    if (currentUser && currentUser.id === id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Vous ne pouvez pas supprimer votre propre compte pendant que vous êtes connecté avec.' }) };
    }
    try {
      const countResult = await query(`select count(*)::int as n from utilisateurs`);
      if (countResult.rows[0].n <= 1) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Impossible de supprimer le dernier compte restant.' }) };
      }
      await query(`delete from utilisateurs where id = $1`, [id]);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      console.error('ERREUR FONCTION:', e);
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Méthode non autorisée' };
};
