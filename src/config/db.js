const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Configure a variável de ambiente antes de iniciar o servidor.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  // Erros de conexões ociosas não devem derrubar o processo inteiro.
  console.error('Erro inesperado no pool do PostgreSQL:', err.message);
});

// Sempre usar queries parametrizadas ($1, $2...) — nunca concatenar strings SQL.
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
