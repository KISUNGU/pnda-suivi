/**
 * Point de demarrage du serveur HTTP.
 *
 * Separe de app.ts pour que l'application Express puisse etre importee sans
 * ouvrir de port : tests, inventaire des routes, outillage CI.
 */
import app from './app';

const PORT = Number(process.env.PORT) || 3000;

const serveur = app.listen(PORT, () => {
  console.log(`API PNDA S&E demarree sur http://localhost:${PORT}`);
  console.log(`Base : Postgres/Supabase (DATABASE_URL)`);
});

// Arret propre : sans cela, un redemarrage laisse le port occupe et les
// connexions Postgres ouvertes cote pooler.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[server] ${signal} recu, arret en cours...`);
    serveur.close(() => process.exit(0));
  });
}
