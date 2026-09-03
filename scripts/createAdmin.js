/**
 * Cria (ou atualiza a senha de) o administrador inicial.
 * A senha NUNCA é armazenada em texto puro — apenas o hash bcrypt.
 *
 * Uso:
 *   npm run seed:admin
 * (lê ADMIN_EMAIL e ADMIN_PASSWORD do .env)
 *
 * Ou passando na linha de comando (não fica salvo no histórico do servidor):
 *   node scripts/createAdmin.js seu@email.com "SuaSenhaForte123!"
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function main() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ERRO: informe ADMIN_EMAIL e ADMIN_PASSWORD (no .env ou como argumentos).');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('ERRO: use uma senha com pelo menos 10 caracteres.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);

    if (existing.rows.length) {
      await pool.query('UPDATE admins SET password_hash = $1 WHERE email = $2', [passwordHash, email]);
      console.log(`✅ Senha atualizada para o admin existente: ${email}`);
    } else {
      await pool.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2)', [email, passwordHash]);
      console.log(`✅ Administrador criado: ${email}`);
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
