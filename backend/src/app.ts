// backend/src/app.ts
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  getAgriculteursSummary,
  getBeneficiaireById,
  getBeneficiaireStats,
  getBeneficiaires,
  isDatabaseConnectivityError,
  getReadNotificationIds,
  markNotificationAsRead,
  markNotificationsAsRead,
} from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pnda_secret_key_2026';

interface AuthenticatedRequest extends Request {
  user?: unknown;
}

interface Risque {
  id: number;
  code: string;
  nom: string;
  description: string;
  categorie: 'gestion' | 'technique' | 'politique' | 'socio_economique' | 'environnemental' | 'sante_securite';
  probabilite: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  niveau: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  statut: 'identifie' | 'en_cours' | 'atténue' | 'cloture';
  plan_atténuation: string;
  responsable: string;
  date_identification: string;
  date_cloture?: string;
  province?: string;
  actions_prevues?: string[];
  indicateurs_surveillance?: string[];
  dernier_suivi?: string;
}

interface AlerteRisque {
  id: number;
  id_risque: number;
  message: string;
  date_alerte: string;
  est_lue: boolean;
  niveau: 'info' | 'warning' | 'danger';
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== DONNÉES MOCKÉES ====================

// Utilisateurs
const users = [
  {
    id: 1,
    nom: 'MUKENDI',
    prenom: 'Jean',
    email: 'admin@pnda.cd',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    province: null,
  },
  {
    id: 2,
    nom: 'KABEYA',
    prenom: 'Marie',
    email: 'uncp@pnda.cd',
    password: bcrypt.hashSync('uncp123', 10),
    role: 'uncp',
    province: null,
  },
  {
    id: 3,
    nom: 'TSHIBOLA',
    prenom: 'Pierre',
    email: 'upep@pnda.cd',
    password: bcrypt.hashSync('upep123', 10),
    role: 'upep',
    province: 'Kwilu',
  },
  {
    id: 4,
    nom: 'LUBALA',
    prenom: 'Sandrine',
    email: 'ot1@pnda.cd',
    password: bcrypt.hashSync('ot123', 10),
    role: 'ot',
    province: 'Kasaï',
  },
  {
    id: 5,
    nom: 'MWAMBA',
    prenom: 'Alice',
    email: 'partenaire@fao.org',
    password: bcrypt.hashSync('fao123', 10),
    role: 'partenaire',
    province: null,
  },
  {
    id: 6,
    nom: 'NKONGOLO',
    prenom: 'Patrick',
    email: 'upep.kongo@pnda.cd',
    password: bcrypt.hashSync('upep456', 10),
    role: 'upep',
    province: 'Kongo Central',
  },
  {
    id: 7,
    nom: 'BILONDA',
    prenom: 'Christine',
    email: 'upep.kasai@pnda.cd',
    password: bcrypt.hashSync('upep789', 10),
    role: 'upep',
    province: 'Kasaï',
  },
  {
    id: 8,
    nom: 'TSHOMBA',
    prenom: 'François',
    email: 'ot.kwilu@pnda.cd',
    password: bcrypt.hashSync('ot456', 10),
    role: 'ot',
    province: 'Kwilu',
  },
  {
    id: 9,
    nom: 'MBUYI',
    prenom: 'Espérance',
    email: 'ot.tanganyika@pnda.cd',
    password: bcrypt.hashSync('ot789', 10),
    role: 'ot',
    province: 'Tanganyika',
  },
  {
    id: 10,
    nom: 'KALOMBO',
    prenom: 'Robert',
    email: 'partenaire@banquemondiale.org',
    password: bcrypt.hashSync('bm123', 10),
    role: 'partenaire',
    province: null,
  },
  {
    id: 11,
    nom: 'DIALLO',
    prenom: 'Fatou',
    email: 'partenaire@unicef.org',
    password: bcrypt.hashSync('unicef123', 10),
    role: 'partenaire',
    province: null,
  },
  {
    id: 12,
    nom: 'NGANDU',
    prenom: 'Sylvie',
    email: 'upep.hlomami@pnda.cd',
    password: bcrypt.hashSync('upep321', 10),
    role: 'upep',
    province: 'Haut-Lomami',
  },
];

// Bénéficiaires mockés
const beneficiaires = [
  { id: 1, rna_id: 'RNA-00123', nom: 'MUKENDI', prenom: 'Joseph', sexe: 'M', date_naissance: '1985-03-15', telephone: '+243812345678', province: 'Kwilu', territoire: 'Idiofa', commune: '', village: 'Masi-Manimba', type_exploitant: 'agriculteur', est_jeune: false, created_at: '2024-01-15' },
  { id: 2, rna_id: 'RNA-00124', nom: 'KABEYA', prenom: 'Marie', sexe: 'F', date_naissance: '1990-07-22', telephone: '+243823456789', province: 'Kasaï', territoire: 'Tshikapa', commune: '', village: 'Kananga', type_exploitant: 'eleveur', est_jeune: true, created_at: '2024-02-20' },
  { id: 3, rna_id: 'RNA-00125', nom: 'TSHIBOLA', prenom: 'Albert', sexe: 'M', date_naissance: '1995-11-10', telephone: '+243834567890', province: 'Kinshasa', territoire: 'Mont Ngafula', commune: 'Selembao', village: '', type_exploitant: 'pisciculteur', est_jeune: true, created_at: '2024-03-10' },
  { id: 4, rna_id: 'RNA-00126', nom: 'LUBALA', prenom: 'Pauline', sexe: 'F', date_naissance: '1988-05-03', telephone: '+243845678901', province: 'Kongo Central', territoire: 'Matadi', commune: '', village: 'Boma', type_exploitant: 'mixte', est_jeune: false, created_at: '2024-01-05' },
  { id: 5, rna_id: 'RNA-00127', nom: 'KALONJI', prenom: 'David', sexe: 'M', date_naissance: '1992-09-18', telephone: '+243856789012', province: 'Haut-Lomami', territoire: 'Kamina', commune: '', village: 'Malemba', type_exploitant: 'agriculteur', est_jeune: true, created_at: '2024-02-28' },
];

// Plaintes mockées
const plaintes = [
  { id: 1, numero_plainte: 'PL-2026-001', type: 'Technique', description: 'Non-livraison des semences améliorées', province: 'Kwilu', territoire: 'Idiofa', village: 'Masi-Manimba', beneficiaire_nom: 'Joseph Mukendi', beneficiaire_rna: 'RNA-00123', date_reception: '2026-03-15T10:00:00Z', statut: 'traitee', delai_traite: 8, resolution: 'Semences livrées le 23/03/2026', est_confidentiel: false },
  { id: 2, numero_plainte: 'PL-2026-002', type: 'VBG', description: "Cas d'exploitation sexuelle par agent de terrain", province: 'Kasaï', territoire: 'Tshikapa', village: 'Kananga', beneficiaire_nom: 'Marie Kabeya', beneficiaire_rna: 'RNA-00124', date_reception: '2026-03-18T14:30:00Z', statut: 'en_cours', est_confidentiel: true },
  { id: 3, numero_plainte: 'PL-2026-003', type: 'Environnemental', description: 'Déforestation excessive lors des travaux', province: 'Kongo Central', territoire: 'Matadi', village: 'Boma', date_reception: '2026-03-20T09:15:00Z', statut: 'referee', prise_en_charge: 'Inspection Environnementale', est_confidentiel: false },
  { id: 4, numero_plainte: 'PL-2026-004', type: 'Administratif', description: 'Retard dans le versement des subventions', province: 'Kinshasa', territoire: 'Mont Ngafula', village: 'Selembao', beneficiaire_nom: 'Albert Tshibola', beneficiaire_rna: 'RNA-00125', date_reception: '2026-03-22T11:00:00Z', statut: 'en_cours', est_confidentiel: false },
  { id: 5, numero_plainte: 'PL-2026-005', type: 'EAS', description: 'Cas de harcèlement sexuel', province: 'Haut-Lomami', territoire: 'Kamina', village: 'Malemba', beneficiaire_nom: 'David Kalonji', beneficiaire_rna: 'RNA-00127', date_reception: '2026-03-25T08:45:00Z', statut: 'recue', est_confidentiel: true },
];

// ==================== MIDDLEWARE D'AUTHENTIFICATION ====================

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
};

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date(), message: 'API PNDA opérationnelle' });
});

app.get('/api/dashboard/beneficiaires-summary', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const summary = await getAgriculteursSummary();
    res.json(summary);
  } catch (error) {
    console.error('GET /api/dashboard/beneficiaires-summary failed', error);

    const message = error instanceof Error ? error.message : 'Erreur de connexion à la base de données';

    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({
        message: 'Connexion à la base de données indisponible pour les bénéficiaires RNA',
        details: message,
      });
    }

    return res.status(500).json({
      message: 'Erreur lors du chargement des bénéficiaires RNA',
    });
  }
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        province: user.province,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/auth/verify', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ valid: true, user: req.user });
});

app.get('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const decoded = req.user as { id: number };
  const user = users.find(u => u.id === decoded.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const { password: _pw, ...safeUser } = user;
  // Merge extra fields from utilisateursData if present
  const extra = (utilisateursData as { id: number; telephone?: string }[]).find(u => u.id === decoded.id);
  res.json({ ...safeUser, telephone: extra?.telephone ?? null });
});

app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const decoded = req.user as { id: number };
  const index = users.findIndex(u => u.id === decoded.id);
  if (index === -1) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const { nom, prenom, telephone } = req.body;
  if (nom) users[index].nom = String(nom).toUpperCase();
  if (prenom) users[index].prenom = prenom;
  // Also update utilisateursData
  const extIdx = (utilisateursData as { id: number; telephone?: string; nom: string; prenom: string }[]).findIndex(u => u.id === decoded.id);
  if (extIdx !== -1) {
    if (nom) utilisateursData[extIdx].nom = String(nom).toUpperCase();
    if (prenom) utilisateursData[extIdx].prenom = prenom;
    if (telephone !== undefined) (utilisateursData[extIdx] as { telephone?: string }).telephone = telephone;
  }
  const { password: _pw, ...safeUser } = users[index];
  const extra = (utilisateursData as { id: number; telephone?: string }[]).find(u => u.id === decoded.id);
  res.json({ ...safeUser, telephone: extra?.telephone ?? null });
});

app.put('/api/auth/password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const decoded = req.user as { id: number };
  const index = users.findIndex(u => u.id === decoded.id);
  if (index === -1) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau requis' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }
  const valid = bcrypt.compareSync(current_password, users[index].password);
  if (!valid) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
  users[index].password = bcrypt.hashSync(new_password, 10);
  res.json({ message: 'Mot de passe modifié avec succès' });
});

// ==================== BÉNÉFICIAIRES ROUTES ====================

app.get('/api/beneficiaires', authenticateToken, async (req, res) => {
  try {
    const payload = await getBeneficiaires({
      search: req.query.search ? String(req.query.search) : undefined,
      province: req.query.province ? String(req.query.province) : undefined,
      sexe: req.query.sexe ? String(req.query.sexe) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    res.json(payload);
  } catch (error) {
    console.error('GET /api/beneficiaires failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des bénéficiaires RNA' });
  }
});

app.get('/api/beneficiaires/stats', authenticateToken, async (_req, res) => {
  try {
    const stats = await getBeneficiaireStats();
    res.json(stats);
  } catch (error) {
    console.error('GET /api/beneficiaires/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques RNA' });
  }
});

app.get('/api/beneficiaires/:id', authenticateToken, async (req, res) => {
  try {
    const beneficiaire = await getBeneficiaireById(Number(req.params.id));
    if (!beneficiaire) {
      return res.status(404).json({ message: 'Bénéficiaire non trouvé' });
    }

    return res.json(beneficiaire);
  } catch (error) {
    console.error('GET /api/beneficiaires/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du bénéficiaire RNA' });
  }
});

app.post('/api/beneficiaires', authenticateToken, (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});

app.put('/api/beneficiaires/:id', authenticateToken, (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});

app.delete('/api/beneficiaires/:id', authenticateToken, (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});

// ==================== INDICATEURS ROUTES ====================

const iodpIndicateurs = [
  {
    id: 1,
    code: 'IODP1.1',
    nom: 'Hausse des ventes de produits agricoles sur les marchés formels',
    description: 'Augmentation en pourcentage des ventes des petits exploitants sur les marchés formels',
    formule: "((Surplus à l'année t / Surplus à l'année 0) - 1) x 100",
    unite: '%',
    frequence: 'annuelle',
    cible: 30,
    valeur_actuelle: 15,
    valeur_reference: 12,
    progression: 50,
    id_composante: 2,
    est_iodp: true,
  },
  {
    id: 2,
    code: 'IODP2.1',
    nom: 'Nombre de petits exploitants ayant adopté une technologie agricole améliorée',
    description: 'Nombre cumulé de petits exploitants bénéficiaires ayant adopté une technologie améliorée',
    formule: "Somme cumulée des petits exploitants bénéficiaires jusqu'à l'année t",
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 50000,
    valeur_actuelle: 32450,
    valeur_reference: 25000,
    progression: 64.9,
    id_composante: 1,
    est_iodp: true,
  },
  {
    id: 3,
    code: 'IODP2.2',
    nom: 'Nombre de femmes exploitantes ayant adopté une technologie améliorée',
    description: 'Nombre cumulé de femmes bénéficiaires ayant adopté une technologie améliorée',
    formule: "Somme cumulée des femmes bénéficiaires jusqu'à l'année t",
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 22500,
    valeur_actuelle: 14600,
    valeur_reference: 11200,
    progression: 64.9,
    id_composante: 1,
    est_iodp: true,
  },
  {
    id: 4,
    code: 'IODP2.3',
    nom: 'Hausse du rendement de maïs à travers les pratiques AIC',
    description: 'Augmentation en pourcentage du rendement de maïs grâce aux technologies intelligentes face au climat',
    formule: "((Rendement maïs année t - Rendement maïs année 0) / Rendement maïs année 0) x 100",
    unite: '%',
    frequence: 'annuelle',
    cible: 30,
    valeur_actuelle: 23,
    valeur_reference: 18,
    progression: 76.7,
    id_composante: 1,
    est_iodp: true,
  },
  {
    id: 5,
    code: 'IODP2.4',
    nom: 'Hausse du rendement de manioc à travers les pratiques AIC',
    description: 'Augmentation en pourcentage du rendement de manioc grâce aux technologies intelligentes face au climat',
    formule: "((Rendement manioc année t - Rendement manioc année 0) / Rendement manioc année 0) x 100",
    unite: '%',
    frequence: 'annuelle',
    cible: 25,
    valeur_actuelle: 18,
    valeur_reference: 15,
    progression: 72,
    id_composante: 1,
    est_iodp: true,
  },
  {
    id: 6,
    code: 'IODP2.5',
    nom: "Hausse du rendement d'arachide à travers les pratiques AIC",
    description: "Augmentation en pourcentage du rendement d'arachide grâce aux technologies intelligentes face au climat",
    formule: "((Rendement arachide année t - Rendement arachide année 0) / Rendement arachide année 0) x 100",
    unite: '%',
    frequence: 'annuelle',
    cible: 25,
    valeur_actuelle: 22,
    valeur_reference: 18,
    progression: 88,
    id_composante: 1,
    est_iodp: true,
  },
  {
    id: 7,
    code: 'IODP2.6',
    nom: 'Réduction du taux de mortalité animale',
    description: 'Réduction en pourcentage du taux de mortalité animale chez les petits exploitants',
    formule: "(1 - (Taux mortalité année 0 / Taux mortalité année t)) x 100",
    unite: '%',
    frequence: 'annuelle',
    cible: 40,
    valeur_actuelle: 28,
    valeur_reference: 25,
    progression: 70,
    id_composante: 1,
    est_iodp: true,
  },
  {
    id: 8,
    code: 'IODP3.1',
    nom: 'Plans de contingence pour risques agricoles',
    description: 'Nombre de plans de contingence approuvés pour les risques liés au secteur agricole',
    formule: 'Nombre cumulé de plans de contingence approuvés',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 8,
    valeur_actuelle: 5,
    valeur_reference: 3,
    progression: 62.5,
    id_composante: 3,
    est_iodp: true,
  },
  {
    id: 9,
    code: 'IODP3.2',
    nom: 'Provinces ayant soumis des plans de maintenance routière',
    description: 'Nombre de provinces ayant soumis des plans annuels de maintenance des routes',
    formule: 'Somme des provinces ayant soumis les plans',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 12,
    valeur_actuelle: 8,
    valeur_reference: 5,
    progression: 66.7,
    id_composante: 2,
    est_iodp: true,
  },
  {
    id: 10,
    code: 'IODP3.3',
    nom: 'Bénéficiaires directs du projet',
    description: 'Nombre total de bénéficiaires directs du programme (exploitants, entrepreneurs, etc.)',
    formule: 'Somme cumulée de tous les bénéficiaires',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 150000,
    valeur_actuelle: 124530,
    valeur_reference: 98000,
    progression: 83,
    id_composante: 3,
    est_iodp: true,
  },
  {
    id: 11,
    code: 'IODP3.4',
    nom: 'Femmes bénéficiaires directes du projet',
    description: 'Nombre de femmes bénéficiaires directes du programme',
    formule: 'Somme cumulée des femmes bénéficiaires',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 67500,
    valeur_actuelle: 56038,
    valeur_reference: 44100,
    progression: 83,
    id_composante: 3,
    est_iodp: true,
  },
];

