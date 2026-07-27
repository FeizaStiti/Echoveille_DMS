const { requireAuth } = require('./utils/auth');
const { query } = require('./utils/db');

exports.handler = async (event) => {
  const authError = requireAuth(event);
  if (authError) return authError;

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }

  const search = (event.queryStringParameters && event.queryStringParameters.q) || '';

  try {
    const result = await query(
      `select id, nom, type, ville from etablissements
       where nom ilike $1
       order by nom asc
       limit 20`,
      [`%${search}%`]
    );
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.rows) };
  } catch (e) {
    console.error('ERREUR FONCTION:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
