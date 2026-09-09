/**
 * Acces aux donnees : Aide et documentation.
 *
 * Extrait de db.ts sans modification des requetes ni des traitements.
 */
import { getDbPool } from './core';
import { toDateOnly } from './helpers';
import type { CountRow, RowDataPacket } from './types';

let aideTablesReady: Promise<void> | null = null;

// ==================== AIDE / DOCUMENTATION ====================

export interface SqlArticleAide {
  id: number;
  titre: string;
  contenu: string;
  categorie: 'guide' | 'faq' | 'tutoriel' | 'support';
  tags: string[];
  date_creation: string;
  date_modification: string;
  auteur: string;
}

export interface SqlFAQ {
  id: number;
  question: string;
  reponse: string;
  categorie: string;
  popularite: number;
}

export interface SqlTutoriel {
  id: number;
  titre: string;
  description: string;
  duree: string;
  niveau: 'debutant' | 'intermediaire' | 'avance';
  video_url?: string;
  etapes: Array<{ titre: string; description: string }>;
}

export interface SqlContactSupport {
  email: string;
  telephone: string;
  horaires: string;
  urgence: string;
}

const AIDE_ARTICLE_SEED = [
  { titre: "Manuel d'utilisation du système PNDA S&E", contenu: 'Guide complet pour prendre en main le système...', categorie: 'guide', tags: ['débutant', 'général'], auteur: 'UNCP' },
  { titre: 'Guide de collecte de données terrain', contenu: 'Procédures pour la collecte des données...', categorie: 'guide', tags: ['collecte', 'terrain'], auteur: 'UNCP' },
  { titre: "Guide d'utilisation du calculateur d'indicateurs", contenu: "Comment utiliser le calculateur d'indicateurs...", categorie: 'guide', tags: ['indicateurs', 'calcul'], auteur: 'UNCP' },
];

const AIDE_FAQ_SEED = [
  { question: 'Comment créer un compte utilisateur ?', reponse: 'La création de compte se fait par l\'administrateur...', categorie: 'compte', popularite: 45 },
  { question: 'Comment synchroniser les données hors ligne ?', reponse: 'Cliquez sur le bouton "Synchroniser" en haut à droite...', categorie: 'collecte', popularite: 38 },
  { question: 'Comment exporter un rapport ?', reponse: 'Dans la section Rapports, utilisez le bouton Exporter...', categorie: 'rapports', popularite: 32 },
  { question: 'Comment traiter une plainte VBG ?', reponse: 'Les plaintes VBG sont confidentielles et traitées...', categorie: 'grm', popularite: 28 },
  { question: 'Comment modifier un bénéficiaire ?', reponse: 'Dans la base de données bénéficiaires, cliquez sur Modifier...', categorie: 'beneficiaires', popularite: 25 },
  { question: "Que faire en cas d'erreur technique ?", reponse: 'Contactez le support technique via le formulaire...', categorie: 'support', popularite: 20 },
];

const AIDE_TUTORIEL_SEED = [
  { titre: 'Premiers pas avec le système', description: 'Découvrez les fonctionnalités principales du PNDA S&E', duree: '10 min', niveau: 'debutant', video_url: '', etapes: [
    { titre: 'Connexion', description: "Utilisez vos identifiants fournis par l'administrateur" },
    { titre: 'Navigation', description: 'Explorez les différents menus et tableaux de bord' },
    { titre: 'Première collecte', description: 'Apprenez à enregistrer vos premières données' },
  ] },
  { titre: 'Collecte de données hors ligne', description: "Utilisez l'application mobile sans connexion internet", duree: '15 min', niveau: 'intermediaire', video_url: '', etapes: [
    { titre: 'Téléchargement', description: "Installez l'application PWA sur votre appareil" },
    { titre: 'Formulaires', description: 'Sélectionnez le formulaire approprié' },
    { titre: 'Synchronisation', description: 'Synchronisez vos données quand la connexion revient' },
  ] },
  { titre: 'Analyse des indicateurs', description: "Maîtrisez le calculateur d'indicateurs et les tableaux de bord", duree: '20 min', niveau: 'avance', video_url: '', etapes: [
    { titre: 'Indicateurs IODP', description: 'Comprenez les objectifs de développement' },
    { titre: 'Calcul automatique', description: 'Utilisez le calculateur avec les formules' },
    { titre: 'Visualisation', description: 'Interprétez les graphiques et tendances' },
  ] },
];

const ensureAideTables = async (): Promise<void> => {
  if (!aideTablesReady) {
    aideTablesReady = (async () => {
      // (schéma créé par supabase/migrations/0002_agent_environnement_aide_configuration.sql)

      const [articleCount] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM aide_article');
      if (Number(articleCount[0]?.total ?? 0) === 0) {
        const placeholders = AIDE_ARTICLE_SEED.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const values = AIDE_ARTICLE_SEED.flatMap((item) => [item.titre, item.contenu, item.categorie, JSON.stringify(item.tags), item.auteur]);
        await getDbPool().query(`INSERT INTO aide_article (titre, contenu, categorie, tags, auteur) VALUES ${placeholders}`, values);
      }

      const [faqCount] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM aide_faq');
      if (Number(faqCount[0]?.total ?? 0) === 0) {
        const placeholders = AIDE_FAQ_SEED.map(() => '(?, ?, ?, ?)').join(', ');
        const values = AIDE_FAQ_SEED.flatMap((item) => [item.question, item.reponse, item.categorie, item.popularite]);
        await getDbPool().query(`INSERT INTO aide_faq (question, reponse, categorie, popularite) VALUES ${placeholders}`, values);
      }

      const [tutorielCount] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM aide_tutoriel');
      if (Number(tutorielCount[0]?.total ?? 0) === 0) {
        const placeholders = AIDE_TUTORIEL_SEED.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const values = AIDE_TUTORIEL_SEED.flatMap((item) => [item.titre, item.description, item.duree, item.niveau, item.video_url, JSON.stringify(item.etapes)]);
        await getDbPool().query(`INSERT INTO aide_tutoriel (titre, description, duree, niveau, video_url, etapes) VALUES ${placeholders}`, values);
      }
    })().catch((error) => {
      aideTablesReady = null;
      throw error;
    });
  }

  await aideTablesReady;
};