const irIndicateurs = [
  { id: 101, code: 'IR1.1.1', nom: 'Petits exploitants atteints par des actifs agricoles', description: 'Nombre de petits exploitants ayant reçu des actifs ou services agricoles', formule: 'Somme cumulée des bénéficiaires', unite: 'nombre', frequence: 'semestrielle', cible: 150000, valeur_actuelle: 124530, valeur_reference: 98000, progression: 83, id_composante: 1, est_iodp: false },
  { id: 102, code: 'IR1.1.2', nom: 'Femmes exploitantes atteintes', description: 'Nombre de femmes petits exploitants ayant bénéficié d\'actifs agricoles', formule: 'Somme cumulée des femmes bénéficiaires', unite: 'nombre', frequence: 'semestrielle', cible: 67500, valeur_actuelle: 56038, valeur_reference: 44100, progression: 83, id_composante: 1, est_iodp: false },
  { id: 103, code: 'IR1.1.3', nom: 'Fournisseurs de technologies AIC/AIN', description: 'Nombre de fournisseurs offrant des technologies intelligentes face au climat', formule: 'Nombre de prestataires enregistrés', unite: 'nombre', frequence: 'semestrielle', cible: 50, valeur_actuelle: 38, valeur_reference: 25, progression: 76, id_composante: 1, est_iodp: false },
  { id: 104, code: 'IR1.1.4', nom: 'Exploitants enregistrés dans le RNA', description: 'Nombre de petits exploitants inscrits au Registre National', formule: 'Somme cumulée des inscriptions', unite: 'nombre', frequence: 'semestrielle', cible: 200000, valeur_actuelle: 156780, valeur_reference: 120000, progression: 78.4, id_composante: 1, est_iodp: false },
  { id: 105, code: 'IR1.1.6', nom: 'Superficie sous pratiques AIC', description: 'Superficie totale cultivée avec des pratiques intelligentes face au climat', formule: 'Somme des superficies emblavées', unite: 'ha', frequence: 'semestrielle', cible: 50000, valeur_actuelle: 32500, valeur_reference: 20000, progression: 65, id_composante: 1, est_iodp: false },
  { id: 201, code: 'IR2.1.1', nom: 'Kilomètres de routes réhabilitées', description: 'Total des routes réhabilitées par le programme', formule: 'Somme des km de routes', unite: 'km', frequence: 'annuelle', cible: 500, valeur_actuelle: 300, valeur_reference: 150, progression: 60, id_composante: 2, est_iodp: false },
  { id: 202, code: 'IR2.1.4', nom: 'CLER fonctionnels', description: "Comités Locaux d'Entretien des Routes opérationnels", formule: 'Nombre de CLER fonctionnels', unite: 'nombre', frequence: 'annuelle', cible: 20, valeur_actuelle: 15, valeur_reference: 8, progression: 75, id_composante: 2, est_iodp: false },
  { id: 203, code: 'IR2.2.1', nom: 'Bénéficiaires de services financiers', description: 'Nombre d\'exploitants ayant accès aux services financiers', formule: 'Somme cumulée des bénéficiaires financiers', unite: 'nombre', frequence: 'annuelle', cible: 30000, valeur_actuelle: 18750, valeur_reference: 12000, progression: 62.5, id_composante: 2, est_iodp: false },
  { id: 204, code: 'IR2.2.2', nom: 'Femmes bénéficiaires de services financiers', description: 'Nombre de femmes ayant accès aux services financiers', formule: 'Pourcentage de femmes bénéficiaires', unite: '%', frequence: 'annuelle', cible: 45, valeur_actuelle: 38, valeur_reference: 30, progression: 84.4, id_composante: 2, est_iodp: false },
  { id: 205, code: 'IR2.2.7', nom: 'Personnes avec méso-assurance', description: 'Nombre d\'exploitants couverts par une méso-assurance', formule: 'Somme cumulée des assurés', unite: 'nombre', frequence: 'annuelle', cible: 20000, valeur_actuelle: 12450, valeur_reference: 8000, progression: 62.3, id_composante: 2, est_iodp: false },
  { id: 301, code: 'IR3.1.1', nom: 'Campagnes de vaccination animale', description: 'Nombre de campagnes de vaccination réalisées', formule: 'Nombre de campagnes', unite: 'nombre', frequence: 'annuelle', cible: 10, valeur_actuelle: 7, valeur_reference: 4, progression: 70, id_composante: 3, est_iodp: false },
  { id: 302, code: 'IR3.1.2', nom: 'Programmes de R&D agricole', description: 'Programmes de recherche sur les variétés AIC/AIN', formule: 'Nombre de programmes', unite: 'nombre', frequence: 'annuelle', cible: 8, valeur_actuelle: 5, valeur_reference: 3, progression: 62.5, id_composante: 3, est_iodp: false },
  { id: 303, code: 'IR3.1.4', nom: 'Traitement des réclamations GRM', description: 'Pourcentage des plaintes traitées dans les délais', formule: '(Plaintes traitées / Plaintes reçues) x 100', unite: '%', frequence: 'annuelle', cible: 90, valeur_actuelle: 78, valeur_reference: 65, progression: 86.7, id_composante: 3, est_iodp: false },
  { id: 304, code: 'IR3.1.7', nom: 'Fermiers satisfaits des technologies', description: 'Pourcentage de fermiers satisfaits des technologies adoptées', formule: '(Fermiers satisfaits / Total) x 100', unite: '%', frequence: 'annuelle', cible: 85, valeur_actuelle: 72, valeur_reference: 60, progression: 84.7, id_composante: 3, est_iodp: false },
  { id: 401, code: 'IR4.1', nom: 'Plans de contingence préparés', description: 'Plans de réponse aux urgences agricoles approuvés', formule: 'Nombre de plans approuvés', unite: 'nombre', frequence: 'annuelle', cible: 8, valeur_actuelle: 5, valeur_reference: 2, progression: 62.5, id_composante: 4, est_iodp: false },
];

app.get('/api/indicateurs/iodp', authenticateToken, (req, res) => {
  console.log('GET /api/indicateurs/iodp - Récupération des indicateurs IODP');
  res.json(iodpIndicateurs);
});

app.get('/api/indicateurs/ir', authenticateToken, (req, res) => {
  console.log('GET /api/indicateurs/ir - Récupération des indicateurs IR');
  res.json(irIndicateurs);
});

app.get('/api/indicateurs', authenticateToken, (req, res) => {
  console.log('GET /api/indicateurs - Récupération de tous les indicateurs');
  const tousIndicateurs = [...iodpIndicateurs, ...irIndicateurs];
  res.json(tousIndicateurs);
});

app.get('/api/indicateurs/composante/:composanteId', authenticateToken, (req, res) => {
  const composanteId = Number.parseInt(req.params.composanteId, 10);
  console.log(`GET /api/indicateurs/composante/${composanteId}`);
  const indicateurs = [...iodpIndicateurs, ...irIndicateurs].filter((indicateur) => indicateur.id_composante === composanteId);
  res.json(indicateurs);
});

app.post('/api/indicateurs/:indicateurId/calculer', authenticateToken, (req, res) => {
  const indicateurId = Number.parseInt(req.params.indicateurId, 10);
  const { valeur } = req.body;
  console.log(`POST /api/indicateurs/${indicateurId}/calculer`, req.body);

  let resultat = 0;
  let progression = 0;

  if (valeur !== undefined && valeur !== null && valeur !== '') {
    resultat = Number.parseFloat(String(valeur));
    const indicateur = [...iodpIndicateurs, ...irIndicateurs].find((item) => item.id === indicateurId);
    if (indicateur) {
      progression = (resultat / indicateur.cible) * 100;
    }
  } else {
    resultat = Math.random() * 100;
    progression = Math.random() * 100;
  }

  res.json({ valeur: resultat, progression });
});

app.put('/api/indicateurs/:indicateurId/valeur', authenticateToken, (req, res) => {
  const { indicateurId } = req.params;
  const { valeur, periode } = req.body;
  console.log(`PUT /api/indicateurs/${indicateurId}/valeur`, { valeur, periode });

  res.json({
    message: `Indicateur ${indicateurId} mis à jour avec la valeur ${valeur} pour la période ${periode}`,
    success: true,
  });
});

app.get('/api/indicateurs/:indicateurId/historique', authenticateToken, (req, res) => {
  const { indicateurId } = req.params;
  console.log(`GET /api/indicateurs/${indicateurId}/historique`);

  const historique = [
    { periode: 'T1 2025', valeur: 12 },
    { periode: 'T2 2025', valeur: 18 },
    { periode: 'T3 2025', valeur: 22 },
    { periode: 'T4 2025', valeur: 25 },
    { periode: 'T1 2026', valeur: 28 },
    { periode: 'T2 2026', valeur: 32 },
  ];

  res.json(historique);
});

app.get('/api/indicateurs/dashboard', authenticateToken, (req, res) => {
  console.log('GET /api/indicateurs/dashboard');
  res.json({
    iodp1: { current: 15, target: 30, trend: 2.1 },
    iodp2: { current: 23, target: 40, trend: 5.3 },
    iodp3: { current: 63, target: 100, trend: 8.2 },
    evolution: [
      { month: 'Jan', iodp1: 12, iodp2: 18, iodp3: 55 },
      { month: 'Fév', iodp1: 13, iodp2: 19, iodp3: 58 },
      { month: 'Mar', iodp1: 15, iodp2: 23, iodp3: 63 },
      { month: 'Avr', iodp1: 16, iodp2: 25, iodp3: 67 },
      { month: 'Mai', iodp1: 17, iodp2: 27, iodp3: 70 },
      { month: 'Juin', iodp1: 18, iodp2: 29, iodp3: 73 },
    ],
  });
});

// ==================== GRM ROUTES ====================

app.get('/api/grm/plaintes', authenticateToken, (req, res) => {
  const { search, type, province, statut, page = 0, limit = 10 } = req.query;
  
  let filtered = [...plaintes];
  
  if (search) {
    const searchStr = String(search).toLowerCase();
    filtered = filtered.filter(p => 
      p.numero_plainte.toLowerCase().includes(searchStr) || 
      p.description.toLowerCase().includes(searchStr)
    );
  }
  
  if (type) {
    filtered = filtered.filter(p => p.type === type);
  }
  
  if (province) {
    filtered = filtered.filter(p => p.province === province);
  }
  
  if (statut) {
    filtered = filtered.filter(p => p.statut === statut);
  }
  
  const start = Number(page) * Number(limit);
  const end = start + Number(limit);
  const paginated = filtered.slice(start, end);
  
  res.json({
    data: paginated,
    total: filtered.length,
    page: Number(page),
    totalPages: Math.ceil(filtered.length / Number(limit)),
  });
});

app.get('/api/grm/stats', authenticateToken, (req, res) => {
  res.json({
    total: plaintes.length,
    en_cours: plaintes.filter(p => p.statut === 'en_cours').length,
    traitees: plaintes.filter(p => p.statut === 'traitee').length,
    sensibles: plaintes.filter(p => p.est_confidentiel).length,
  });
});

app.get('/api/grm/plaintes/:id', authenticateToken, (req, res) => {
  const plainte = plaintes.find(p => p.id === Number(req.params.id));
  if (!plainte) {
    return res.status(404).json({ message: 'Plainte non trouvée' });
  }
  res.json(plainte);
});

app.get('/api/grm/services', authenticateToken, (req, res) => {
  res.json([
    { id: 1, nom: 'Centre de santé de Tshikapa', type: 'médical', province: 'Kasaï' },
    { id: 2, nom: 'Inspection Environnementale', type: 'environnement', province: 'Kongo Central' },
    { id: 3, nom: 'Commission VBG provinciale', type: 'social', province: 'Kwilu' },
  ]);
});


// Dans backend/src/app.ts, ajouter après les routes GRM

// ==================== RISQUES ROUTES ====================

const risquesData: Risque[] = [
  {
    id: 1,
    code: 'RISK-001',
    nom: 'Retard dans la distribution des intrants',
    description: 'Les intrants agricoles ne sont pas distribués dans les délais impartis',
    categorie: 'gestion',
    probabilite: 4,
    impact: 3,
    niveau: 'Élevé',
    statut: 'en_cours',
    plan_atténuation: 'Renforcer la logistique et suivre quotidiennement les livraisons',
    responsable: 'UNCP',
    date_identification: '2026-01-15',
    province: 'Kwilu',
  },
  // ... autres risques
];

app.get('/api/risques', authenticateToken, (req, res) => {
  res.json(risquesData);
});

app.get('/api/risques/stats', authenticateToken, (req, res) => {
  res.json({
    total: risquesData.length,
    critiques: risquesData.filter(r => r.niveau === 'Critique').length,
    eleves: risquesData.filter(r => r.niveau === 'Élevé').length,
    attenues: risquesData.filter(r => r.statut === 'atténue' || r.statut === 'cloture').length,
  });
});

const alertesData: AlerteRisque[] = [
  {
    id: 1,
    id_risque: 1,
    message: 'Risque RISK-001 : niveau Élevé — aucune action de mitigation depuis 30 jours',
    date_alerte: new Date().toISOString().split('T')[0],
    est_lue: false,
    niveau: 'warning',
  },
  {
    id: 2,
    id_risque: 1,
    message: 'Nouveau risque identifié dans la province du Kwilu nécessitant une réponse rapide',
    date_alerte: new Date().toISOString().split('T')[0],
    est_lue: false,
    niveau: 'danger',
  },
];

app.get('/api/risques/alertes', authenticateToken, (req, res) => {
  res.json(alertesData);
});

app.put('/api/risques/alertes/:id/lue', authenticateToken, (req, res) => {
  const alerte = alertesData.find(a => a.id === parseInt(req.params.id));
  if (!alerte) return res.status(404).json({ message: 'Alerte non trouvée' });
  alerte.est_lue = true;
  res.json(alerte);
});

app.get('/api/risques/:id', authenticateToken, (req, res) => {
  const risque = risquesData.find(r => r.id === parseInt(req.params.id));
  if (!risque) return res.status(404).json({ message: 'Risque non trouvé' });
  res.json(risque);
});

app.post('/api/risques', authenticateToken, (req, res) => {
  const newRisque = {
    id: risquesData.length + 1,
    code: `RISK-${String(risquesData.length + 1).padStart(3, '0')}`,
    ...req.body,
    date_identification: new Date().toISOString().split('T')[0],
  };
  risquesData.push(newRisque);
  res.status(201).json(newRisque);
});

