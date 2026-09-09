// backend/src/app.ts
//
// Assemblage de l'application Express : middlewares transverses puis montage
// des routers par domaine. Aucune route n'est declaree ici — chacune vit dans
// son fichier de domaine sous routes/.
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';

import { corsAllowedOrigins } from './config/env';
import activitesDatabaseRouter from './routes/activites-database.routes';
import activitesRouter from './routes/activites.routes';
import agentRouter from './routes/agent.routes';
import aideRouter from './routes/aide.routes';
import authRouter from './routes/auth.routes';
import beneficiairesRouter from './routes/beneficiaires.routes';
import cadreResultatsRouter from './routes/cadre-resultats.routes';
import calculateurRouter from './routes/calculateur.routes';
import cartesRouter from './routes/cartes.routes';
import configurationRouter from './routes/configuration.routes';
import dashboardRouter from './routes/dashboard.routes';
import databaseViewsRouter from './routes/database-views.routes';
import environnementRouter from './routes/environnement.routes';
import fournisseursRouter from './routes/fournisseurs.routes';
import grmRouter from './routes/grm.routes';
import indicateursRouter from './routes/indicateurs.routes';
import notificationsRouter from './routes/notifications.routes';
import organisationsRouter from './routes/organisations.routes';
import otRouter from './routes/ot.routes';
import plansAttenuationRouter from './routes/plans-attenuation.routes';
import powerbiRouter from './routes/powerbi.routes';
import ptbaRouter from './routes/ptba.routes';
import risquesRouter from './routes/risques.routes';
import sigRouter from './routes/sig.routes';
import utilisateursRouter from './routes/utilisateurs.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(compression());
app.use(express.json({ limit: '4mb' })); // les contours GeoJSON des provinces depassent la limite par defaut (100 ko)
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


// ==================== MONTAGE DES ROUTERS PAR DOMAINE ====================

// Chaque router declare des chemins absolus (/api/...) et est monte a la
// racine : les chemins exposes sont donc exactement ceux d'avant le
// decoupage. L'ordre ci-dessous reproduit l'ordre de declaration d'origine
// dans app.ts, ce qui preserve la resolution des routes.
app.use(dashboardRouter);
app.use(authRouter);
app.use(beneficiairesRouter);
app.use(indicateursRouter);
app.use(grmRouter);
app.use(risquesRouter);
app.use(cadreResultatsRouter);
app.use(powerbiRouter);
app.use(sigRouter);
app.use(fournisseursRouter);
app.use(organisationsRouter);
app.use(activitesRouter);
app.use(utilisateursRouter);
app.use(notificationsRouter);
app.use(calculateurRouter);
app.use(otRouter);
app.use(databaseViewsRouter);
app.use(plansAttenuationRouter);
app.use(cartesRouter);
app.use(activitesDatabaseRouter);
app.use(agentRouter);
app.use(environnementRouter);
app.use(aideRouter);
app.use(configurationRouter);
app.use(ptbaRouter);

// ==================== EXPORT ====================

// L'application est exportee sans etre demarree : le demarrage vit dans
// server.ts. Cette separation permet de monter l'app dans un test ou dans
// l'inventaire des routes sans ouvrir de port.
export default app;
export { app };
