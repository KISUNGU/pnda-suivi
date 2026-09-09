require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const { rows } = await pool.query('SELECT id_utilisateur, nom, prenom, email, id_profil FROM utilisateur ORDER BY id_utilisateur');
  console.log(rows);
  await pool.end();
})();