app.put('/api/risques/:id', authenticateToken, (req, res) => {
  const index = risquesData.findIndex(r => r.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Risque non trouvé' });
  risquesData[index] = { ...risquesData[index], ...req.body };
  res.json(risquesData[index]);
});

app.delete('/api/risques/:id', authenticateToken, (req, res) => {
  const index = risquesData.findIndex(r => r.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Risque non trouvé' });
  risquesData.splice(index, 1);
  res.json({ message: 'Risque supprimé avec succès' });
});

// ==================== CADRE DES RÉSULTATS ====================

interface AnneeCadre {
  prevu: number | null;
  realise: number | null;
}

interface IndicateurCadre {
  id: number;
  code: string;
  nom: string;
  composante: string;
  sous_composante: string;
  est_odp: boolean;
  reference: string;
  unite: string;
  frequence: string;
  source_donnees: string;
  responsable: string;
  annees: {
    '2023': AnneeCadre;
    '2024': AnneeCadre;
    '2025': AnneeCadre;
    '2026': AnneeCadre;
  };
  final_prevu: number | null;
}

const cadreResultatsData: IndicateurCadre[] = [
  // ─── Indicateurs ODP ───
  {
    id: 1, code: 'ODP-1', est_odp: true,
    nom: 'Augmentation des ventes de produits agricoles et alimentaires par les petits exploitants',
    composante: 'ODP', sous_composante: 'Améliorer l\'accès au marché',
    reference: '0', unite: '%', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 5, realise: null }, '2025': { prevu: 10, realise: 70 }, '2026': { prevu: 20, realise: null } },
    final_prevu: 30,
  },
  {
    id: 2, code: 'ODP-2', est_odp: true,
    nom: 'Agriculteurs adoptant une technologie agricole améliorée (CRI)',
    composante: 'ODP', sous_composante: 'Augmenter la productivité agricole',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 18391 }, '2025': { prevu: 130000, realise: 79605 }, '2026': { prevu: 240000, realise: null } },
    final_prevu: 300000,
  },
  {
    id: 3, code: 'ODP-2F', est_odp: true,
    nom: 'Agriculteurs adoptant une technologie améliorée — Femmes (CRI)',
    composante: 'ODP', sous_composante: 'Augmenter la productivité agricole',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 9848 }, '2025': { prevu: 65000, realise: 43030 }, '2026': { prevu: 120000, realise: null } },
    final_prevu: 150000,
  },
  {
    id: 4, code: 'ODP-3', est_odp: true,
    nom: 'Rendement Maïs ≥ 0,5 T/ha',
    composante: 'ODP', sous_composante: 'Rendement cultures vivrières (AIC/AIN)',
    reference: '0,5 T/ha', unite: '%', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 30, realise: 30 }, '2025': { prevu: 60, realise: 50 }, '2026': { prevu: 80, realise: null } },
    final_prevu: 100,
  },
  {
    id: 5, code: 'ODP-4', est_odp: true,
    nom: 'Rendement Manioc ≥ 7 T/ha',
    composante: 'ODP', sous_composante: 'Rendement cultures vivrières (AIC/AIN)',
    reference: '7 T/ha', unite: '%', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 25, realise: null }, '2026': { prevu: 40, realise: null } },
    final_prevu: 50,
  },
  {
    id: 6, code: 'ODP-5', est_odp: true,
    nom: 'Réduction du taux de mortalité animale chez les petits exploitants',
    composante: 'ODP', sous_composante: 'Rendement cultures vivrières (AIC/AIN)',
    reference: '0', unite: '%', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 30, realise: null }, '2026': { prevu: 40, realise: null } },
    final_prevu: 50,
  },
  {
    id: 7, code: 'ODP-6', est_odp: true,
    nom: 'Provinces ciblées soumettant des plans de maintenance annuelle des routes',
    composante: 'ODP', sous_composante: 'Renforcer la capacité du secteur public',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA', responsable: 'OVDA',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 4, realise: null } },
    final_prevu: 4,
  },
  {
    id: 8, code: 'ODP-7', est_odp: true,
    nom: 'Bénéficiaires directs du projet',
    composante: 'ODP', sous_composante: '',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 23368 }, '2025': { prevu: 180000, realise: 142622 }, '2026': { prevu: 420000, realise: null } },
    final_prevu: 600000,
  },
  {
    id: 9, code: 'ODP-7F', est_odp: true,
    nom: 'Bénéficiaires directs du projet — Femmes',
    composante: 'ODP', sous_composante: '',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 11917 }, '2025': { prevu: 90000, realise: 77059 }, '2026': { prevu: 210000, realise: null } },
    final_prevu: 300000,
  },
  // ─── Composante 1 ───
  {
    id: 10, code: 'IR-1.1.1', est_odp: false,
    nom: 'Agriculteurs atteints avec des actifs ou des services agricoles (CRI)',
    composante: 'Composante 1', sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    reference: '0', unite: 'Nombre', frequence: 'Semestrielle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 23368 }, '2025': { prevu: 130000, realise: 142622 }, '2026': { prevu: 300000, realise: null } },
    final_prevu: 300000,
  },
  {
    id: 11, code: 'IR-1.1.1F', est_odp: false,
    nom: 'Agriculteurs atteints avec des actifs ou des services agricoles — Femmes (CRI)',
    composante: 'Composante 1', sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    reference: '0', unite: 'Nombre', frequence: 'Semestrielle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 11917 }, '2025': { prevu: 65000, realise: 77059 }, '2026': { prevu: 150000, realise: null } },
    final_prevu: 150000,
  },
  {
    id: 12, code: 'IR-1.1.2', est_odp: false,
    nom: 'Fournisseurs d\'intrants et de services agricoles proposant des technologies AIC/AIN',
    composante: 'Composante 1', sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    reference: '0', unite: 'Nombre', frequence: 'Semestrielle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: 14 }, '2025': { prevu: 10, realise: 78 }, '2026': { prevu: 20, realise: null } },
    final_prevu: 25,
  },
  {
    id: 13, code: 'IR-1.1.3', est_odp: false,
    nom: 'Petits exploitants agricoles inscrits au registre national d\'agriculteurs (RNA)',
    composante: 'Composante 1', sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    reference: '0', unite: 'Nombre', frequence: 'Semestrielle',
    source_donnees: 'Registre National des Agriculteurs (RNA)', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 30002 }, '2025': { prevu: 130000, realise: 294355 }, '2026': { prevu: 300000, realise: null } },
    final_prevu: 300000,
  },
  {
    id: 14, code: 'IR-1.1.3F', est_odp: false,
    nom: 'Petits exploitants inscrits au RNA — Femmes',
    composante: 'Composante 1', sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    reference: '0', unite: 'Nombre', frequence: 'Semestrielle',
    source_donnees: 'Registre National des Agriculteurs (RNA)', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 15301 }, '2025': { prevu: 65000, realise: 161895 }, '2026': { prevu: 150000, realise: null } },
    final_prevu: 150000,
  },
  {
    id: 15, code: 'IR-1.1.4', est_odp: false,
    nom: 'Superficie sous pratiques agricoles intelligentes face au climat dans les provinces ciblées',
    composante: 'Composante 1', sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    reference: '0', unite: 'Ha', frequence: 'Semestrielle',
    source_donnees: 'Registre Foncier + RNA', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 1650 }, '2025': { prevu: 65000, realise: 42787 }, '2026': { prevu: 150000, realise: null } },
    final_prevu: 150000,
  },
  // ─── Composante 2 ───
  {
    id: 16, code: 'IR-2.1.1', est_odp: false,
    nom: 'Routes réhabilitées rurales et non rurales (CRI)',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.1 : Infrastructures rurales',
    reference: '0', unite: 'Km', frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA', responsable: 'OVDA/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 400,
  },
  {
    id: 17, code: 'IR-2.1.2', est_odp: false,
    nom: 'Nombre de CLER fonctionnels',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.1 : Infrastructures rurales',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA', responsable: 'OVDA/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 16,
  },
  {
    id: 18, code: 'IR-2.1.3', est_odp: false,
    nom: 'Provinces sélectionnées soumettant des plans annuels d\'entretien routier au FONER',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.1 : Infrastructures rurales',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA', responsable: 'OVDA/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 4,
  },
  {
    id: 19, code: 'IR-2.1.4', est_odp: false,
    nom: 'Superficie équipée avec l\'infrastructure d\'irrigation',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.1 : Infrastructures rurales',
    reference: '0', unite: 'Ha', frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA', responsable: 'OVDA/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 300,
  },
  {
    id: 20, code: 'IR-2.2.1', est_odp: false,
    nom: 'PME ayant un prêt ou une marge de crédit (CRI)',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.2 : Inclusion dans les chaînes de valeur',
    reference: '0', unite: 'Nombre', frequence: 'Semestrielle',
    source_donnees: 'Rapport BCC', responsable: 'Gestionnaire BCC/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: 10 }, '2025': { prevu: 20, realise: null }, '2026': { prevu: 30, realise: null } },
    final_prevu: 50,
  },
  {
    id: 21, code: 'IR-2.2.1F', est_odp: false,
    nom: 'PME ayant un prêt ou une marge de crédit — dirigées par des femmes (%)',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.2 : Inclusion dans les chaînes de valeur',
    reference: '0', unite: '%', frequence: 'Semestrielle',
    source_donnees: 'Rapport BCC', responsable: 'Gestionnaire BCC/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 50, realise: null }, '2025': { prevu: 50, realise: null }, '2026': { prevu: 50, realise: null } },
    final_prevu: 50,
  },
  {
    id: 22, code: 'IR-2.2.2', est_odp: false,
    nom: 'Personnes avec les polices de méso-assurance (CRI)',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.2 : Inclusion dans les chaînes de valeur',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 0 }, '2025': { prevu: 130000, realise: 110000 }, '2026': { prevu: 300000, realise: null } },
    final_prevu: 300000,
  },
  {
    id: 23, code: 'IR-2.2.2F', est_odp: false,
    nom: 'Personnes avec les polices de méso-assurance — Femmes (CRI)',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.2 : Inclusion dans les chaînes de valeur',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 25124, realise: 10000 }, '2025': { prevu: 65000, realise: 59400 }, '2026': { prevu: 150000, realise: null } },
    final_prevu: 150000,
  },
  {
    id: 24, code: 'IR-2.2.3', est_odp: false,
    nom: 'Organisations ayant mis en place un plan d\'affaires',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.2 : Inclusion dans les chaînes de valeur',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: 50 }, '2025': { prevu: 100, realise: null }, '2026': { prevu: 200, realise: null } },
    final_prevu: 300,
  },
  {
    id: 25, code: 'IR-2.2.4', est_odp: false,
    nom: 'Volume de prêts via lignes de crédit aux provinces ciblées (USD)',
    composante: 'Composante 2', sous_composante: 'Sous-composante 2.2 : Inclusion dans les chaînes de valeur',
    reference: '0', unite: 'USD', frequence: 'Annuelle',
    source_donnees: 'Rapport BCC', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: 0 }, '2025': { prevu: 3000000, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 4000000,
  },
  // ─── Composante 3 ───
  {
    id: 26, code: 'IR-3.1.1', est_odp: false,
    nom: 'Campagnes de vaccination animale dans les provinces ciblées',
    composante: 'Composante 3', sous_composante: 'Sous-composante 3.1 : Renforcement des capacités',
    reference: '0', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapports Opérateur Technique', responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 1, realise: null } },
    final_prevu: 2,
  },
  {
    id: 27, code: 'IR-3.1.2', est_odp: false,
    nom: 'Traitement des réclamations GRM dans les délais requis (%)',
    composante: 'Composante 3', sous_composante: 'Sous-composante 3.1 : Renforcement des capacités',
    reference: '0', unite: '%', frequence: 'Semestrielle',
    source_donnees: 'Rapports OT/UNCP/UPEP', responsable: 'OT/UNCP/UPEP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 100, realise: 100 }, '2025': { prevu: 100, realise: 100 }, '2026': { prevu: 100, realise: null } },
    final_prevu: 100,
  },
  {
    id: 28, code: 'IR-3.1.3', est_odp: false,
    nom: 'Cas d\'exploitation et d\'abus sexuels / harcèlement sexuel traités au service (%)',
    composante: 'Composante 3', sous_composante: 'Sous-composante 3.1 : Renforcement des capacités',
    reference: '100', unite: '%', frequence: 'Annuelle',
    source_donnees: 'Rapports OT/UNCP/UPEP', responsable: 'OT/UNCP/UPEP',
    annees: { '2023': { prevu: 100, realise: null }, '2024': { prevu: 100, realise: 100 }, '2025': { prevu: 100, realise: 100 }, '2026': { prevu: 100, realise: null } },
    final_prevu: 100,
  },
  // ─── Composante 4 ───
  {
    id: 29, code: 'IR-4.1', est_odp: false,
    nom: 'Plans de contingence des risques agricoles préparés et approuvés',
    composante: 'Composante 4', sous_composante: 'Intervention d\'urgence agricole',
    reference: 'Nombre', unite: 'Nombre', frequence: 'Annuelle',
    source_donnees: 'Rapport UNCP', responsable: 'UNCP/UPEP',
    annees: { '2023': { prevu: 1, realise: 1 }, '2024': { prevu: 2, realise: 1 }, '2025': { prevu: 4, realise: 2 }, '2026': { prevu: 3, realise: null } },
    final_prevu: 10,
  },
];

app.get('/api/cadre-resultats', authenticateToken, (req, res) => {
  const { composante, odp } = req.query;
  let data = [...cadreResultatsData];
  if (odp === 'true') data = data.filter(i => i.est_odp);
  if (composante) data = data.filter(i => i.composante === composante);
  res.json(data);
});

app.get('/api/cadre-resultats/stats', authenticateToken, (req, res) => {
  const annee = '2025';
  const avecRealise = cadreResultatsData.filter(i => {
    const a = i.annees[annee as keyof typeof i.annees];
    return a && a.realise !== null && a.prevu !== null && a.prevu > 0;
  });
  const performances = avecRealise.map(i => {
    const a = i.annees[annee as keyof typeof i.annees];
    return (a!.realise! / a!.prevu!) * 100;
  });
  const enRetard = performances.filter(p => p < 70).length;
  const enCours = performances.filter(p => p >= 70 && p < 100).length;
  const atteint = performances.filter(p => p >= 100).length;
  const moyennePerf = performances.length ? Math.round(performances.reduce((a, b) => a + b, 0) / performances.length) : 0;
  res.json({
    total: cadreResultatsData.length,
    odp_count: cadreResultatsData.filter(i => i.est_odp).length,
    avec_donnees_2025: avecRealise.length,
    en_retard: enRetard,
    en_cours: enCours,
    atteint: atteint,
    moyenne_performance: moyennePerf,
    composantes: ['Composante 1', 'Composante 2', 'Composante 3', 'Composante 4'].map(c => ({
      nom: c,
      count: cadreResultatsData.filter(i => i.composante === c).length,
    })),
  });
});

// backend/src/app.ts - Ajouter après les routes risques

// ==================== POWER BI ROUTES ====================

// Configuration Power BI (à remplacer par vos valeurs réelles)
const POWERBI_CONFIG = {
  workspaceId: 'your-workspace-id',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tenantId: 'your-tenant-id',
};

// Rapports mockés
const powerBIReports = [
  {
    id: '1',
    name: 'Tableau de bord exécutif',
    description: 'Vue d\'ensemble des indicateurs clés du programme',
    embedUrl: 'https://app.powerbi.com/reportEmbed',
    reportId: 'report-exec-001',
    datasetId: 'dataset-exec-001',
    category: 'dashboard',
    thumbnailUrl: 'https://placehold.co/300x200/2E7D32/FFFFFF?text=Dashboard',
    created_at: '2026-01-15',
    updated_at: '2026-03-28',
  },
  {
    id: '2',
    name: 'Suivi des indicateurs IODP',
    description: 'Performance des objectifs de développement du programme',
    embedUrl: 'https://app.powerbi.com/reportEmbed',
    reportId: 'report-iodp-001',
    datasetId: 'dataset-iodp-001',
    category: 'indicateurs',
    thumbnailUrl: 'https://placehold.co/300x200/4CAF50/FFFFFF?text=IODP',
    created_at: '2026-01-20',
    updated_at: '2026-03-25',
  },
  {
    id: '3',
    name: 'Analyse des bénéficiaires',
    description: 'Distribution géographique et démographique des bénéficiaires',
    embedUrl: 'https://app.powerbi.com/reportEmbed',
    reportId: 'report-benef-001',
    datasetId: 'dataset-benef-001',
    category: 'beneficiaires',
    thumbnailUrl: 'https://placehold.co/300x200/81C784/FFFFFF?text=Beneficiaires',
    created_at: '2026-02-01',
    updated_at: '2026-03-20',
  },
  {
    id: '4',
    name: 'Matrice des risques',
    description: 'Évaluation et suivi des risques du programme',
    embedUrl: 'https://app.powerbi.com/reportEmbed',
    reportId: 'report-risks-001',
    datasetId: 'dataset-risks-001',
    category: 'risques',
    thumbnailUrl: 'https://placehold.co/300x200/FFC107/FFFFFF?text=Risques',
    created_at: '2026-02-15',
    updated_at: '2026-03-22',
  },
  {
    id: '5',
    name: 'Gestion des plaintes GRM',
    description: 'Suivi des plaintes VBG/EAS/HS et délais de traitement',
    embedUrl: 'https://app.powerbi.com/reportEmbed',
    reportId: 'report-grm-001',
    datasetId: 'dataset-grm-001',
    category: 'grm',
    thumbnailUrl: 'https://placehold.co/300x200/D32F2F/FFFFFF?text=GRM',
    created_at: '2026-02-20',
    updated_at: '2026-03-28',
  },
];

