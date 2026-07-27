const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL manquant. Ajoutez-le dans les variables d\'environnement de votre hébergeur.');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  return client.query(text, params);
}

module.exports = { query };
