/**
 * Routes : Calculateur Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getDbPool,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';

const router = Router();

// ==================== CALCULATEUR ROUTES ====================

// Anciens codes (internes « ODP-x / IR-x » et alias historiques) -> codes réels du
// classeur v6 reformulé (21/08/2026), désormais stockés tels quels dans cadre_resultats.
// Seuls les anciens codes qui ne sont PAS des codes réels actuels figurent ici.
const CALCULATEUR_CODE_ALIASES: Record<string, string> = {
  'ODP-1': 'IODP1.1',
  'ODP-2': 'IODP2.1.1',
  'ODP-2F': 'IODP2.1.2',
  'ODP-3': 'IODP2.3',
  'ODP-4': 'IODP2.4',
  'ODP-5': 'IODP2.5',
  'ODP-6': 'IR2.1.3',
  'ODP-7': 'IR1.1.6.1',
  'ODP-7F': 'IR1.1.6.2',
  'IODP2.1': 'IODP2.1.1',
  'IODP2.2': 'IODP2.1.2',
  'IODP2.6': 'IODP2.5',
  'IODP3.2': 'IR2.1.3',
  'IODP3.3': 'IR1.1.6.1',
  'IODP3.4': 'IR1.1.6.2',
  'IR-1.1.1': 'IR1.1.1.1',
  'IR-1.1.1F': 'IR1.1.1.2',
  'IR-1.1.2': 'IR1.1.2',
  'IR-1.1.3': 'IR1.1.3.1',
  'IR-1.1.3F': 'IR1.1.3.2',
  'IR-1.1.4': 'IR1.1.4',
  'IR-1.1.5': 'IR1.1.5',
  'IR1.1.1': 'IR1.1.1.1',
  'IR-2.1.1': 'IR2.1.1',
  'IR-2.1.2': 'IR2.1.2',
  'IR-2.1.3': 'IR2.1.3',
  'IR-2.1.4': 'IR2.1.4',
  'IR2.1.5': 'IR2.1.3',
  'IR2.1.6': 'IR2.1.4',
  'IR-2.2.1': 'IR2.2.4',
  'IR-2.2.1F': 'IR2.2.4',
  'IR-2.2.2': 'IR2.2.5',
  'IR-2.2.2F': 'IR2.2.5',
  'IR-2.2.3': 'IR2.2.7',
  'IR-2.2.4': 'IR2.2.3',
  'IR-2.2.6': 'IR2.2.6',
  'IR2.2.8': 'IR2.2.5',
  'IR2.2.4.1': 'IR2.2.4',
  'IR2.2.4.2': 'IR2.2.4',
  'IR2.2.5.1': 'IR2.2.5',
  'IR2.2.5.2': 'IR2.2.5',
  'IR-3.1.1': 'IR3.1.2',
  'IR-3.1.2': 'IR3.1.1',
  'IR-3.1.3': 'IR3.1.5',
  'IR-3.1.4': 'IR3.1.3',
  'IR-3.1.5': 'IR3.1.4',
  'IR-3.1.6': 'IR3.1.6',
  'IR3.1.7': 'IR3.1.6',
  'IR-4.1': 'IODP3.1',
  'IR4.1': 'IODP3.1',
};

const CALCULATEUR_CODE_REVERSE_ALIASES = Object.fromEntries(
  Object.entries(CALCULATEUR_CODE_ALIASES).map(([cadreCode, calculateurCode]) => [calculateurCode, cadreCode])
);

function toCalculateurCode(code: string): string {
  return CALCULATEUR_CODE_ALIASES[code] ?? code;
}

function getCalculateurLookupCodes(code: string): string[] {
  return [code, toCalculateurCode(code), CALCULATEUR_CODE_REVERSE_ALIASES[code] ?? code];
}

const calculateurHistorique: unknown[] = [];

// backend/src/app.ts
// Les routes calculateur existent déjà, mais vérifions qu'elles sont complètes

// ==================== CALCULATEUR ROUTES ====================

// Obtenir tous les indicateurs pour le calculateur
router.get('/api/calculateur/indicateurs', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // Récupérer les indicateurs depuis la table cadre_resultats
    const [rows] = await getDbPool().query(`
      SELECT 
        id,
        code,
        nom,
        COALESCE(NULLIF(sous_composante, ''), NULLIF(reference_value, ''), '') as description,
        '' as formule,
        unite,
        frequence,
        est_odp as type,
        composante,
        final_prevu as cible,
        source_donnees,
        methodologie_collecte
      FROM cadre_resultats
      ORDER BY code
    `);
    
    // Transformer les données
    const indicateurs = (rows as any[]).map(row => {
      const code = toCalculateurCode(row.code);

      return {
      id: row.id,
      code,
      nom: row.nom,
      description: row.description || '',
      formule: getFormuleForCode(code),
      unite: row.unite,
      frequence: row.frequence || 'annuelle',
      type: row.type === true || row.type === 1 ? 'iodp' : 'ir',
      composante: row.composante,
      cible: row.cible !== null ? Number(row.cible) : null,
      champs: getChampsForIndicateur(code),
    };
    });
    
    res.json(indicateurs);
  } catch (error) {
    console.error('GET /api/calculateur/indicateurs failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des indicateurs' });
  }
});

// Obtenir un indicateur par code
router.get('/api/calculateur/indicateurs/:code', authenticateToken, async (req: Request, res: Response) => {
  try {
    const lookupCodes = getCalculateurLookupCodes(req.params.code);
    const [rows] = await getDbPool().query(
      `SELECT id, code, nom, COALESCE(NULLIF(sous_composante, ''), NULLIF(reference_value, ''), '') as description, unite, frequence, est_odp as type, composante, final_prevu as cible
       FROM cadre_resultats WHERE code IN (?, ?, ?) LIMIT 1`,
      lookupCodes
    );
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: 'Indicateur non trouvé' });
    }
    
    const row = (rows as any[])[0];
    const code = toCalculateurCode(row.code);
    res.json({
      id: row.id,
      code,
      nom: row.nom,
      description: row.description || '',
      formule: getFormuleForCode(code),
      unite: row.unite,
      frequence: row.frequence || 'annuelle',
      type: row.type === true || row.type === 1 ? 'iodp' : 'ir',
      composante: row.composante,
      cible: row.cible !== null ? Number(row.cible) : null,
      champs: getChampsForIndicateur(code),
    });
  } catch (error) {
    console.error('GET /api/calculateur/indicateurs/:code failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement de l\'indicateur' });
  }
});

// Calculer un indicateur
router.post('/api/calculateur/calculer/:code', authenticateToken, async (req: Request, res: Response) => {
  try {
    const requestedCode = req.params.code;
    const code = toCalculateurCode(requestedCode);
    const donnees = req.body;
    const lookupCodes = getCalculateurLookupCodes(requestedCode);
    
    // Récupérer l'indicateur
    const [rows] = await getDbPool().query(
      `SELECT id, code, nom, unite, final_prevu as cible FROM cadre_resultats WHERE code IN (?, ?, ?) LIMIT 1`,
      lookupCodes
    );
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: 'Indicateur non trouvé' });
    }
    
    const indicateur = (rows as any[])[0];
    let valeur = 0;
    let interpretation = '';
    const recommandations: string[] = [];
    
    // Calcul selon le code
    switch (code) {
      case 'IODP1.1':
        valeur = ((donnees.surplus_t / donnees.surplus_t0) - 1) * 100;
        interpretation = valeur > 0 ? `Hausse de ${valeur.toFixed(1)}% des ventes` : `Baisse de ${Math.abs(valeur).toFixed(1)}% des ventes`;
        break;
      case 'IODP2.1.1':
        valeur = (donnees.nouveaux || 0) + (donnees.cumul_anterieur || 0);
        interpretation = `Total cumulé de ${valeur.toLocaleString()} exploitants ayant adopté les technologies`;
        break;
      case 'IODP2.3':
        valeur = ((donnees.rendement_t - donnees.rendement_t0) / donnees.rendement_t0) * 100;
        interpretation = valeur > 0 ? `Augmentation de ${valeur.toFixed(1)}% du rendement` : `Baisse de ${Math.abs(valeur).toFixed(1)}% du rendement`;
        break;
      case 'IODP2.5':
        valeur = (1 - (donnees.taux_t / donnees.taux_t0)) * 100;
        interpretation = valeur > 0 ? `Réduction de ${valeur.toFixed(1)}% de la mortalité` : 'Augmentation de la mortalité';
        if (valeur < 20) recommandations.push("Renforcer les campagnes de vaccination", "Améliorer la formation des éleveurs");
        break;
      case 'IR1.1.1.1':
        valeur = (donnees.nouveaux || 0) + (donnees.cumul_anterieur || 0);
        interpretation = `${valeur.toLocaleString()} agriculteurs atteints au total`;
        break;
      case 'IR2.1.1':
        valeur = (donnees.routes_nationales || 0) + (donnees.routes_provinciales || 0) + (donnees.routes_desserte || 0);
        interpretation = `${valeur.toLocaleString()} km de routes réhabilitées`;
        break;
      case 'IR3.1.1':
        valeur = (donnees.traitees_delai / donnees.recues) * 100;
        interpretation = `${valeur.toFixed(1)}% des plaintes traitées dans les délais`;
        if (valeur < 80) recommandations.push("Renforcer l'équipe GRM", 'Améliorer les procédures de traitement');
        break;
      case 'IR3.1.6':
        valeur = (donnees.satisfaits / donnees.total_adoptants) * 100;
        interpretation = `${valeur.toFixed(1)}% des fermiers sont satisfaits`;
        break;
      default:
        // Calcul générique: somme de toutes les valeurs
        valeur = Object.values(donnees).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        interpretation = `Valeur calculée: ${valeur.toLocaleString()} ${indicateur.unite}`;
    }
    
    valeur = Math.round(valeur * 10) / 10;
    const progression = indicateur.cible > 0 ? (valeur / indicateur.cible) * 100 : undefined;
    
    // Sauvegarder le calcul dans l'historique
    await getDbPool().query(
      `INSERT INTO calculateur_historique (user_id, indicateur_code, indicateur_nom, valeur, unite, interpretation, donnees)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [(req as any).user?.id, code, indicateur.nom, valeur, indicateur.unite, interpretation, JSON.stringify(donnees)]
    );
    
    res.json({
      valeur,
      unite: indicateur.unite,
      progression,
      cible: indicateur.cible,
      interpretation,
      recommandations,
    });
  } catch (error) {
    console.error('POST /api/calculateur/calculer/:code failed', error);
    res.status(500).json({ message: 'Erreur lors du calcul' });
  }
});

// Obtenir l'historique des calculs
router.get('/api/calculateur/historique', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [rows] = await getDbPool().query(
      `SELECT id, indicateur_code, indicateur_nom, valeur, unite, interpretation, created_at as date
       FROM calculateur_historique
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [(req as any).user?.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /api/calculateur/historique failed', error);
    // Retourner un tableau vide si la table n'existe pas
    res.json([]);
  }
});

// Sauvegarder un calcul
router.post('/api/calculateur/sauvegarder', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const { code, donnees, resultat } = req.body;
    const [rows] = await getDbPool().query(
      `SELECT nom FROM cadre_resultats WHERE code = ?`,
      [code]
    );
    const nom = (rows as any[])[0]?.nom || code;
    
    await getDbPool().query(
      `INSERT INTO calculateur_historique (user_id, indicateur_code, indicateur_nom, valeur, unite, interpretation, donnees)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [(req as any).user?.id, code, nom, resultat.valeur, resultat.unite, resultat.interpretation, JSON.stringify(donnees)]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/calculateur/sauvegarder failed', error);
    res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
  }
});

// Exporter les calculs
router.get('/api/calculateur/export/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const format = req.params.format;
    const [rows] = await getDbPool().query(
      `SELECT indicateur_code, indicateur_nom, valeur, unite, interpretation, created_at as date
       FROM calculateur_historique
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [(req as any).user?.id]
    );
    
    if (format === 'excel') {
      const csvRows = [
        ['Date', 'Code', 'Indicateur', 'Valeur', 'Unité', 'Interprétation'],
        ...(rows as any[]).map(row => [
          new Date(row.date).toLocaleString('fr-FR'),
          row.indicateur_code,
          row.indicateur_nom,
          row.valeur,
          row.unite,
          row.interpretation,
        ]),
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=calculs_indicateurs_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\uFEFF' + csv);
    } else {
      res.status(400).json({ message: 'Format non supporté' });
    }
  } catch (error) {
    console.error('GET /api/calculateur/export/:format failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
});

// Fonctions utilitaires
function getFormuleForCode(code: string): string {
  const normalizedCode = toCalculateurCode(code);
  const formules: Record<string, string> = {
    'IODP1.1': '((Surplus vendu année t / Surplus vendu année référence) − 1) × 100',
    'IODP2.1.1': 'Nouveaux adoptants + Cumul années précédentes',
    'IODP2.1.2': 'Nouvelles femmes adoptantes + Cumul périodes précédentes',
    'IODP2.3': '((Rendement t − Rendement t0) / Rendement t0) × 100',
    'IODP2.4': '((Rendement t − Rendement t0) / Rendement t0) × 100',
    'IODP2.5': '(1 − (Taux mortalité t / Taux mortalité t0)) × 100',
    'IR1.1.1.1': 'Nouveaux bénéficiaires + Cumul périodes précédentes',
    'IR2.1.1': 'Routes nationales + Routes provinciales + Routes de desserte',
    'IR3.1.1': '(Plaintes traitées dans délai / Plaintes reçues) × 100',
    'IR3.1.6': '(Fermiers satisfaits / Total fermiers ayant adopté) × 100',
  };
  return formules[normalizedCode] || 'Valeur saisie';
}

function getChampsForIndicateur(code: string): Array<{ id: string; label: string; type: string; required: boolean }> {
  const normalizedCode = toCalculateurCode(code);
  const champs: Record<string, Array<{ id: string; label: string; type: string; required: boolean }>> = {
    'IODP1.1': [
      { id: 'surplus_t', label: 'Surplus vendu année t (kg)', type: 'number', required: true },
      { id: 'surplus_t0', label: 'Surplus vendu année référence (kg)', type: 'number', required: true },
    ],
    'IODP2.1.1': [
      { id: 'nouveaux', label: 'Nouveaux adoptants cette année', type: 'number', required: true },
      { id: 'cumul_anterieur', label: 'Cumul des années précédentes', type: 'number', required: true },
    ],
    'IODP2.1.2': [
      { id: 'femmes_t', label: 'Nouvelles femmes adoptantes', type: 'number', required: true },
      { id: 'cumul_anterieur', label: 'Cumul périodes précédentes', type: 'number', required: true },
    ],
    'IODP2.3': [
      { id: 'rendement_t', label: 'Rendement année t (kg/ha)', type: 'number', required: true },
      { id: 'rendement_t0', label: 'Rendement année référence (kg/ha)', type: 'number', required: true },
    ],
    'IODP2.4': [
      { id: 'rendement_t', label: 'Rendement année t (kg/ha)', type: 'number', required: true },
      { id: 'rendement_t0', label: 'Rendement année référence (kg/ha)', type: 'number', required: true },
    ],
    'IODP2.5': [
      { id: 'taux_t', label: 'Taux mortalité année t (%)', type: 'number', required: true },
      { id: 'taux_t0', label: 'Taux mortalité année référence (%)', type: 'number', required: true },
    ],
    'IR1.1.1.1': [
      { id: 'nouveaux', label: 'Nouveaux bénéficiaires cette période', type: 'number', required: true },
      { id: 'cumul_anterieur', label: 'Cumul des périodes précédentes', type: 'number', required: true },
    ],
    'IR2.1.1': [
      { id: 'routes_nationales', label: 'Routes nationales (km)', type: 'number', required: true },
      { id: 'routes_provinciales', label: 'Routes provinciales (km)', type: 'number', required: true },
      { id: 'routes_desserte', label: 'Routes de desserte (km)', type: 'number', required: true },
    ],
    'IR3.1.1': [
      { id: 'traitees_delai', label: 'Plaintes traitées dans les délais', type: 'number', required: true },
      { id: 'recues', label: 'Plaintes reçues', type: 'number', required: true },
    ],
    'IR3.1.6': [
      { id: 'satisfaits', label: 'Fermiers satisfaits', type: 'number', required: true },
      { id: 'total_adoptants', label: 'Total fermiers ayant adopté', type: 'number', required: true },
    ],
  };
  return champs[normalizedCode] || [{ id: 'valeur', label: 'Valeur', type: 'number', required: true }];
}

function getChampsPourIndicateur(code: string) {
  const champsMap: Record<string, { id: string; label: string; type: string; required: boolean }[]> = {
    'IODP1.1': [{ id: 'surplus_t', label: 'Surplus vendu année t (kg)', type: 'number', required: true }, { id: 'surplus_t0', label: 'Surplus vendu année référence (kg)', type: 'number', required: true }],
    'IODP2.1.1': [{ id: 'nouveaux', label: 'Nouveaux adoptants cette année', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul des années précédentes', type: 'number', required: true }],
    'IODP2.1.2': [{ id: 'femmes_t', label: 'Nouvelles femmes adoptantes', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul périodes précédentes', type: 'number', required: true }],
    'IODP2.3': [{ id: 'rendement_t', label: 'Rendement maïs année t (kg/ha)', type: 'number', required: true }, { id: 'rendement_t0', label: 'Rendement maïs année référence (kg/ha)', type: 'number', required: true }],
    'IODP2.4': [{ id: 'rendement_t', label: 'Rendement manioc année t (kg/ha)', type: 'number', required: true }, { id: 'rendement_t0', label: 'Rendement manioc année référence (kg/ha)', type: 'number', required: true }],
    'IODP2.5': [{ id: 'taux_t', label: 'Taux mortalité année t (%)', type: 'number', required: true }, { id: 'taux_t0', label: 'Taux mortalité année référence (%)', type: 'number', required: true }],
    'IR1.1.1.1': [{ id: 'nouveaux', label: 'Nouveaux bénéficiaires cette période', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul des périodes précédentes', type: 'number', required: true }],
    'IR2.1.1': [{ id: 'routes_nationales', label: 'Routes nationales (km)', type: 'number', required: true }, { id: 'routes_provinciales', label: 'Routes provinciales (km)', type: 'number', required: true }, { id: 'routes_desserte', label: 'Routes de desserte (km)', type: 'number', required: true }],
    'IR3.1.1': [{ id: 'traitees_delai', label: 'Plaintes traitées dans les délais', type: 'number', required: true }, { id: 'recues', label: 'Plaintes reçues', type: 'number', required: true }],
    'IR3.1.6': [{ id: 'satisfaits', label: 'Fermiers satisfaits', type: 'number', required: true }, { id: 'total_adoptants', label: 'Total fermiers ayant adopté', type: 'number', required: true }],
  };
  return champsMap[code] || [{ id: 'valeur', label: 'Valeur', type: 'number', required: true }];
}




export default router;