// Token d'embed mocké
const generateMockToken = (reportId: string) => {
  return {
    token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MTE4MDQ4MDB9.${reportId}`,
    expiration: new Date(Date.now() + 3600000).toISOString(),
  };
};

app.get('/api/powerbi/reports', authenticateToken, (req, res) => {
  console.log('GET /api/powerbi/reports');
  res.json(powerBIReports);
});

app.get('/api/powerbi/reports/:id', authenticateToken, (req, res) => {
  const report = powerBIReports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ message: 'Rapport non trouvé' });
  }
  res.json(report);
});

app.get('/api/powerbi/reports/category/:category', authenticateToken, (req, res) => {
  const reports = powerBIReports.filter(r => r.category === req.params.category);
  res.json(reports);
});

app.get('/api/powerbi/embed/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  const report = powerBIReports.find(r => r.reportId === reportId);
  
  if (!report) {
    return res.status(404).json({ message: 'Rapport non trouvé' });
  }
  
  const token = generateMockToken(reportId);
  
  res.json({
    reportId: report.reportId,
    reportName: report.name,
    embedUrl: report.embedUrl,
    token: token.token,
    expiration: token.expiration,
  });
});

app.post('/api/powerbi/token/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  const token = generateMockToken(reportId);
  res.json(token);
});

app.post('/api/powerbi/refresh/:datasetId', authenticateToken, (req, res) => {
  const { datasetId } = req.params;
  console.log(`POST /api/powerbi/refresh/${datasetId}`);
  
  res.json({ 
    message: `Rafraîchissement du dataset ${datasetId} initié`,
    status: 'processing',
  });
});

app.post('/api/powerbi/export/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  const { format } = req.body;
  
  // Simulation d'export
  const pdfContent = `%PDF-1.4
  1 0 obj
  << /Type /Catalog /Pages 2 0 R >>
  endobj
  2 0 obj
  << /Type /Pages /Kids [3 0 R] /Count 1 >>
  endobj
  3 0 obj
  << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>
  endobj
  4 0 obj
  << /Length 44 >>
  stream
  BT /F1 24 Tf 100 700 Td (Rapport PNDA - ${reportId}) Tj ET
  endstream
  endobj
  xref
  0 5
  0000000000 65535 f
  0000000009 00000 n
  0000000058 00000 n
  0000000115 00000 n
  0000000210 00000 n
  trailer << /Size 5 /Root 1 0 R >>
  startxref
  299
  %%EOF`;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=rapport_${reportId}.pdf`);
  res.send(Buffer.from(pdfContent));
});

app.post('/api/powerbi/export/:reportId/ppt', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename=rapport_${reportId}.pptx`);
  res.send(Buffer.from('Mock PPT content'));
});

const provincesData = [
  // Province 1: Kwilu
  {
    id: 'kwilu',
    name: 'Kwilu',
    code: 'KW',
    region: 'Ouest',
    population: 5000000,
    beneficiaires: { total: 14250, femmes: 6412, hommes: 7838, jeunes: 3980, cible: 18000 },
    progression: 72,
    production: {
      maïs: { actuel: 1850, cible: 2500, unite: 'tonnes' },
      manioc: { actuel: 1250, cible: 2000, unite: 'tonnes' },
      arachide: { actuel: 620, cible: 1000, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 52, prevues: 90, unite: 'km' },
      cler: { fonctionnels: 4, total: 6 },
      marches: { construits: 2, prevus: 4 },
    },
    indicateurs: {
      iodp1: { actuel: 16, cible: 30, trend: 2.0 },
      iodp2: { actuel: 28, cible: 40, trend: 3.5 },
      iodp3: { actuel: 65, cible: 100, trend: 4.8 },
    },
    risques: { critiques: 1, eleves: 3, moderes: 3, faibles: 4 },
    plaintes: { total: 15, traitees: 10, en_cours: 5, vbg: 3 },
    dernier_suivi: '2026-03-29',
    coordonnees: { lat: -5.0489, lng: 18.8203 },
  },
  // Province 2: Kasaï
  {
    id: 'kasai',
    name: 'Kasaï',
    code: 'KS',
    region: 'Centre',
    population: 6000000,
    beneficiaires: { total: 16890, femmes: 7600, hommes: 9290, jeunes: 4850, cible: 22000 },
    progression: 82,
    production: {
      maïs: { actuel: 2450, cible: 3500, unite: 'tonnes' },
      manioc: { actuel: 1980, cible: 2800, unite: 'tonnes' },
      arachide: { actuel: 890, cible: 1400, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 63, prevues: 100, unite: 'km' },
      cler: { fonctionnels: 5, total: 7 },
      marches: { construits: 3, prevus: 5 },
    },
    indicateurs: {
      iodp1: { actuel: 20, cible: 30, trend: 2.8 },
      iodp2: { actuel: 35, cible: 40, trend: 4.5 },
      iodp3: { actuel: 72, cible: 100, trend: 5.5 },
    },
    risques: { critiques: 2, eleves: 4, moderes: 2, faibles: 3 },
    plaintes: { total: 22, traitees: 14, en_cours: 8, vbg: 5 },
    dernier_suivi: '2026-03-26',
    coordonnees: { lat: -5.9443, lng: 22.4167 },
  },
  // Province 3: Kasaï Central
  {
    id: 'kasaicentral',
    name: 'Kasaï Central',
    code: 'KC',
    region: 'Centre',
    population: 3500000,
    beneficiaires: { total: 12540, femmes: 5643, hommes: 6897, jeunes: 3510, cible: 16000 },
    progression: 68,
    production: {
      maïs: { actuel: 1680, cible: 2400, unite: 'tonnes' },
      manioc: { actuel: 1340, cible: 2000, unite: 'tonnes' },
      arachide: { actuel: 580, cible: 900, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 48, prevues: 75, unite: 'km' },
      cler: { fonctionnels: 3, total: 5 },
      marches: { construits: 2, prevus: 3 },
    },
    indicateurs: {
      iodp1: { actuel: 17, cible: 30, trend: 2.2 },
      iodp2: { actuel: 29, cible: 40, trend: 3.6 },
      iodp3: { actuel: 68, cible: 100, trend: 5.0 },
    },
    risques: { critiques: 1, eleves: 2, moderes: 4, faibles: 5 },
    plaintes: { total: 10, traitees: 7, en_cours: 3, vbg: 2 },
    dernier_suivi: '2026-03-25',
    coordonnees: { lat: -5.8975, lng: 22.4500 },
  },
];

app.get('/api/provinces', authenticateToken, (req, res) => {
  res.json(provincesData);
});

app.get('/api/provinces/classement', authenticateToken, (_req, res) => {
  const classement = [
    { province: 'Kasaï', score: 82, rang: 1, progression: 8 },
    { province: 'Kwilu', score: 72, rang: 2, progression: 3 },
    { province: 'Kasaï Central', score: 68, rang: 3, progression: -2 },
    { province: 'Kongo Central', score: 65, rang: 4, progression: 5 },
    { province: 'Kinshasa', score: 61, rang: 5, progression: -1 },
    { province: 'Tanganyika', score: 58, rang: 6, progression: 2 },
  ];
  res.json(classement);
});

app.get('/api/provinces/:id', authenticateToken, (req, res) => {
  const province = provincesData.find(p => p.id === req.params.id);
  if (!province) return res.status(404).json({ message: 'Province non trouvée' });
  res.json(province);
});

app.get('/api/provinces/:id/data', authenticateToken, (req, res) => {
  const province = provincesData.find(p => p.id === req.params.id);
  if (!province) return res.status(404).json({ message: 'Province non trouvée' });
  res.json(province);
});

app.get('/api/provinces/:id/evolution', authenticateToken, (_req, res) => {
  const evolution = [
    { mois: 'Jan', beneficiaires: 8500, production: 3200, routes: 45 },
    { mois: 'Fév', beneficiaires: 9800, production: 3800, routes: 58 },
    { mois: 'Mar', beneficiaires: 11200, production: 4200, routes: 72 },
    { mois: 'Avr', beneficiaires: 12800, production: 4800, routes: 85 },
    { mois: 'Mai', beneficiaires: 14200, production: 5200, routes: 95 },
    { mois: 'Juin', beneficiaires: 15230, production: 5800, routes: 110 },
  ];
  res.json(evolution);
});

app.get('/api/provinces/:id/export', authenticateToken, (req, res) => {
  const province = provincesData.find(p => p.id === req.params.id);
  if (!province) return res.status(404).json({ message: 'Province non trouvée' });
  
  // Génération d'un CSV simple
  const csvContent = [
    ['Indicateur', 'Valeur'],
    ['Province', province.name],
    ['Bénéficiaires', province.beneficiaires.total],
    ['Femmes bénéficiaires', province.beneficiaires.femmes],
    ['Routes réhabilitées (km)', province.infrastructures.routes.rehabilitees],
    ['IODP1 (%)', province.indicateurs.iodp1.actuel],
    ['IODP2 (%)', province.indicateurs.iodp2.actuel],
    ['IODP3 (%)', province.indicateurs.iodp3.actuel],
  ].map(row => row.join(',')).join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=province_${province.id}.csv`);
  res.send(csvContent);
});

// ==================== FOURNISSEURS ROUTES ====================

const fournisseursData = [
  { id: 1, nom: 'AgroSemences Congo', sigle: 'ASC', type: 'Semences', province: 'Kinshasa', territoire: 'Mont-Ngafula', responsable: 'Jean-Claude Mbaya', telephone: '+243 81 234 5678', email: 'asc@agrosemences.cd', statut: 'Agréé', stock_disponible: 4500, stock_total: 6000, beneficiaires_servis: 1240, montant_contrat: 185000, taux_livraison: 87, date_contrat: '2026-01-15', intrants: ['Maïs hybride', 'Manioc amélioré', 'Haricot'] },
  { id: 2, nom: 'Engrais du Congo SARL', sigle: 'EC', type: 'Engrais', province: 'Kongo Central', territoire: 'Matadi', responsable: 'Marie-Thérèse Lufutu', telephone: '+243 82 345 6789', email: 'ec@engraiscongo.cd', statut: 'Agréé', stock_disponible: 2800, stock_total: 5000, beneficiaires_servis: 890, montant_contrat: 245000, taux_livraison: 75, date_contrat: '2026-01-20', intrants: ['NPK 17-17-17', 'Urée 46%', 'Sulfate d\'ammonium'] },
  { id: 3, nom: 'AgriEquip Kwilu', sigle: 'AEK', type: 'Équipements', province: 'Kwilu', territoire: 'Bandundu', responsable: 'Patrick Niangadou', telephone: '+243 84 456 7890', statut: 'En cours', stock_disponible: 320, stock_total: 500, beneficiaires_servis: 450, montant_contrat: 98000, taux_livraison: 64, date_contrat: '2026-02-01', intrants: ['Houes améliorées', 'Pulvérisateurs', 'Brouettes'] },
  { id: 4, nom: 'PhytoProtect SA', sigle: 'PP', type: 'Pesticides', province: 'Haut-Lomami', territoire: 'Kamina', responsable: 'Alphonse Kasongo', telephone: '+243 85 567 8901', statut: 'Suspendu', stock_disponible: 0, stock_total: 1200, beneficiaires_servis: 230, montant_contrat: 67000, taux_livraison: 30, date_contrat: '2025-12-10', intrants: ['Herbicides', 'Insecticides bio'] },
  { id: 5, nom: 'Congo Agri Services', sigle: 'CAS', type: 'Mixte', province: 'Kasaï', territoire: 'Tshikapa', responsable: 'Sandrine Mukeba', telephone: '+243 86 678 9012', email: 'cas@congoas.cd', statut: 'Agréé', stock_disponible: 3100, stock_total: 4200, beneficiaires_servis: 1680, montant_contrat: 312000, taux_livraison: 92, date_contrat: '2026-01-10', intrants: ['Semences maïs', 'Engrais NPK', 'Outils de récolte'] },
];

app.get('/api/fournisseurs', authenticateToken, (req, res) => {
  const { search, type, province, statut, page = 0, limit = 10 } = req.query;
  let filtered = [...fournisseursData];
  if (search) { const s = String(search).toLowerCase(); filtered = filtered.filter(f => f.nom.toLowerCase().includes(s) || f.responsable.toLowerCase().includes(s)); }
  if (type) filtered = filtered.filter(f => f.type === type);
  if (province) filtered = filtered.filter(f => f.province === province);
  if (statut) filtered = filtered.filter(f => f.statut === statut);
  const start = Number(page) * Number(limit);
  res.json({ data: filtered.slice(start, start + Number(limit)), total: filtered.length, page: Number(page), totalPages: Math.ceil(filtered.length / Number(limit)) });
});

app.get('/api/fournisseurs/stats', authenticateToken, (_req, res) => {
  res.json({ total: fournisseursData.length, agrees: fournisseursData.filter(f => f.statut === 'Agréé').length, en_cours: fournisseursData.filter(f => f.statut === 'En cours').length, suspendus: fournisseursData.filter(f => f.statut === 'Suspendu').length });
});

app.get('/api/fournisseurs/:id', authenticateToken, (req, res) => {
  const item = fournisseursData.find(f => f.id === Number(req.params.id));
  if (!item) return res.status(404).json({ message: 'Fournisseur non trouvé' });
  res.json(item);
});

app.post('/api/fournisseurs', authenticateToken, (req, res) => {
  const newItem = { id: fournisseursData.length + 1, ...req.body, date_contrat: new Date().toISOString().split('T')[0], beneficiaires_servis: 0, taux_livraison: 0 };
  fournisseursData.push(newItem);
  res.status(201).json(newItem);
});

