/**
 * Configuration lue dans l'environnement.
 *
 * Regroupee ici pour qu'un seul fichier decrive ce que le backend attend de
 * son environnement, et pour que les routers n'aient pas a importer app.ts.
 *
 * Le chargement dotenv a lieu ici et non chez l'appelant : ce module lit
 * process.env des son import, et les imports sont evalues avant le corps du
 * module importateur. Charger .env plus tard reviendrait a lire un
 * environnement vide.
 */
import dotenv from 'dotenv';
import path from 'path';

// .env.local surcharge .env pour le dev local (sans effet si les variables
// sont deja definies, ex. Docker ou CI).
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config();


/**
 * Clé de signature des jetons. Aucune valeur de repli : une clé codée en dur
 * dans le dépôt permettrait de forger un jeton administrateur. Le serveur
 * refuse de démarrer si la variable est absente ou trop courte.
 */
export const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    console.error(
      "[config] JWT_SECRET manquant ou trop court (32 caracteres minimum).\n" +
      "         Generer une cle : node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n" +
      "         puis la renseigner dans backend/.env"
    );
    process.exit(1);
  }

  return secret;
})();
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
export const corsAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;
