const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./utils/auth');

let supabase;
function getSupabase() {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY manquant. Ajoutez-les dans les variables d\'environnement de votre hébergeur.');
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}
const BUCKET = 'echoveille-files';

exports.handler = async (event) => {
  const authError = requireAuth(event);
  if (authError) return authError;

  const key = event.queryStringParameters && event.queryStringParameters.key;
  const nom = (event.queryStringParameters && event.queryStringParameters.nom) || 'fichier';
  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Paramètre key manquant.' }) };
  }

  try {
    const { data, error } = await getSupabase().storage.from(BUCKET).download(key);
    if (error || !data) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Fichier introuvable.' }) };
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${nom.replace(/[^a-zA-Z0-9.\-_ ]/g, '_')}"`,
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('ERREUR FONCTION:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