app.put('/api/fournisseurs/:id', authenticateToken, (req, res) => {
  const index = fournisseursData.findIndex(f => f.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Fournisseur non trouvé' });
  fournisseursData[index] = { ...fournisseursData[index], ...req.body };
  res.json(fournisseursData[index]);
});

app.delete('/api/fournisseurs/:id', authenticateToken, (req, res) => {
  const index = fournisseursData.findIndex(f => f.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Fournisseur non trouvé' });
  fournisseursData.splice(index, 1);
  res.json({ message: 'Fournisseur supprimé' });
});

// ==================== ORGANISATIONS ROUTES ====================

const organisationsData = [
  { id: 1, code: 'ORG-001', nom: 'UNCP', sigle: 'UNCP', nom_complet: 'Unité Nationale de Coordination du Programme', type: 'gouvernemental', province: 'Kinshasa', responsable: 'Jean Mukendi', telephone: '+243 81 000 0001', email: 'uncp@pnda.cd', role: 'Coordination nationale', beneficiaires_couverts: 124530, budget_alloue: 5200000, taux_execution: 78, statut: 'Actif', date_creation: '2023-01-01', membres: { total: 48, femmes: 22, hommes: 26, jeunes: 15 } },
  { id: 2, code: 'ORG-002', nom: 'OVDA', sigle: 'OVDA', nom_complet: 'Office des Voiries et Drainage Agricole', type: 'gouvernemental', province: 'Kinshasa', responsable: 'Pierre Kabeya', telephone: '+243 81 000 0002', email: 'ovda@pnda.cd', role: 'Infrastructures rurales', beneficiaires_couverts: 45000, budget_alloue: 3100000, taux_execution: 62, statut: 'Actif', date_creation: '2023-01-15', membres: { total: 32, femmes: 12, hommes: 20, jeunes: 8 } },
  { id: 3, code: 'ORG-003', nom: 'Banque Mondiale', sigle: 'BM', nom_complet: 'Banque Internationale pour la Reconstruction et le Développement', type: 'partenaire_financier', province: 'Kinshasa', responsable: 'Sophie Laurent', telephone: '+243 81 000 0003', email: 'bm@worldbank.org', role: 'Bailleur principal', beneficiaires_couverts: 0, budget_alloue: 150000000, taux_execution: 65, statut: 'Actif', date_creation: '2023-01-01', membres: { total: 12, femmes: 5, hommes: 7, jeunes: 2 } },
  { id: 4, code: 'ORG-004', nom: 'ONG Agri-RDC', sigle: 'AGRIRDC', nom_complet: 'Organisation Non Gouvernementale pour l\'Agriculture en RDC', type: 'ong', province: 'Kwilu', responsable: 'Alice Mwamba', telephone: '+243 82 111 2222', email: 'agrirdc@ong.cd', role: 'Appui terrain', beneficiaires_couverts: 12500, budget_alloue: 450000, taux_execution: 85, statut: 'Actif', date_creation: '2023-03-01', membres: { total: 85, femmes: 48, hommes: 37, jeunes: 32 } },
  { id: 5, code: 'ORG-005', nom: 'FAO-RDC', sigle: 'FAO', nom_complet: 'Organisation des Nations Unies pour l\'Alimentation et l\'Agriculture — RDC', type: 'partenaire_technique', province: 'Kinshasa', responsable: 'Dr. Carlos Meza', telephone: '+243 81 222 3333', email: 'fao-rdc@fao.org', role: 'Appui technique', beneficiaires_couverts: 0, budget_alloue: 2800000, taux_execution: 71, statut: 'Actif', date_creation: '2023-02-01', membres: { total: 18, femmes: 8, hommes: 10, jeunes: 4 } },
];

app.get('/api/organisations', authenticateToken, (req, res) => {
  const { search, type, province, statut, page = 0, limit = 10 } = req.query;
  let filtered = [...organisationsData];
  if (search) { const s = String(search).toLowerCase(); filtered = filtered.filter(o => o.nom.toLowerCase().includes(s) || o.nom_complet.toLowerCase().includes(s)); }
  if (type) filtered = filtered.filter(o => o.type === type);
  if (province) filtered = filtered.filter(o => o.province === province);
  if (statut) filtered = filtered.filter(o => o.statut === statut);
  const start = Number(page) * Number(limit);
  res.json({ data: filtered.slice(start, start + Number(limit)), total: filtered.length, page: Number(page), totalPages: Math.ceil(filtered.length / Number(limit)) });
});

app.get('/api/organisations/stats', authenticateToken, (_req, res) => {
  const total = organisationsData.length;
  const actives = organisationsData.filter(o => o.statut === 'Actif').length;
  const total_membres = organisationsData.reduce((s, o) => s + o.membres.total, 0);
  const femmes_membres = organisationsData.reduce((s, o) => s + o.membres.femmes, 0);
  const hommes_membres = organisationsData.reduce((s, o) => s + o.membres.hommes, 0);
  const jeunes_membres = organisationsData.reduce((s, o) => s + o.membres.jeunes, 0);
  res.json({
    total,
    total_membres,
    femmes_membres,
    hommes_membres,
    jeunes_membres,
    par_statut: { active: actives, inactive: total - actives },
    gouvernementaux: organisationsData.filter(o => o.type === 'gouvernemental').length,
    ong: organisationsData.filter(o => o.type === 'ong').length,
    partenaires: organisationsData.filter(o => o.type.startsWith('partenaire')).length,
  });
});

app.get('/api/organisations/:id', authenticateToken, (req, res) => {
  const item = organisationsData.find(o => o.id === Number(req.params.id));
  if (!item) return res.status(404).json({ message: 'Organisation non trouvée' });
  res.json(item);
});

app.post('/api/organisations', authenticateToken, (req, res) => {
  const newItem = { id: organisationsData.length + 1, ...req.body, taux_execution: 0, beneficiaires_couverts: 0, date_creation: new Date().toISOString().split('T')[0] };
  organisationsData.push(newItem);
  res.status(201).json(newItem);
});

app.put('/api/organisations/:id', authenticateToken, (req, res) => {
  const index = organisationsData.findIndex(o => o.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Organisation non trouvée' });
  organisationsData[index] = { ...organisationsData[index], ...req.body };
  res.json(organisationsData[index]);
});

app.delete('/api/organisations/:id', authenticateToken, (req, res) => {
  const index = organisationsData.findIndex(o => o.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Organisation non trouvée' });
  organisationsData.splice(index, 1);
  res.json({ message: 'Organisation supprimée' });
});

// ==================== ACTIVITÉS ROUTES ====================

const activitesData = [
  { id: 1, code: 'ACT-001', titre: 'Distribution de semences améliorées - Kwilu', type: 'Distribution intrants', composante: 'Composante 1', province: 'Kwilu', territoire: 'Idiofa', responsable: 'UNCP', beneficiaires_cibles: 2500, beneficiaires_atteints: 2300, budget_prevu: 185000, budget_execute: 162000, statut: 'Terminé', date_debut: '2026-01-10', date_fin: '2026-02-28', taux_execution: 88, objectifs: ['Distribuer 2500 kits semences', 'Former les agriculteurs'], created_at: '2026-01-05' },
  { id: 2, code: 'ACT-002', titre: 'Formation AIC - Techniques de conservation', type: 'Formation', composante: 'Composante 1', province: 'Kasaï', territoire: 'Tshikapa', responsable: 'ONG Agri-RDC', beneficiaires_cibles: 1200, beneficiaires_atteints: 980, budget_prevu: 95000, budget_execute: 71000, statut: 'En cours', date_debut: '2026-02-01', date_fin: '2026-04-30', taux_execution: 65, objectifs: ['Former 1200 agriculteurs aux techniques AIC'], created_at: '2026-01-20' },
  { id: 3, code: 'ACT-003', titre: 'Réhabilitation route Bandundu-Kikwit (45 km)', type: 'Infrastructure', composante: 'Composante 2', province: 'Kwilu', territoire: 'Bandundu', responsable: 'OVDA', beneficiaires_cibles: 15000, beneficiaires_atteints: 0, budget_prevu: 4500000, budget_execute: 1350000, statut: 'En cours', date_debut: '2025-11-01', date_fin: '2026-06-30', taux_execution: 30, objectifs: ['Réhabiliter 45 km de route rurale', 'Installer 3 ponts'], created_at: '2025-10-15' },
  { id: 4, code: 'ACT-004', titre: 'Enregistrement RNA - Phase 3 Haut-Lomami', type: 'Enregistrement', composante: 'Composante 1', province: 'Haut-Lomami', territoire: 'Kamina', responsable: 'UNCP', beneficiaires_cibles: 8500, beneficiaires_atteints: 7230, budget_prevu: 52000, budget_execute: 48000, statut: 'Terminé', date_debut: '2026-01-15', date_fin: '2026-03-15', taux_execution: 95, objectifs: ['Enregistrer 8500 agriculteurs dans le RNA'], created_at: '2026-01-10' },
  { id: 5, code: 'ACT-005', titre: 'Campagne vaccination bovins - Tanganyika', type: 'Santé animale', composante: 'Composante 1', province: 'Tanganyika', territoire: 'Kalemie', responsable: 'UNCP', beneficiaires_cibles: 3200, beneficiaires_atteints: 1800, budget_prevu: 78000, budget_execute: 43000, statut: 'En cours', date_debut: '2026-03-01', date_fin: '2026-05-31', taux_execution: 55, objectifs: ['Vacciner 12000 bovins', 'Former 50 para-vétérinaires'], created_at: '2026-02-20' },
];

app.get('/api/activites', authenticateToken, (req, res) => {
  const { search, type, composante, province, statut, page = 0, limit = 10 } = req.query;
  let filtered = [...activitesData];
  if (search) { const s = String(search).toLowerCase(); filtered = filtered.filter(a => a.titre.toLowerCase().includes(s) || a.code.toLowerCase().includes(s)); }
  if (type) filtered = filtered.filter(a => a.type === type);
  if (composante) filtered = filtered.filter(a => a.composante === composante);
  if (province) filtered = filtered.filter(a => a.province === province);
  if (statut) filtered = filtered.filter(a => a.statut === statut);
  const start = Number(page) * Number(limit);
  res.json({ data: filtered.slice(start, start + Number(limit)), total: filtered.length, page: Number(page), totalPages: Math.ceil(filtered.length / Number(limit)) });
});

app.get('/api/activites/stats', authenticateToken, (_req, res) => {
  const total = activitesData.length;
  const budget_total = activitesData.reduce((s, a) => s + a.budget_prevu, 0);
  const budget_execute = activitesData.reduce((s, a) => s + a.budget_execute, 0);
  res.json({ total, terminees: activitesData.filter(a => a.statut === 'Terminé').length, en_cours: activitesData.filter(a => a.statut === 'En cours').length, planifiees: activitesData.filter(a => a.statut === 'Planifié').length, budget_total, budget_execute, taux_execution_moyen: Math.round(activitesData.reduce((s, a) => s + a.taux_execution, 0) / total) });
});

app.get('/api/activites/:id', authenticateToken, (req, res) => {
  const item = activitesData.find(a => a.id === Number(req.params.id));
  if (!item) return res.status(404).json({ message: 'Activité non trouvée' });
  res.json(item);
});

app.post('/api/activites', authenticateToken, (req, res) => {
  const newItem = { id: activitesData.length + 1, code: `ACT-${String(activitesData.length + 1).padStart(3, '0')}`, ...req.body, beneficiaires_atteints: 0, budget_execute: 0, taux_execution: 0, created_at: new Date().toISOString().split('T')[0] };
  activitesData.push(newItem);
  res.status(201).json(newItem);
});

app.put('/api/activites/:id', authenticateToken, (req, res) => {
  const index = activitesData.findIndex(a => a.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Activité non trouvée' });
  activitesData[index] = { ...activitesData[index], ...req.body };
  res.json(activitesData[index]);
});

app.delete('/api/activites/:id', authenticateToken, (req, res) => {
  const index = activitesData.findIndex(a => a.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Activité non trouvée' });
  activitesData.splice(index, 1);
  res.json({ message: 'Activité supprimée' });
});

// ==================== UTILISATEURS ROUTES ====================

const utilisateursData = [
  { id: 1, nom: 'MUKENDI', prenom: 'Jean', email: 'admin@pnda.cd', role: 'admin', role_label: 'Administrateur', niveau: 100, province: null, telephone: '+243 81 000 0001', statut: 'actif', derniere_connexion: new Date().toISOString(), date_creation: '2023-01-01', created_by: 'Système', permissions: ['*'] },
  { id: 2, nom: 'KABEYA', prenom: 'Marie', email: 'uncp@pnda.cd', role: 'uncp', role_label: 'UNCP', niveau: 80, province: null, telephone: '+243 81 000 0002', statut: 'actif', derniere_connexion: new Date().toISOString(), date_creation: '2023-01-15', created_by: 'admin@pnda.cd', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte', 'rapports', 'admin'] },
  { id: 3, nom: 'TSHIBOLA', prenom: 'Pierre', email: 'upep@pnda.cd', role: 'upep', role_label: 'UPEP', niveau: 60, province: 'Kwilu', telephone: '+243 81 000 0003', statut: 'actif', derniere_connexion: new Date().toISOString(), date_creation: '2023-02-01', created_by: 'uncp@pnda.cd', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'] },
  { id: 4, nom: 'LUBALA', prenom: 'Sandrine', email: 'ot1@pnda.cd', role: 'ot', role_label: 'Opérateur Technique', niveau: 50, province: 'Kasaï', telephone: '+243 82 111 1111', statut: 'actif', derniere_connexion: '2026-03-30T10:00:00Z', date_creation: '2023-03-01', created_by: 'uncp@pnda.cd', permissions: ['collecte', 'beneficiaires'] },
  { id: 5, nom: 'MWAMBA', prenom: 'Alice', email: 'partenaire@fao.org', role: 'partenaire', role_label: 'Partenaire', niveau: 40, province: null, telephone: '+243 81 222 3333', statut: 'actif', derniere_connexion: '2026-03-28T14:30:00Z', date_creation: '2023-04-01', created_by: 'admin@pnda.cd', permissions: ['dashboard', 'rapports'] },
  { id: 6, nom: 'NKONGOLO', prenom: 'Patrick', email: 'upep.kongo@pnda.cd', role: 'upep', role_label: 'UPEP', niveau: 60, province: 'Kongo Central', telephone: '+243 84 555 6666', statut: 'actif', derniere_connexion: '2026-03-29T08:00:00Z', date_creation: '2023-06-15', created_by: 'uncp@pnda.cd', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'] },
  { id: 7, nom: 'BILONDA', prenom: 'Christine', email: 'upep.kasai@pnda.cd', role: 'upep', role_label: 'UPEP', niveau: 60, province: 'Kasaï', telephone: '+243 85 777 8888', statut: 'actif', derniere_connexion: '2026-03-31T07:45:00Z', date_creation: '2023-07-01', created_by: 'uncp@pnda.cd', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'] },
  { id: 8, nom: 'TSHOMBA', prenom: 'François', email: 'ot.kwilu@pnda.cd', role: 'ot', role_label: 'Opérateur Technique', niveau: 50, province: 'Kwilu', telephone: '+243 83 444 5555', statut: 'actif', derniere_connexion: '2026-03-30T16:20:00Z', date_creation: '2023-08-01', created_by: 'upep@pnda.cd', permissions: ['collecte', 'beneficiaires', 'rapports_terrain'] },
  { id: 9, nom: 'MBUYI', prenom: 'Espérance', email: 'ot.tanganyika@pnda.cd', role: 'ot', role_label: 'Opérateur Technique', niveau: 50, province: 'Tanganyika', telephone: '+243 82 333 4444', statut: 'actif', derniere_connexion: '2026-03-27T11:30:00Z', date_creation: '2023-09-01', created_by: 'upep@pnda.cd', permissions: ['collecte', 'beneficiaires', 'rapports_terrain'] },
  { id: 10, nom: 'KALOMBO', prenom: 'Robert', email: 'partenaire@banquemondiale.org', role: 'partenaire', role_label: 'Partenaire', niveau: 40, province: null, telephone: '+243 81 999 0000', statut: 'actif', derniere_connexion: '2026-03-25T10:00:00Z', date_creation: '2024-01-15', created_by: 'admin@pnda.cd', permissions: ['dashboard', 'rapports'] },
  { id: 11, nom: 'DIALLO', prenom: 'Fatou', email: 'partenaire@unicef.org', role: 'partenaire', role_label: 'Partenaire', niveau: 40, province: null, telephone: '+243 85 111 2222', statut: 'inactif', derniere_connexion: '2026-02-10T09:00:00Z', date_creation: '2024-02-01', created_by: 'admin@pnda.cd', permissions: ['dashboard', 'rapports'] },
  { id: 12, nom: 'NGANDU', prenom: 'Sylvie', email: 'upep.hlomami@pnda.cd', role: 'upep', role_label: 'UPEP', niveau: 60, province: 'Haut-Lomami', telephone: '+243 84 666 7777', statut: 'actif', derniere_connexion: '2026-03-31T09:10:00Z', date_creation: '2024-03-01', created_by: 'uncp@pnda.cd', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'] },
];

app.get('/api/utilisateurs', authenticateToken, (req, res) => {
  const { search, role, province, statut, page = 0, limit = 10 } = req.query;
  let filtered = utilisateursData.map(u => { const { ...rest } = u; return rest; });
  if (search) { const s = String(search).toLowerCase(); filtered = filtered.filter(u => u.nom.toLowerCase().includes(s) || u.prenom.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)); }
  if (role) filtered = filtered.filter(u => u.role === role);
  if (province) filtered = filtered.filter(u => u.province === province);
  if (statut) filtered = filtered.filter(u => u.statut === statut);
  const start = Number(page) * Number(limit);
  res.json({ data: filtered.slice(start, start + Number(limit)), total: filtered.length, page: Number(page) });
});

app.get('/api/utilisateurs/stats', authenticateToken, (_req, res) => {
  const par_role: Record<string, number> = {};
  const par_statut: Record<string, number> = {};
  const par_province: Record<string, number> = {};
  for (const u of utilisateursData) {
    par_role[u.role] = (par_role[u.role] ?? 0) + 1;
    par_statut[u.statut] = (par_statut[u.statut] ?? 0) + 1;
    if (u.province) par_province[u.province] = (par_province[u.province] ?? 0) + 1;
  }
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const actifs_30j = utilisateursData.filter(u => u.derniere_connexion && u.derniere_connexion > thirtyDaysAgo).length;
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const nouveaux_mois = utilisateursData.filter(u => u.date_creation >= firstOfMonth).length;
  res.json({ total: utilisateursData.length, par_role, par_statut, par_province, actifs_30j, nouveaux_mois });
});

app.get('/api/utilisateurs/roles', authenticateToken, (_req, res) => {
  res.json([
    { id: 'admin', nom: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités', permissions: ['*'], niveau: 100 },
    { id: 'uncp', nom: 'UNCP', description: 'Coordination nationale du programme', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'rapports', 'admin'], niveau: 80 },
    { id: 'upep', nom: 'UPEP', description: 'Unités provinciales d\'exécution du programme', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'], niveau: 60 },
    { id: 'ot', nom: 'Opérateur Technique', description: 'Collecte terrain et suivi des bénéficiaires', permissions: ['collecte', 'beneficiaires', 'rapports_terrain'], niveau: 50 },
    { id: 'partenaire', nom: 'Partenaire', description: 'Accès aux rapports et tableaux de bord', permissions: ['dashboard', 'rapports'], niveau: 40 },
    { id: 'invite', nom: 'Invité', description: 'Accès limité en lecture seule', permissions: ['dashboard'], niveau: 20 },
  ]);
});

app.get('/api/utilisateurs/permissions', authenticateToken, (_req, res) => {
  res.json([
    { id: 'dashboard', nom: 'Tableau de bord', module: 'Dashboard', description: 'Accès aux dashboards' },
    { id: 'indicateurs', nom: 'Indicateurs', module: 'Indicateurs', description: 'Gestion des indicateurs' },
    { id: 'beneficiaires', nom: 'Bénéficiaires', module: 'Bénéficiaires', description: 'Gestion des bénéficiaires' },
    { id: 'collecte', nom: 'Collecte', module: 'Collecte', description: 'Saisie et collecte de données' },
    { id: 'rapports', nom: 'Rapports', module: 'Rapports', description: 'Consultation des rapports' },
    { id: 'rapports_terrain', nom: 'Rapports terrain', module: 'Rapports', description: 'Rapports des opérations terrain' },
    { id: 'admin', nom: 'Administration', module: 'Admin', description: 'Gestion des utilisateurs et configuration' },
  ]);
});

app.post('/api/utilisateurs', authenticateToken, (req, res) => {
  const newUser = { id: utilisateursData.length + 1, ...req.body, statut: 'actif', derniere_connexion: null, date_creation: new Date().toISOString().split('T')[0] };
  utilisateursData.push(newUser);
  res.status(201).json(newUser);
});

app.post('/api/utilisateurs/:id/reset-password', authenticateToken, (req, res) => {
  const index = utilisateursData.findIndex(u => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const tempPassword = Math.random().toString(36).slice(-8);
  res.json({ message: 'Mot de passe réinitialisé', temp_password: tempPassword });
});

app.patch('/api/utilisateurs/:id/statut', authenticateToken, (req, res) => {
  const index = utilisateursData.findIndex(u => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  utilisateursData[index] = { ...utilisateursData[index], statut: req.body.statut };
  res.json(utilisateursData[index]);
});

app.put('/api/utilisateurs/:id', authenticateToken, (req, res) => {
  const index = utilisateursData.findIndex(u => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  utilisateursData[index] = { ...utilisateursData[index], ...req.body };
  res.json(utilisateursData[index]);
});

app.delete('/api/utilisateurs/:id', authenticateToken, (req, res) => {
  const index = utilisateursData.findIndex(u => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  utilisateursData.splice(index, 1);
  res.json({ message: 'Utilisateur supprimé' });
});

// ==================== NOTIFICATIONS ROUTES ====================

type AppUser = (typeof users)[number];
type PlainteRecord = (typeof plaintes)[number];
type ActiviteRecord = (typeof activitesData)[number];
type UtilisateurRecord = (typeof utilisateursData)[number];

type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';
type NotificationType = 'risk' | 'complaint' | 'activity' | 'user';
type NotificationEntityType = 'risque' | 'plainte' | 'activite' | 'utilisateur';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  type: NotificationType;
  category_label: string;
  created_at: string;
  action_url: string;
  province: string | null;
  entity_type: NotificationEntityType;
  entity_id: number;
  read: boolean;
}

interface NotificationSeed extends Omit<AppNotification, 'read'> {
  roles?: string[];
  defaultRead?: boolean;
}

const nationalRoles = new Set(['admin', 'uncp', 'partenaire']);

function getRequestUser(req: AuthenticatedRequest): AppUser | null {
  const decoded = req.user as { id?: number } | undefined;

  if (!decoded || typeof decoded.id !== 'number') {
    return null;
  }

  return users.find((user) => user.id === decoded.id) ?? null;
}

function toIsoDate(value?: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function compareNotificationsByDate(a: { created_at: string }, b: { created_at: string }): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function canUserAccessNotification(currentUser: AppUser, notification: NotificationSeed): boolean {
  if (notification.roles && !notification.roles.includes(currentUser.role)) {
    return false;
  }

  if (!notification.province || nationalRoles.has(currentUser.role)) {
    return true;
  }

  return currentUser.province === notification.province;
}

function getComplaintSeverity(plainte: PlainteRecord): NotificationSeverity {
  if (plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS') {
    return 'danger';
  }

  if (plainte.statut === 'en_cours' || plainte.statut === 'referee') {
    return 'warning';
  }

  if (plainte.statut === 'traitee') {
    return 'success';
  }

  return 'info';
}

function getComplaintTitle(plainte: PlainteRecord): string {
  if (plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS') {
    return 'Plainte sensible à traiter';
  }

  switch (plainte.statut) {
    case 'traitee':
      return 'Plainte traitée';
    case 'en_cours':
      return 'Plainte en cours de traitement';
    case 'referee':
      return 'Plainte référée à un service';
    default:
      return 'Nouvelle plainte reçue';
  }
}

function buildRiskNotificationSeeds(): NotificationSeed[] {
  return alertesData.map((alerte) => {
    const risque = risquesData.find((item) => item.id === alerte.id_risque);
    const titleByLevel: Record<AlerteRisque['niveau'], string> = {
      danger: 'Alerte risque critique',
      warning: 'Alerte risque élevée',
      info: 'Mise à jour de risque',
    };

    return {
      id: `risk-alert-${alerte.id}`,
      title: titleByLevel[alerte.niveau],
      message: risque?.province ? `${risque.province} · ${alerte.message}` : alerte.message,
      severity: alerte.niveau,
      type: 'risk',
      category_label: 'Risques',
      created_at: toIsoDate(alerte.date_alerte),
      action_url: '/risques/alertes',
      province: risque?.province ?? null,
      entity_type: 'risque',
      entity_id: alerte.id_risque,
      roles: ['admin', 'uncp', 'upep'],
      defaultRead: alerte.est_lue,
    };
  });
}

function buildComplaintNotificationSeeds(): NotificationSeed[] {
  return plaintes.map((plainte) => ({
    id: `complaint-${plainte.id}`,
    title: getComplaintTitle(plainte),
    message: `${plainte.numero_plainte} · ${plainte.province} · ${plainte.description}`,
    severity: getComplaintSeverity(plainte),
    type: 'complaint',
    category_label: 'Plaintes',
    created_at: toIsoDate(plainte.date_reception),
    action_url: '/database/plaintes',
    province: plainte.province ?? null,
    entity_type: 'plainte',
    entity_id: plainte.id,
    roles: plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS'
      ? ['admin', 'uncp', 'upep']
      : ['admin', 'uncp', 'upep', 'ot'],
  }));
}

function buildActivityNotificationSeeds(): NotificationSeed[] {
  const notifications: NotificationSeed[] = [];

  for (const activite of activitesData) {
    if (activite.statut === 'En cours' && activite.taux_execution < 60) {
      notifications.push({
        id: `activity-progress-${activite.id}`,
        title: 'Activité à surveiller',
        message: `${activite.code} · ${activite.titre} n'a atteint que ${activite.taux_execution}% d'exécution.`,
        severity: 'warning',
        type: 'activity',
        category_label: 'Activités',
        created_at: toIsoDate(activite.date_fin || activite.created_at),
        action_url: '/suivi/activites',
        province: activite.province ?? null,
        entity_type: 'activite',
        entity_id: activite.id,
        roles: ['admin', 'uncp', 'upep', 'ot'],
      });
    }

    if (activite.statut === 'Terminé') {
      notifications.push({
        id: `activity-complete-${activite.id}`,
        title: 'Activité terminée',
        message: `${activite.code} · ${activite.titre} est clôturée avec ${activite.taux_execution}% d'exécution.`,
        severity: 'success',
        type: 'activity',
        category_label: 'Activités',
        created_at: toIsoDate(activite.date_fin || activite.created_at),
        action_url: '/suivi/activites',
        province: activite.province ?? null,
        entity_type: 'activite',
        entity_id: activite.id,
        roles: ['admin', 'uncp', 'upep', 'ot'],
      });
    }
  }

  return notifications;
}

function buildUserNotificationSeeds(): NotificationSeed[] {
  const notifications: NotificationSeed[] = [];
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const utilisateur of utilisateursData) {
    if (utilisateur.statut === 'inactif') {
      notifications.push({
        id: `user-inactive-${utilisateur.id}`,
        title: 'Utilisateur inactif',
        message: `${utilisateur.prenom} ${utilisateur.nom} (${utilisateur.email}) est actuellement inactif.`,
        severity: 'warning',
        type: 'user',
        category_label: 'Administration',
        created_at: toIsoDate(utilisateur.derniere_connexion || utilisateur.date_creation),
        action_url: '/admin/utilisateurs',
        province: utilisateur.province ?? null,
        entity_type: 'utilisateur',
        entity_id: utilisateur.id,
        roles: ['admin'],
      });
    }

    const lastSeen = utilisateur.derniere_connexion ? new Date(utilisateur.derniere_connexion).getTime() : 0;
    if (utilisateur.statut === 'actif' && lastSeen > 0 && lastSeen < fourteenDaysAgo) {
      notifications.push({
        id: `user-stale-${utilisateur.id}`,
        title: 'Connexion à relancer',
        message: `${utilisateur.prenom} ${utilisateur.nom} n'a pas ouvert la plateforme depuis plus de 14 jours.`,
        severity: 'info',
        type: 'user',
        category_label: 'Administration',
        created_at: toIsoDate(utilisateur.derniere_connexion),
        action_url: '/admin/utilisateurs',
        province: utilisateur.province ?? null,
        entity_type: 'utilisateur',
        entity_id: utilisateur.id,
        roles: ['admin'],
      });
    }
  }

  return notifications;
}

async function buildNotificationsForUser(currentUser: AppUser): Promise<AppNotification[]> {
  const seeds = [
    ...buildRiskNotificationSeeds(),
    ...buildComplaintNotificationSeeds(),
    ...buildActivityNotificationSeeds(),
    ...buildUserNotificationSeeds(),
  ];

  const visibleSeeds = seeds
    .filter((notification) => canUserAccessNotification(currentUser, notification))
    .sort(compareNotificationsByDate);

  const readSet = await getReadNotificationIds(
    currentUser.id,
    visibleSeeds.map((notification) => notification.id),
  );

  return visibleSeeds
    .map(({ defaultRead, ...notification }) => ({
      ...notification,
      read: Boolean(defaultRead) || readSet.has(notification.id),
    }));
}

function buildNotificationSummary(notifications: AppNotification[]): {
  total: number;
  unread: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
} {
  const summary = {
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.read).length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  };

  for (const notification of notifications) {
    summary.byType[notification.type] = (summary.byType[notification.type] ?? 0) + 1;
    summary.bySeverity[notification.severity] = (summary.bySeverity[notification.severity] ?? 0) + 1;
  }

  return summary;
}

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    let notifications = await buildNotificationsForUser(currentUser);
    const { type, severity, unreadOnly, limit } = req.query;

    if (type) {
      notifications = notifications.filter((notification) => notification.type === String(type));
    }

    if (severity) {
      notifications = notifications.filter((notification) => notification.severity === String(severity));
    }

    if (String(unreadOnly) === 'true') {
      notifications = notifications.filter((notification) => !notification.read);
    }

    const total = notifications.length;
    const parsedLimit = Number(limit);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      notifications = notifications.slice(0, parsedLimit);
    }

    return res.json({
      data: notifications,
      total,
      unread: notifications.filter((notification) => !notification.read).length,
    });
  } catch (error) {
    console.error('GET /api/notifications failed', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des notifications' });
  }
});

app.get('/api/notifications/summary', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    return res.json(buildNotificationSummary(await buildNotificationsForUser(currentUser)));
  } catch (error) {
    console.error('GET /api/notifications/summary failed', error);
    return res.status(500).json({ message: 'Erreur lors du chargement du résumé des notifications' });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    const unreadNotifications = (await buildNotificationsForUser(currentUser)).filter((notification) => !notification.read);

    await markNotificationsAsRead(
      currentUser.id,
      unreadNotifications.map((notification) => notification.id),
    );

    return res.json({
      updated: unreadNotifications.length,
      summary: buildNotificationSummary(await buildNotificationsForUser(currentUser)),
    });
  } catch (error) {
    console.error('PUT /api/notifications/read-all failed', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour des notifications' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    const notificationId = String(req.params.id);
    const notification = (await buildNotificationsForUser(currentUser)).find((item) => item.id === notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    await markNotificationAsRead(currentUser.id, notificationId);

    return res.json({ ...notification, read: true });
  } catch (error) {
    console.error('PUT /api/notifications/:id/read failed', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la notification' });
  }
});

// ==================== GRM PLAINTES ROUTES (CRUD complet) ====================

app.post('/api/grm/plaintes', authenticateToken, (req, res) => {
  const newPlainte = {
    id: plaintes.length + 1,
    numero_plainte: `PL-${new Date().getFullYear()}-${String(plaintes.length + 1).padStart(3, '0')}`,
    ...req.body,
    date_reception: new Date().toISOString(),
    statut: 'recue',
  };
  plaintes.push(newPlainte);
  res.status(201).json(newPlainte);
});

app.put('/api/grm/plaintes/:id', authenticateToken, (req, res) => {
  const index = plaintes.findIndex(p => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Plainte non trouvée' });
  plaintes[index] = { ...plaintes[index], ...req.body };
  res.json(plaintes[index]);
});

app.delete('/api/grm/plaintes/:id', authenticateToken, (req, res) => {
  const index = plaintes.findIndex(p => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Plainte non trouvée' });
  plaintes.splice(index, 1);
  res.json({ message: 'Plainte supprimée' });
});

// ==================== CALCULATEUR ROUTES ====================

const calculateurHistorique: unknown[] = [];

app.get('/api/calculateur/indicateurs', authenticateToken, (_req, res) => {
  const indicateurs = [...iodpIndicateurs, ...irIndicateurs].map(ind => ({
    id: ind.id,
    code: ind.code,
    nom: ind.nom,
    description: ind.description,
    formule: ind.formule,
    unite: ind.unite,
    frequence: ind.frequence,
    type: ind.est_iodp ? 'iodp' : 'ir',
    composante: ind.id_composante === 1 ? 'Productivité agricole' : ind.id_composante === 2 ? 'Accès au marché' : 'Services publics agricoles',
    cible: ind.cible,
    champs: getChampsPourIndicateur(ind.code),
  }));
  res.json(indicateurs);
});

function getChampsPourIndicateur(code: string) {
  const champsMap: Record<string, { id: string; label: string; type: string; required: boolean }[]> = {
    'IODP1.1': [{ id: 'surplus_t', label: 'Surplus vendu année t (kg)', type: 'number', required: true }, { id: 'surplus_t0', label: 'Surplus vendu année référence (kg)', type: 'number', required: true }],
    'IODP2.1': [{ id: 'nouveaux', label: 'Nouveaux adoptants cette année', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul des années précédentes', type: 'number', required: true }],
    'IODP2.2': [{ id: 'femmes_t', label: 'Nouvelles femmes adoptantes', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul périodes précédentes', type: 'number', required: true }],
    'IODP2.3': [{ id: 'rendement_t', label: 'Rendement maïs année t (kg/ha)', type: 'number', required: true }, { id: 'rendement_t0', label: 'Rendement maïs année référence (kg/ha)', type: 'number', required: true }],
    'IODP2.4': [{ id: 'rendement_t', label: 'Rendement manioc année t (kg/ha)', type: 'number', required: true }, { id: 'rendement_t0', label: 'Rendement manioc année référence (kg/ha)', type: 'number', required: true }],
    'IODP2.5': [{ id: 'rendement_t', label: "Rendement arachide année t (kg/ha)", type: 'number', required: true }, { id: 'rendement_t0', label: "Rendement arachide année référence (kg/ha)", type: 'number', required: true }],
    'IODP2.6': [{ id: 'taux_t', label: 'Taux mortalité année t (%)', type: 'number', required: true }, { id: 'taux_t0', label: 'Taux mortalité année référence (%)', type: 'number', required: true }],
    'IR1.1.1': [{ id: 'nouveaux', label: 'Nouveaux bénéficiaires cette période', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul des périodes précédentes', type: 'number', required: true }],
    'IR2.1.1': [{ id: 'routes_nationales', label: 'Routes nationales (km)', type: 'number', required: true }, { id: 'routes_provinciales', label: 'Routes provinciales (km)', type: 'number', required: true }, { id: 'routes_desserte', label: 'Routes de desserte (km)', type: 'number', required: true }],
    'IR3.1.4': [{ id: 'traitees_delai', label: 'Plaintes traitées dans les délais', type: 'number', required: true }, { id: 'recues', label: 'Plaintes reçues', type: 'number', required: true }],
    'IR3.1.7': [{ id: 'satisfaits', label: 'Fermiers satisfaits', type: 'number', required: true }, { id: 'total_adoptants', label: 'Total fermiers ayant adopté', type: 'number', required: true }],
  };
  return champsMap[code] || [{ id: 'valeur', label: 'Valeur', type: 'number', required: true }];
}

app.post('/api/calculateur/calculer/:code', authenticateToken, (req, res) => {
  const { code } = req.params;
  const donnees = req.body;
  const indicateur = [...iodpIndicateurs, ...irIndicateurs].find(i => i.code === code);
  if (!indicateur) return res.status(404).json({ message: 'Indicateur non trouvé' });

  let valeur = 0;
  let interpretation = '';
  switch (code) {
    case 'IODP1.1': valeur = ((donnees.surplus_t / donnees.surplus_t0) - 1) * 100; interpretation = `Hausse de ${valeur.toFixed(1)}% des ventes`; break;
    case 'IODP2.1': valeur = donnees.nouveaux + donnees.cumul_anterieur; interpretation = `Total cumulé: ${valeur.toLocaleString()} exploitants`; break;
    case 'IODP2.3': valeur = ((donnees.rendement_t - donnees.rendement_t0) / donnees.rendement_t0) * 100; interpretation = `Hausse de ${valeur.toFixed(1)}% du rendement maïs`; break;
    case 'IODP2.4': valeur = ((donnees.rendement_t - donnees.rendement_t0) / donnees.rendement_t0) * 100; interpretation = `Hausse de ${valeur.toFixed(1)}% du rendement manioc`; break;
    case 'IODP2.6': valeur = (1 - (donnees.taux_t / donnees.taux_t0)) * 100; interpretation = `Réduction de ${valeur.toFixed(1)}% de la mortalité`; break;
    case 'IR1.1.1': valeur = donnees.nouveaux + donnees.cumul_anterieur; interpretation = `${valeur.toLocaleString()} bénéficiaires atteints`; break;
    case 'IR2.1.1': valeur = donnees.routes_nationales + donnees.routes_provinciales + donnees.routes_desserte; interpretation = `${valeur} km de routes réhabilitées`; break;
    case 'IR3.1.4': valeur = (donnees.traitees_delai / donnees.recues) * 100; interpretation = `${valeur.toFixed(1)}% des plaintes traitées dans les délais`; break;
    case 'IR3.1.7': valeur = (donnees.satisfaits / donnees.total_adoptants) * 100; interpretation = `${valeur.toFixed(1)}% des fermiers satisfaits`; break;
    default: valeur = donnees.valeur || 0; interpretation = 'Valeur enregistrée';
  }
  valeur = Math.round(valeur * 10) / 10;
  const progression = indicateur.cible > 0 ? Math.min((valeur / indicateur.cible) * 100, 150) : undefined;
  const result = { valeur, unite: indicateur.unite, progression, cible: indicateur.cible, interpretation, recommandations: progression && progression < 50 ? ['Intensifier les efforts sur le terrain', 'Revoir la stratégie de mise en œuvre'] : [] };
  calculateurHistorique.unshift({ ...result, code, nom: indicateur.nom, date: new Date().toISOString() });
  res.json(result);
});

app.get('/api/calculateur/historique', authenticateToken, (_req, res) => {
  res.json(calculateurHistorique.slice(0, 50));
});

// ==================== OT (OPÉRATEURS TECHNIQUES) ROUTES ====================

const otActivites = [
  { id: 1, type: 'formation', titre: 'Formation agriculteurs AIC - Village Masi', statut: 'terminee', province: 'Kwilu', beneficiaires: 45, date: '2026-03-28' },
  { id: 2, type: 'enquete', titre: 'Distribution semences maïs hybride', statut: 'en_cours', province: 'Kasaï', beneficiaires: 120, date: '2026-04-01' },
  { id: 3, type: 'suivi', titre: 'Collecte données RNA - Enregistrement', statut: 'planifiee', province: 'Haut-Lomami', beneficiaires: 0, date: '2026-04-05' },
];

const otEquipiers = [
  { id: 1, nom: 'LUKUSA Jean', role: 'Superviseur', province: 'Kwilu', statut: 'Actif', activites_menees: 12 },
  { id: 2, nom: 'KITENGE Marie', role: 'Agent terrain', province: 'Kasaï', statut: 'Actif', activites_menees: 8 },
  { id: 3, nom: 'MBUYI Paul', role: 'Agent terrain', province: 'Haut-Lomami', statut: 'Actif', activites_menees: 6 },
];

const otRapports = [
  { id: 1, mois: 'Mars 2026', province: 'Kwilu', activites_realisees: 8, beneficiaires_atteints: 1240, taux_execution: 92, soumis: true, date_soumission: '2026-03-31' },
  { id: 2, mois: 'Février 2026', province: 'Kwilu', activites_realisees: 6, beneficiaires_atteints: 980, taux_execution: 78, soumis: true, date_soumission: '2026-02-28' },
];

app.get('/api/ot/data', authenticateToken, (_req, res) => {
  res.json({
    id: 'ot-001',
    nom: 'Opérateur Technique Principal',
    sigle: 'OTP',
    region: 'National',
    provinces: ['Kwilu', 'Kongo Central', 'Kinshasa', 'Kasaï'],
    responsable: { nom: 'Jean-Pierre KABEYA', email: 'jp.kabeya@otp.cd', telephone: '+243812345678' },
    equipes: { total: otEquipiers.length, superviseurs: 4, enqueteurs: 15, techniciens: 5 },
    performances: { taux_realisation: 78, taux_satisfaction: 85, qualite_donnees: 92, ponctualite: 88 },
    activites: {
      enquetes_realisees: otActivites.filter((a: any) => a.type === 'enquete').length,
      formations_dispensees: otActivites.filter((a: any) => a.type === 'formation').length,
      suivis_effectues: otActivites.filter((a: any) => a.type === 'suivi').length,
      plaintes_traitees: otActivites.filter((a: any) => a.type === 'plainte').length,
    },
    indicateurs: { production: 76, adoption: 68, satisfaction: 85 },
    objectifs: {
      enquetes: { realises: otActivites.filter((a: any) => a.type === 'enquete').length, cible: 1600 },
      formations: { realises: otActivites.filter((a: any) => a.type === 'formation').length, cible: 40 },
      suivis: { realises: otActivites.filter((a: any) => a.type === 'suivi').length, cible: 200 },
    },
    zones: [
      { province: 'Kwilu', territoire: 'Idiofa', villages: 45, enquetes: 320 },
      { province: 'Kwilu', territoire: 'Gungu', villages: 38, enquetes: 280 },
      { province: 'Kongo Central', territoire: 'Kimvula', villages: 29, enquetes: 210 },
      { province: 'Kasaï', territoire: 'Tshikapa', villages: 52, enquetes: 390 },
    ],
    dernier_rapport: otRapports.filter(r => r.soumis).sort((a, b) => b.id - a.id)[0]?.date_soumission ?? '2026-02-28',
    dernier_suivi: '2026-03-28',
  });
});

app.get('/api/ot/activites', authenticateToken, (req, res) => {
  const { province, statut } = req.query;
  let filtered = [...otActivites];
  if (province) filtered = filtered.filter(a => a.province === province);
  if (statut) filtered = filtered.filter(a => a.statut === statut);
  res.json({ data: filtered, total: filtered.length });
});

app.get('/api/ot/equipiers', authenticateToken, (_req, res) => {
  res.json({ data: otEquipiers, total: otEquipiers.length });
});

app.get('/api/ot/rapports', authenticateToken, (_req, res) => {
  res.json(otRapports);
});

app.post('/api/ot/rapports', authenticateToken, (req, res) => {
  const newRapport = { id: otRapports.length + 1, ...req.body, soumis: true, date_soumission: new Date().toISOString().split('T')[0] };
  otRapports.push(newRapport);
  res.status(201).json(newRapport);
});

app.put('/api/ot/activites/:id', authenticateToken, (req, res) => {
  const index = otActivites.findIndex(a => a.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Activité non trouvée' });
  otActivites[index] = { ...otActivites[index], ...req.body };
  res.json(otActivites[index]);
});

app.post('/api/ot/activites', authenticateToken, (req, res) => {
  const newActivite = { id: otActivites.length + 1, ...req.body, beneficiaires: 0 };
  otActivites.push(newActivite);
  res.status(201).json(newActivite);
});

// ==================== DATABASE VIEWS ====================

app.get('/api/database/beneficiaires', authenticateToken, (req, res) => {
  const { search, province, sexe, type_exploitant, page = 0, limit = 10 } = req.query;
  let filtered = [...beneficiaires];
  if (search) { const s = String(search).toLowerCase(); filtered = filtered.filter(b => b.nom.toLowerCase().includes(s) || b.prenom.toLowerCase().includes(s) || b.rna_id.toLowerCase().includes(s)); }
  if (province) filtered = filtered.filter(b => b.province === province);
  if (sexe) filtered = filtered.filter(b => b.sexe === sexe);
  if (type_exploitant) filtered = filtered.filter(b => b.type_exploitant === type_exploitant);
  const start = Number(page) * Number(limit);
  res.json({ data: filtered.slice(start, start + Number(limit)), total: filtered.length, page: Number(page), totalPages: Math.ceil(filtered.length / Number(limit)) });
});

app.get('/api/database/beneficiaires/stats', authenticateToken, (_req, res) => {
  res.json({
    total: 124530,
    par_sexe: { femmes: 56038, hommes: 68492 },
    par_type: { agriculteur: 58420, eleveur: 31180, pisciculteur: 14230, mixte: 20700 },
    par_province: { Kinshasa: 21450, 'Kongo Central': 22180, Kwilu: 19870, Kasaï: 24130, 'Haut-Lomami': 18640, Tanganyika: 18260 },
    par_age: { jeunes: 42340, adultes: 68190, seniors: 14000 },
    par_instruction: { aucun: 18420, primaire: 45230, secondaire: 48760, superieur: 12120 },
    par_technologies: { semences_ameliorees: 72450, engrais_organiques: 61230, irrigation: 28340, mecanisation: 15670 },
    evolution_mensuelle: [
      { mois: 'Oct', total: 98200 },
      { mois: 'Nov', total: 104500 },
      { mois: 'Déc', total: 109800 },
      { mois: 'Jan', total: 113200 },
      { mois: 'Fév', total: 118900 },
      { mois: 'Mar', total: 124530 },
    ],
  });
});

app.get('/api/indicateurs-database', authenticateToken, (req, res) => {
  const { search, type, composante, page = 0, limit = 10 } = req.query;
  let all = [...iodpIndicateurs, ...irIndicateurs];
  if (search) { const s = String(search).toLowerCase(); all = all.filter(i => i.nom.toLowerCase().includes(s) || i.code.toLowerCase().includes(s)); }
  if (type === 'iodp') all = all.filter(i => i.est_iodp);
  if (type === 'ir') all = all.filter(i => !i.est_iodp);
  const start = Number(page) * Number(limit);
  res.json({ data: all.slice(start, start + Number(limit)), total: all.length, page: Number(page), totalPages: Math.ceil(all.length / Number(limit)) });
});

app.get('/api/indicateurs-database/stats', authenticateToken, (_req, res) => {
  res.json({ total: iodpIndicateurs.length + irIndicateurs.length, iodp: iodpIndicateurs.length, ir: irIndicateurs.length, taux_moyen: Math.round([...iodpIndicateurs, ...irIndicateurs].reduce((s, i) => s + i.progression, 0) / (iodpIndicateurs.length + irIndicateurs.length)) });
});

app.put('/api/indicateurs-database/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  let idx = iodpIndicateurs.findIndex(i => i.id === id);
  if (idx !== -1) { iodpIndicateurs[idx] = { ...iodpIndicateurs[idx], ...req.body }; return res.json(iodpIndicateurs[idx]); }
  idx = irIndicateurs.findIndex(i => i.id === id);
  if (idx !== -1) { irIndicateurs[idx] = { ...irIndicateurs[idx], ...req.body }; return res.json(irIndicateurs[idx]); }
  res.status(404).json({ message: 'Indicateur non trouvé' });
});

// ==================== SUIVI MISSIONS T4 2025 ====================

const suiviMissionsData = [
  // ===== KASAÏ — Section 1: Missions routine =====
  { id: 1, num: '1.1', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Accompagnement Assistant SG Agriculture à Mweka', objectif: 'Conduire le véhicule', horsProjet: 1, projet: 1, montantUSD: 706, dates: '02–05 oct 2025', avanceUSD: 706, solde: 0, province: 'Kasaï' },
  { id: 2, num: '1.2', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Distribution semences mucuna', objectif: 'Déposer les semences', horsProjet: 0, projet: 2, montantUSD: 0, dates: '01 oct 2025', avanceUSD: 0, solde: 0, province: 'Kasaï' },
  { id: 3, num: '1.3', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Appui UPEP Kwilu (gestion financière)', objectif: 'Appuyer UPEP', horsProjet: 0, projet: 1, montantUSD: 877, dates: '03–09 oct 2025', avanceUSD: 724, solde: 153, province: 'Kasaï' },
  { id: 4, num: '1.4', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Accompagnement comptable Kwilu', objectif: 'Conduire comptable + récupérer semences', horsProjet: 0, projet: 1, montantUSD: 410, dates: '03–04 oct 2025', avanceUSD: 370, solde: 40, province: 'Kasaï' },
  { id: 5, num: '1.5', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Enquête production agricole Tshikapa', objectif: 'Superviser enquête', horsProjet: 0, projet: 2, montantUSD: 7102, dates: '06–12 oct 2025', avanceUSD: 5504, solde: 1598, province: 'Kasaï' },
  { id: 6, num: '1.6', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Appui campagne agricole A 2025', objectif: 'Appuyer campagne', horsProjet: 1, projet: 0, montantUSD: 905, dates: '17–25 sept 2025', avanceUSD: 905, solde: 0, province: 'Kasaï' },
  { id: 7, num: '1.7', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Récupération comptable Kwilu', objectif: 'Récupérer comptable', horsProjet: 0, projet: 1, montantUSD: 561, dates: '08–09 oct 2025', avanceUSD: 379, solde: 182, province: 'Kasaï' },
  { id: 8, num: '1.8', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Remise à niveau CPM Banque mondiale', objectif: 'Formation STEP + contrats', horsProjet: 0, projet: 1, montantUSD: 1958, dates: '17–24 oct 2025', avanceUSD: 1382, solde: 576, province: 'Kasaï' },
  { id: 9, num: '1.9', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Accompagnement CPM Kikwit', objectif: 'Conduire CPM', horsProjet: 0, projet: 1, montantUSD: 200, dates: '17–18 oct 2025', avanceUSD: 160, solde: 40, province: 'Kasaï' },
  { id: 10, num: '1.10', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Briefing + installation CGP Mweka', objectif: 'Installer CGP', horsProjet: 0, projet: 2, montantUSD: 8525, dates: '17–23 oct 2025', avanceUSD: 8163, solde: 362, province: 'Kasaï' },
  { id: 11, num: '1.11', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Briefing + installation CGP Luebo', objectif: 'Installer CGP', horsProjet: 0, projet: 2, montantUSD: 8163, dates: '17–23 oct 2025', avanceUSD: 7801, solde: 362, province: 'Kasaï' },
  { id: 12, num: '1.12', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Briefing + installation CGP Tshikapa', objectif: 'Installer CGP', horsProjet: 0, projet: 4, montantUSD: 5975, dates: '29 oct–05 nov 2025', avanceUSD: 5975, solde: 0, province: 'Kasaï' },
  { id: 13, num: '1.13', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Récupération semences FAO Kikwit', objectif: 'Récupérer semences', horsProjet: 0, projet: 1, montantUSD: 734, dates: '12–13 oct 2025', avanceUSD: 734, solde: 0, province: 'Kasaï' },
  { id: 14, num: '1.14', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Mise à niveau communication (webmastering)', objectif: 'Formation communication', horsProjet: 0, projet: 2, montantUSD: 6909, dates: '19–27 oct 2025', avanceUSD: 6436, solde: 473, province: 'Kasaï' },
  { id: 15, num: '1.15', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Appui UPEP Kwilu', objectif: 'Appuyer UPEP', horsProjet: 0, projet: 1, montantUSD: 731, dates: '19–24 oct 2025', avanceUSD: 611, solde: 120, province: 'Kasaï' },
  { id: 16, num: '1.16', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Appui fonctionnement KWILU', objectif: 'Appuyer activités', horsProjet: 0, projet: 2, montantUSD: 877, dates: '02–05 nov 2025', avanceUSD: 724, solde: 153, province: 'Kasaï' },
  { id: 17, num: '1.17', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Visite agrimultiplicateur', objectif: 'Déposer semences', horsProjet: 0, projet: 2, montantUSD: 0, dates: '04 nov 2025', avanceUSD: 0, solde: 0, province: 'Kasaï' },
  { id: 18, num: '1.18', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Suivi réparation véhicules Kikwit', objectif: 'Suivre réparation', horsProjet: 0, projet: 2, montantUSD: 915, dates: '06–10 nov 2025', avanceUSD: 642, solde: 273, province: 'Kasaï' },
  { id: 19, num: '1.19', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Supervision technique Tshikapa', objectif: 'Supervision', horsProjet: 1, projet: 0, montantUSD: 575, dates: '16–18 nov 2025', avanceUSD: 0, solde: 0, province: 'Kasaï' },
  { id: 20, num: '1.20', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Participation Revue Mi-Parcours', objectif: '', horsProjet: 0, projet: 4, montantUSD: 8056, dates: '17–24 oct 2025', avanceUSD: 0, solde: 0, province: 'Kasaï' },
  { id: 21, num: '1.21', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Captage histoires à succès', objectif: 'Capturer histoires + réunions', horsProjet: 0, projet: 3, montantUSD: 7512, dates: '07 nov 2025', avanceUSD: 6595, solde: 917, province: 'Kasaï' },
  { id: 22, num: '1.22', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Accompagnement comptable Kikwit', objectif: 'Accompagner comptable', horsProjet: 0, projet: 1, montantUSD: 200, dates: '28–29 nov 2025', avanceUSD: 160, solde: 40, province: 'Kasaï' },
  { id: 23, num: '1.23', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Appui UPEP Kwilu', objectif: 'Appuyer UPEP', horsProjet: 0, projet: 1, montantUSD: 2028, dates: '04–10 déc 2025', avanceUSD: 1142, solde: 886, province: 'Kasaï' },
  { id: 24, num: '1.24', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Atelier restitution APS BETRA/WEST', objectif: 'Participer atelier', horsProjet: 0, projet: 1, montantUSD: 1059, dates: '09–14 déc 2025', avanceUSD: 862, solde: 197, province: 'Kasaï' },
  { id: 25, num: '1.25', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Accompagnement ETGC Kikwit', objectif: 'Conduire véhicule', horsProjet: 0, projet: 1, montantUSD: 392, dates: '09–10 déc 2025', avanceUSD: 352, solde: 40, province: 'Kasaï' },
  { id: 26, num: '1.26', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Suivi réparation véhicules Kikwit', objectif: 'Suivre réparation', horsProjet: 0, projet: 1, montantUSD: 498, dates: '09–10 déc 2025', avanceUSD: 498, solde: 0, province: 'Kasaï' },
  { id: 27, num: '1.27', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Récupération comptable + véhicule Kwilu', objectif: 'Récupérer comptable + véhicule', horsProjet: 0, projet: 2, montantUSD: 533, dates: '12–14 déc 2025', avanceUSD: 465, solde: 68, province: 'Kasaï' },
  { id: 28, num: '1.28', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Mission conjointe UNOPS/AGETIP', objectif: 'Reconnaissance axes routiers', horsProjet: 0, projet: 2, montantUSD: 1685, dates: '21–24 déc 2025', avanceUSD: 1348, solde: 337, province: 'Kasaï' },
  // Kasaï — Section 3: Ateliers
  { id: 29, num: '3.1', section: 3, sectionLabel: 'Ateliers', natureMission: 'Atelier restitution EIES Kamonia', objectif: 'Participer atelier', horsProjet: 0, projet: 4, montantUSD: 800, dates: '18–19 nov 2025', avanceUSD: 640, solde: 160, province: 'Kasaï' },

  // ===== KASAÏ CENTRAL — Section 2: Implémentation =====
  { id: 30, num: '2.1', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Supervision & accompagnement enquête PEA (Demba, Dibaya)', objectif: 'Enquêter bénéficiaires PNDA (B-2024, A-2024, B-2025)', horsProjet: 16, projet: 1, montantUSD: 9493, dates: '12 oct 2025', avanceUSD: 9493, solde: 0, province: 'Kasaï Central' },
  { id: 31, num: '2.2', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Déploiement semences mucuna (Demba, Luiza)', objectif: 'Appui adoption agriculture intelligente', horsProjet: 3, projet: 2, montantUSD: 1638, dates: '15 oct 2025', avanceUSD: 1638, solde: 0, province: 'Kasaï Central' },
  { id: 32, num: '2.3', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Briefing CGP sur MGP (Luiza, Dibaya, Demba)', objectif: 'Renforcement capacités CGP', horsProjet: 214, projet: 2, montantUSD: 24697, dates: '16 oct 2025', avanceUSD: 24697, solde: 0, province: 'Kasaï Central' },
  { id: 33, num: '2.4', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Évaluation boutures manioc FAO/INERA Ngandajika', objectif: 'Augmenter production manioc', horsProjet: 0, projet: 2, montantUSD: 3255, dates: '17 oct 2025', avanceUSD: 3255, solde: 0, province: 'Kasaï Central' },
  { id: 34, num: '2.5', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Supervision vente semences (Luiza, Dibaya, Demba)', objectif: 'Suivi achats/ventes semences', horsProjet: 0, projet: 1, montantUSD: 298, dates: '20 oct 2025', avanceUSD: 298, solde: 0, province: 'Kasaï Central' },
  { id: 35, num: '2.6', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Formation sécurité routière', objectif: 'Renforcer capacités utilisateurs engins roulants', horsProjet: 31, projet: 6, montantUSD: 2286, dates: '27 oct 2025', avanceUSD: 2286, solde: 0, province: 'Kasaï Central' },
  { id: 36, num: '2.7', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Suivi mise en œuvre PNDA (Hinterland Kananga)', objectif: 'Suivi activités PNDA', horsProjet: 0, projet: 4, montantUSD: 2650, dates: '04 nov 2025', avanceUSD: 2650, solde: 0, province: 'Kasaï Central' },
  { id: 37, num: '2.8', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Formation mise à niveau animateurs webmastering (UNCP)', objectif: 'Renforcement capacités communication', horsProjet: 0, projet: 1, montantUSD: 1331, dates: '21 oct 2025', avanceUSD: 1331, solde: 0, province: 'Kasaï Central' },
  { id: 38, num: '2.9', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Participation revue à mi-parcours (UNCP)', objectif: 'Participation revue PNDA', horsProjet: 0, projet: 4, montantUSD: 11201, dates: '23 nov 2025', avanceUSD: 11201, solde: 0, province: 'Kasaï Central' },
  { id: 39, num: '2.10', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Livraison boutures manioc aux AVEC', objectif: 'Appui champs semenciers communautaires', horsProjet: 3, projet: 3, montantUSD: 13995, dates: '05 nov 2025', avanceUSD: 13995, solde: 0, province: 'Kasaï Central' },
  { id: 40, num: '2.11', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Production capsules histoires de succès', objectif: 'Élaboration histoires de succès PNDA', horsProjet: 0, projet: 1, montantUSD: 1700, dates: '15 nov 2025', avanceUSD: 1700, solde: 0, province: 'Kasaï Central' },
  { id: 41, num: '2.12', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Participation atelier validation PTBA/Kikwit', objectif: 'Validation PTBA', horsProjet: 0, projet: 4, montantUSD: 2150, dates: '20 déc 2025', avanceUSD: 2150, solde: 0, province: 'Kasaï Central' },

  // ===== KWILU — Section 2: Implémentation =====
  { id: 42, num: '2.1', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Collecte données enquêtes production PEA', horsProjet: 20, projet: 3, montantUSD: 10162, dates: '03–12 oct 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 43, num: '2.2', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Suivi contentieux campagne agricole A2025 (Gungu)', horsProjet: 0, projet: 3, montantUSD: 1002, dates: '07–09 oct 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 44, num: '2.3', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Sensibilisation + supervision campagne A & vente mucuna', horsProjet: 0, projet: 2, montantUSD: 3839, dates: '', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 45, num: '2.4', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Appui & supervision commercialisation boutures manioc/mucuna/maïs (Bulungu, Gungu, Idiofa)', horsProjet: 1, projet: 6, montantUSD: 5934, dates: '14–21 oct 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 46, num: '2.5', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Appui logistique distribution carburant & huile moteur', horsProjet: 0, projet: 2, montantUSD: 1805, dates: '26 nov–01 déc 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 47, num: '2.6', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Appui fonctionnement UPEP Kwilu (paiement AC)', horsProjet: 0, projet: 2, montantUSD: 1128, dates: '24–28 nov 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 48, num: '2.7', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Briefing & installation CGP', horsProjet: 0, projet: 2, montantUSD: 0, dates: '17 sept–16 oct 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 49, num: '2.8', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Collecte & production histoires à succès (3 territoires)', horsProjet: 1, projet: 2, montantUSD: 1060, dates: '17–20 nov 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 50, num: '2.9', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Suivi fonctionnement CGP dans les territoires', horsProjet: 0, projet: 2, montantUSD: 3191, dates: '11–22 nov 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 51, num: '2.10', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Missions FACT 9/8 – entretien véhicules INERA & pêche/élevage', horsProjet: 2, projet: 0, montantUSD: 875, dates: '24–25 déc 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 52, num: '2.11', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Installation parcs à bois + vente boutures fortifiées', horsProjet: 4, projet: 2, montantUSD: 5714, dates: '10–27 déc 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 53, num: '2.12', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Distribution matériels aratoires aux OP', horsProjet: 0, projet: 4, montantUSD: 1978, dates: '19–24 déc 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  // Kwilu — Section 3: Ateliers & Formations
  { id: 54, num: '3.1', section: 3, sectionLabel: 'Ateliers', natureMission: 'Atelier / Réunion supervision & revue', objectif: 'Participation supervision & revue mi-parcours PNDA (Kinshasa)', horsProjet: 0, projet: 6, montantUSD: 9291, dates: '23–30 nov 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 55, num: '3.2', section: 3, sectionLabel: 'Ateliers', natureMission: 'Atelier de restitution', objectif: 'Restitution APS BETRA/WEST (Kinshasa)', horsProjet: 0, projet: 2, montantUSD: 632, dates: '10–13 déc 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 56, num: '3.3', section: 3, sectionLabel: 'Ateliers', natureMission: 'Formation', objectif: 'Remise à niveau en webmastering (communication)', horsProjet: 0, projet: 2, montantUSD: 2320, dates: '21–24 oct 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
  { id: 57, num: '3.4', section: 3, sectionLabel: 'Ateliers', natureMission: 'Formation', objectif: 'Remise à niveau en passation de marchés (STEP & contrats)', horsProjet: 0, projet: 2, montantUSD: 1341, dates: '19–24 oct 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },

  // ===== UNCP — Section 2: Implémentation =====
  { id: 58, num: '2.1', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Atelier formation prévention & sécurité routière (Kananga)', objectif: 'Former les utilisateurs des engins roulants', horsProjet: 25, projet: 9, montantUSD: 3732, dates: '24/09–05/10 2025', avanceUSD: 3420, solde: 0, province: 'UNCP' },
  { id: 59, num: '2.2', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Enquête production PNDA (Kwilu, Kasaï Central, Kasaï)', objectif: 'Collecte données indicateurs ODP PNDA', horsProjet: 44, projet: 3, montantUSD: 30800, dates: '01–15 oct 2025', avanceUSD: 0, solde: 0, province: 'UNCP' },
  { id: 60, num: '2.3', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Participation ateliers restitution EIES (Kananga)', objectif: 'Participer à la restitution des EIES', horsProjet: 50, projet: 6, montantUSD: 788, dates: '26–30 oct 2025', avanceUSD: 526, solde: 0, province: 'UNCP' },
  { id: 61, num: '2.4', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Enquête production PNDA (répétition ligne 2.2)', objectif: 'Collecte données indicateurs ODP PNDA', horsProjet: 44, projet: 3, montantUSD: 30800, dates: '01–15 oct 2025', avanceUSD: 0, solde: 0, province: 'UNCP' },
  { id: 62, num: '2.5', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Appui technique terrain – préparation supervision', objectif: 'Appuyer consultant pour rapport mi-parcours', horsProjet: 1, projet: 1, montantUSD: 4341, dates: '04–11 nov 2025', avanceUSD: 935, solde: 0, province: 'UNCP' },
  { id: 63, num: '2.6', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Appui technique – préparation supervision conjointe', objectif: 'Appui organisation matérielle mission technique', horsProjet: 4, projet: 6, montantUSD: 13743, dates: '13–19 nov 2025', avanceUSD: 0, solde: 0, province: 'UNCP' },
  { id: 64, num: '2.7', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Supervision terrain Kikwit & Kasaï', objectif: 'Accompagner TTL & vérifier aspects environnementaux', horsProjet: 3, projet: 3, montantUSD: 3820, dates: '30/11–05/12 2025', avanceUSD: 3055, solde: 0, province: 'UNCP' },
  { id: 65, num: '2.8', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Remise officielle motos – Kongo Central', objectif: "Renforcer capacités agents de l'État", horsProjet: 45, projet: 4, montantUSD: 6318, dates: '16–19 déc 2025', avanceUSD: 0, solde: 0, province: 'UNCP' },
  { id: 66, num: '2.9', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Examen & validation PTBA 2026 (COPIL)', objectif: 'Examiner & approuver PTBA avant transmission au bailleur', horsProjet: 92, projet: 22, montantUSD: 49979, dates: '21–24 déc 2026', avanceUSD: 0, solde: 0, province: 'UNCP' },
  // UNCP — Section 3: Atelier
  { id: 67, num: '8.1', section: 3, sectionLabel: 'Ateliers', natureMission: 'Atelier revue à mi-parcours (Kinshasa)', objectif: 'Participer à la revue à mi-parcours du PNDA', horsProjet: 45, projet: 28, montantUSD: 2252, dates: '24–28 nov 2025', avanceUSD: 1802, solde: 0, province: 'UNCP' },
];

app.get('/api/suivi/missions', authenticateToken, (req: express.Request, res: express.Response) => {
  const { province } = req.query;
  const data = province && typeof province === 'string'
    ? suiviMissionsData.filter(m => m.province === province)
    : suiviMissionsData;
  res.json(data);
});

app.get('/api/suivi/stats', authenticateToken, (_req: express.Request, res: express.Response) => {
  const provinces = ['Kasaï', 'Kasaï Central', 'Kwilu', 'UNCP'];
  const parProvince: Record<string, { missions: number; montant: number; avances: number; solde: number }> = {};
  for (const prov of provinces) {
    const ms = suiviMissionsData.filter(m => m.province === prov);
    parProvince[prov] = {
      missions: ms.length,
      montant: ms.reduce((s, m) => s + m.montantUSD, 0),
      avances: ms.reduce((s, m) => s + m.avanceUSD, 0),
      solde: ms.reduce((s, m) => s + m.solde, 0),
    };
  }
  res.json({
    totalMissions: suiviMissionsData.length,
    totalMontant: suiviMissionsData.reduce((s, m) => s + m.montantUSD, 0),
    totalAvances: suiviMissionsData.reduce((s, m) => s + m.avanceUSD, 0),
    totalSolde: suiviMissionsData.reduce((s, m) => s + m.solde, 0),
    parProvince,
  });
});

// ==================== DÉMARRAGE DU SERVEUR ====================

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📊 API PNDA opérationnelle`);
  console.log(`🔐 Comptes de test:`);
  console.log(`   - admin@pnda.cd / admin123`);
  console.log(`   - uncp@pnda.cd / uncp123`);
  console.log(`   - upep@pnda.cd / upep123`);
});

export default app;