export const getAideGuides = async (): Promise<SqlArticleAide[]> => {
  await ensureAideTables();

  const [rows] = await getDbPool().query<Array<RowDataPacket & {
    id: number; titre: string; contenu: string; categorie: string; tags: string[] | string;
    auteur: string | null; created_at: string; updated_at: string;
  }>>('SELECT id, titre, contenu, categorie, tags, auteur, created_at, updated_at FROM aide_article ORDER BY created_at DESC');

  return rows.map((row) => ({
    id: row.id,
    titre: row.titre,
    contenu: row.contenu,
    categorie: row.categorie as SqlArticleAide['categorie'],
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
    date_creation: toDateOnly(row.created_at),
    date_modification: toDateOnly(row.updated_at),
    auteur: row.auteur ?? '',
  }));
};

export const getAideGuideById = async (id: number): Promise<SqlArticleAide | null> => {
  const guides = await getAideGuides();
  return guides.find((guide) => guide.id === id) ?? null;
};

export const getAideFAQ = async (categorie?: string): Promise<SqlFAQ[]> => {
  await ensureAideTables();

  const whereClause = categorie ? 'WHERE categorie = ?' : '';
  const values = categorie ? [categorie] : [];

  const [rows] = await getDbPool().query<Array<RowDataPacket & { id: number; question: string; reponse: string; categorie: string; popularite: number }>>(
    `SELECT id, question, reponse, categorie, popularite FROM aide_faq ${whereClause} ORDER BY popularite DESC`,
    values,
  );

  return rows.map((row) => ({ id: row.id, question: row.question, reponse: row.reponse, categorie: row.categorie, popularite: Number(row.popularite) }));
};

export const getAideTutoriels = async (): Promise<SqlTutoriel[]> => {
  await ensureAideTables();

  const [rows] = await getDbPool().query<Array<RowDataPacket & {
    id: number; titre: string; description: string | null; duree: string | null; niveau: string;
    video_url: string | null; etapes: Array<{ titre: string; description: string }> | string;
  }>>('SELECT id, titre, description, duree, niveau, video_url, etapes FROM aide_tutoriel ORDER BY id ASC');

  return rows.map((row) => ({
    id: row.id,
    titre: row.titre,
    description: row.description ?? '',
    duree: row.duree ?? '',
    niveau: row.niveau as SqlTutoriel['niveau'],
    video_url: row.video_url ?? undefined,
    etapes: Array.isArray(row.etapes) ? row.etapes : JSON.parse(row.etapes || '[]'),
  }));
};

export const getAideTutorielById = async (id: number): Promise<SqlTutoriel | null> => {
  const tutoriels = await getAideTutoriels();
  return tutoriels.find((tutoriel) => tutoriel.id === id) ?? null;
};

export const getAideContactSupport = (): SqlContactSupport => ({
  email: process.env.SUPPORT_EMAIL || 'support@pnda.cd',
  telephone: process.env.SUPPORT_TELEPHONE || '+243 123 456 789',
  horaires: 'Lundi - Vendredi, 8h00 - 17h00',
  urgence: process.env.SUPPORT_URGENCE || '+243 999 888 777 (24h/24)',
});

export const createAideDemande = async (input: { sujet: string; message: string; email: string }): Promise<void> => {
  await ensureAideTables();

  await getDbPool().execute(
    'INSERT INTO aide_demande (sujet, message, email) VALUES (?, ?, ?)',
    [input.sujet.trim(), input.message.trim(), input.email.trim().toLowerCase()],
  );
};

export const searchAide = async (query: string): Promise<Array<{ type: 'guide' | 'faq' | 'tutoriel'; titre: string; extrait: string }>> => {
  await ensureAideTables();

  const like = `%${query}%`;
  const pool = getDbPool();

  const [[guideRows], [faqRows], [tutorielRows]] = await Promise.all([
    pool.query<Array<RowDataPacket & { titre: string; contenu: string }>>(
      'SELECT titre, contenu FROM aide_article WHERE titre ILIKE ? OR contenu ILIKE ? LIMIT 5',
      [like, like],
    ),
    pool.query<Array<RowDataPacket & { question: string; reponse: string }>>(
      'SELECT question, reponse FROM aide_faq WHERE question ILIKE ? OR reponse ILIKE ? LIMIT 5',
      [like, like],
    ),
    pool.query<Array<RowDataPacket & { titre: string; description: string | null }>>(
      'SELECT titre, description FROM aide_tutoriel WHERE titre ILIKE ? OR description ILIKE ? LIMIT 5',
      [like, like],
    ),
  ]);

  return [
    ...guideRows.map((row) => ({ type: 'guide' as const, titre: row.titre, extrait: row.contenu.slice(0, 120) })),
    ...faqRows.map((row) => ({ type: 'faq' as const, titre: row.question, extrait: row.reponse.slice(0, 120) })),
    ...tutorielRows.map((row) => ({ type: 'tutoriel' as const, titre: row.titre, extrait: (row.description ?? '').slice(0, 120) })),
  ];
};

