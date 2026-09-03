/**
 * Aplica o schema.sql no banco definido em DATABASE_URL.
 * Uso:  npm run migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERRO: defina DATABASE_URL no seu .env antes de rodar a migração.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');

  try {
    console.log('Aplicando schema.sql...');
    await pool.query(sql);
    console.log('✅ Schema aplicado com sucesso.');
  } catch (err) {
    console.error('❌ Falha ao aplicar o schema:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
