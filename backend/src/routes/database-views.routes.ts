/**
 * Routes : Database Views
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getBeneficiaireStats,
  getBeneficiaires,
  getBeneficiairesDatabaseStats,
  getCartesAgriculteursStats,
  getDbPool,
  getIndicateurDatabaseById,
  getIndicateursDatabase,
  getIndicateursDatabaseStats,
  getSuiviMissions,
  getSuiviStats,
  getVentesSemencesStats,
  isDatabaseConnectivityError,
  updateIndicateurValeur,
} from '../db';
import type { RowDataPacket } from '../db/types';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';
import {
  mapBeneficiaireToDatabaseRecord,
} from '../utils/mappers';

const router = Router();

// ==================== DATABASE VIEWS ====================

router.get('/api/database/beneficiaires', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const payload = await getBeneficiaires({
      search: req.query.search ? String(req.query.search) : undefined,
      province: scopeProvince(req),
      sexe: req.query.sexe ? String(req.query.sexe) : undefined,
      type: req.query.type_exploitant ? String(req.query.type_exploitant) : req.query.type ? String(req.query.type) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    res.json({
      ...payload,
      data: payload.data.map(mapBeneficiaireToDatabaseRecord),
    });
  } catch (error) {
    console.error('GET /api/database/beneficiaires failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de la base bénéficiaires' });
  }
});

router.get('/api/database/beneficiaires/stats', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (_req, res) => {
  try {
    const [baseStats, databaseStats] = await Promise.all([
      getBeneficiaireStats(),
      getBeneficiairesDatabaseStats(),
    ]);

    res.json({
      total: baseStats.total,
      par_sexe: { femmes: baseStats.femmes, hommes: baseStats.hommes },
      par_type: databaseStats.parType,
      par_province: databaseStats.parProvince,
      par_age: { jeunes: 0, adultes: baseStats.total, seniors: 0 },
      par_instruction: {},
      par_technologies: databaseStats.parTechnologies,
      evolution_mensuelle: databaseStats.evolutionMensuelle,
    });
  } catch (error) {
    console.error('GET /api/database/beneficiaires/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques bénéficiaires' });
  }
});

router.get('/api/indicateurs-database', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    res.json(await getIndicateursDatabase({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      composante: typeof req.query.composante === 'string' ? req.query.composante : undefined,
      frequence: typeof req.query.frequence === 'string' ? req.query.frequence : undefined,
      statut: typeof req.query.statut === 'string' ? req.query.statut : undefined,
      page: Number(req.query.page ?? 0),
      limit: Number(req.query.limit ?? 10),
    }));
  } catch (error) {
    console.error('GET /api/indicateurs-database failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer la base indicateurs' });
  }
});

router.get('/api/indicateurs-database/stats', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (_req, res) => {
  try {
    res.json(await getIndicateursDatabaseStats());
  } catch (error) {
    console.error('GET /api/indicateurs-database/stats failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les statistiques des indicateurs' });
  }
});

router.get('/api/indicateurs-database/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const indicateur = await getIndicateurDatabaseById(Number(req.params.id));
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }
    return res.json(indicateur);
  } catch (error) {
    console.error('GET /api/indicateurs-database/:id failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer cet indicateur' });
  }
});

router.put('/api/indicateurs-database/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (req.body?.valeurs?.actuelle !== undefined) {
      await updateIndicateurValeur(id, Number(req.body.valeurs.actuelle), req.body?.periode);
    }
    const indicateur = await getIndicateurDatabaseById(id);
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }
    return res.json(indicateur);
  } catch (error) {
    console.error('PUT /api/indicateurs-database/:id failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de mettre a jour cet indicateur' });
  }
});

router.put('/api/indicateurs-database/:id(\\d+)/valeur', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { valeur, periode } = req.body;
    const indicateur = await updateIndicateurValeur(id, Number(valeur), periode);
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }
    return res.json({ success: true, indicateur });
  } catch (error) {
    console.error('PUT /api/indicateurs-database/:id/valeur failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de mettre a jour la valeur' });
  }
});

router.get('/api/suivi/missions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const province = scopeProvince(req);
    return res.json(await getSuiviMissions(province));
  } catch (error) {
    console.error('GET /api/suivi/missions failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des missions de suivi' });
  }
});

router.get('/api/suivi/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getSuiviStats());
  } catch (error) {
    console.error('GET /api/suivi/stats failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques de suivi' });
  }
});

// Statistiques avancées des bénéficiaires
router.get('/api/beneficiaires/advanced-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { saison, province, territoire, secteur, groupement, village, ptech } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    if (ptech) {
      whereClause += ' AND a.ptech = ?';
      params.push(ptech);
    }
    
    // Stats globales
    const [statsRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) AS total_producteurs,
        SUM(CASE WHEN a.sexe = 'F' THEN 1 ELSE 0 END) AS total_femmes,
        AVG(CASE WHEN a.age IS NOT NULL AND a.age > 0 THEN a.age END) AS age_moyen,
        SUM(CASE WHEN a.est_chef_menage = true THEN 1 ELSE 0 END) AS chefs_menage,
        SUM(CASE WHEN a.membre_deja_enregistre = true THEN 1 ELSE 0 END) AS membres_deja_enregistres
      FROM agriculteurs a
      ${whereClause}
    `, params);
    
    // Distribution par âge
    const [ageRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN a.age BETWEEN 18 AND 25 THEN '18-25 ans'
          WHEN a.age BETWEEN 26 AND 40 THEN '26-40 ans'
          WHEN a.age BETWEEN 41 AND 60 THEN '41-60 ans'
          WHEN a.age > 60 THEN 'Plus de 60 ans'
          ELSE 'Non renseigné'
        END AS tranche_age,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY tranche_age
    `, params);
    
    // Distribution par statut matrimonial
    const [matrimonialRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COALESCE(a.situation_matrimoniale, 'Non renseigné') AS situation,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY a.situation_matrimoniale
    `, params);
    
    // Distribution par niveau d'éducation
    const [educationRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COALESCE(a.niveau_instruction, 'Non renseigné') AS niveau,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY a.niveau_instruction
    `, params);
    
    // Distribution par type d'activité
    const [activiteRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN a.ptech LIKE '%elev%' THEN 'Elevage'
          WHEN a.ptech LIKE '%pisc%' THEN 'Aquapisciculture'
          ELSE 'Agriculture'
        END AS type_activite,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY type_activite
    `, params);
    
    // Distribution par superficie de terres
    const [superficieRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN a.superficie_terres = 0 OR a.superficie_terres IS NULL THEN 'Aucune'
          WHEN a.superficie_terres <= 0.5 THEN '0 - 0.5 ha'
          WHEN a.superficie_terres <= 1 THEN '0.5 - 1 ha'
          WHEN a.superficie_terres <= 2 THEN '1 - 2 ha'
          WHEN a.superficie_terres <= 3 THEN '2 - 3 ha'
          ELSE 'Plus de 3 ha'
        END AS tranche_superficie,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY tranche_superficie
    `, params);
    
    // Top 5 cultures
    const [culturesRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT c.nom, COUNT(*) AS nombre
      FROM agriculteurs_cultures ac
      JOIN cultures c ON c.id = ac.culture_id
      JOIN agriculteurs a ON a.id = ac.agriculteur_id
      ${whereClause}
      GROUP BY c.nom
      ORDER BY nombre DESC
      LIMIT 5
    `, params);
    
    res.json({
      stats: statsRows[0],
      age_distribution: ageRows,
      matrimonial_distribution: matrimonialRows,
      education_distribution: educationRows,
      activite_distribution: activiteRows,
      superficie_distribution: superficieRows,
      top_cultures: culturesRows
    });
  } catch (error) {
    console.error('GET /api/beneficiaires/advanced-stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques avancées' });
  }
});

// Paquets techniques
router.get('/api/beneficiaires/ptech-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { saison, province, territoire, secteur, groupement, village } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    
    // Statistiques des paquets techniques
    const [ptechRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        a.ptech,
        COUNT(*) AS nombre_producteurs,
        COUNT(DISTINCT a.province) AS provinces_concernees
      FROM agriculteurs a
      ${whereClause}
      GROUP BY a.ptech
      ORDER BY nombre_producteurs DESC
    `, params);
    
    // Distribution par province des paquets techniques
    const [ptechProvinceRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        a.province,
        a.ptech,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY a.province, a.ptech
      ORDER BY a.province, nombre DESC
    `, params);
    
    res.json({
      ptech_distribution: ptechRows,
      ptech_by_province: ptechProvinceRows,
      total_ptech_selectionnes: ptechRows.reduce((sum: number, row: any) => sum + row.nombre_producteurs, 0)
    });
  } catch (error) {
    console.error('GET /api/beneficiaires/ptech-stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques des paquets techniques' });
  }
});

// Distribution des cartes et ventes de semences
router.get('/api/beneficiaires/cartes-ventes-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { saison, province, territoire, secteur, groupement, village } = req.query;

    await Promise.all([
      getCartesAgriculteursStats(),
      getVentesSemencesStats(),
    ]);
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    
    // Statistiques des cartes
    const [carteRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        a.province,
        COUNT(*) AS total_producteurs,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS cartes_distribuees,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'en_attente' THEN 1 ELSE 0 END) AS cartes_attente,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'a_imprimer' THEN 1 ELSE 0 END) AS cartes_imprimer
      FROM agriculteurs a
      LEFT JOIN cartes_agriculteurs dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
      ${whereClause}
      GROUP BY a.province
      ORDER BY a.province
    `, params);
    
    // Statistiques des ventes par province
    const [venteProvinceRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        vs.province,
        COUNT(DISTINCT vs.rna_id) AS producteurs_acheteurs,
        COALESCE(SUM(vs.quantite_kg), 0) AS total_kg,
        COALESCE(SUM(vs.montant_usd), 0) AS total_usd,
        0 AS total_cdf
      FROM ventes_semences vs
      JOIN agriculteurs a ON a.farmer_id = CAST(vs.rna_id AS BIGINT)
      ${whereClause}
      GROUP BY vs.province
      ORDER BY vs.province
    `, params);
    
    // Tableau village - cartes - semences
    const [villageRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        a.village,
        COUNT(*) AS total_producteurs,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS ont_recu_carte,
        COUNT(DISTINCT vs.rna_id) AS ont_achete_semences
      FROM agriculteurs a
      LEFT JOIN cartes_agriculteurs dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
      LEFT JOIN ventes_semences vs ON vs.rna_id = CAST(a.farmer_id AS TEXT)
      ${whereClause}
      GROUP BY a.village
      ORDER BY a.village
    `, params);
    
    const fournisseurRows: RowDataPacket[] = [];
    
    // Widgets globaux
    const [widgetRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COUNT(DISTINCT a.farmer_id) AS producteurs_avec_ptech,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS ont_recu_carte,
        COUNT(DISTINCT vs.rna_id) AS ont_achete_semences,
        0 AS fournisseurs_actifs,
        COALESCE(SUM(vs.quantite_kg), 0) AS kg_semences_vendues
      FROM agriculteurs a
      LEFT JOIN cartes_agriculteurs dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
      LEFT JOIN ventes_semences vs ON vs.rna_id = CAST(a.farmer_id AS TEXT)
      ${whereClause}
    `, params);
    
    res.json({
      widgets: widgetRows[0],
      distribution_cartes_par_province: carteRows,
      ventes_semences_par_province: venteProvinceRows,
      suivi_par_village: villageRows,
      ventes_par_fournisseur: fournisseurRows
    });
  } catch (error) {
    console.error('GET /api/beneficiaires/cartes-ventes-stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques des cartes et ventes' });
  }
});

// Liste des filtres disponibles
router.get('/api/beneficiaires/filters', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const [saisons] = await getDbPool().query('SELECT DISTINCT saison FROM agriculteurs WHERE saison IS NOT NULL ORDER BY saison DESC');
    const [provinces] = await getDbPool().query('SELECT DISTINCT province FROM agriculteurs WHERE province IS NOT NULL ORDER BY province');
    const [territoires] = await getDbPool().query('SELECT DISTINCT territoire, province FROM agriculteurs WHERE territoire IS NOT NULL ORDER BY province, territoire');
    const [secteurs] = await getDbPool().query('SELECT DISTINCT secteur, province, territoire FROM agriculteurs WHERE secteur IS NOT NULL ORDER BY secteur');
    const [groupements] = await getDbPool().query('SELECT DISTINCT groupement, province, territoire, secteur FROM agriculteurs WHERE groupement IS NOT NULL ORDER BY groupement');
    const [villages] = await getDbPool().query('SELECT DISTINCT village, province, territoire, secteur, groupement FROM agriculteurs WHERE village IS NOT NULL ORDER BY village');
    const [ptechs] = await getDbPool().query('SELECT DISTINCT ptech FROM agriculteurs WHERE ptech IS NOT NULL ORDER BY ptech');
    
    res.json({
      saisons,
      provinces,
      territoires,
      secteurs,
      groupements,
      villages,
      ptechs
    });
  } catch (error) {
    console.error('GET /api/beneficiaires/filters failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des filtres' });
  }
});

// Export des statistiques
router.get('/api/beneficiaires/export/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const format = req.params.format;
    const { saison, province, territoire, secteur, groupement, village, ptech } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    if (ptech) {
      whereClause += ' AND a.ptech = ?';
      params.push(ptech);
    }
    
    // Récupérer les données
    const [statsRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) AS total_producteurs,
        SUM(CASE WHEN a.sexe = 'F' THEN 1 ELSE 0 END) AS total_femmes,
        AVG(CASE WHEN a.age IS NOT NULL AND a.age > 0 THEN a.age END) AS age_moyen,
        SUM(CASE WHEN a.est_chef_menage = true THEN 1 ELSE 0 END) AS chefs_menage,
        SUM(CASE WHEN a.membre_deja_enregistre = true THEN 1 ELSE 0 END) AS membres_deja_enregistres
      FROM agriculteurs a
      ${whereClause}
    `, params);
    
    const [ageRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN a.age BETWEEN 18 AND 25 THEN '18-25 ans'
          WHEN a.age BETWEEN 26 AND 40 THEN '26-40 ans'
          WHEN a.age BETWEEN 41 AND 60 THEN '41-60 ans'
          WHEN a.age > 60 THEN 'Plus de 60 ans'
          ELSE 'Non renseigné'
        END AS tranche_age,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY tranche_age
    `, params);
    
    if (format === 'excel') {
      // Création du CSV
      const csvRows = [
        ['=== STATISTIQUES GLOBALES ==='],
        ['Indicateur', 'Valeur'],
        ['Total producteurs', statsRows[0]?.total_producteurs || 0],
        ['Productrices', statsRows[0]?.total_femmes || 0],
        ['Âge moyen', `${Math.round(statsRows[0]?.age_moyen || 0)} ans`],
        ['Chefs de ménage', statsRows[0]?.chefs_menage || 0],
        ['Membres déjà enregistrés', statsRows[0]?.membres_deja_enregistres || 0],
        [],
        ['=== RÉPARTITION PAR ÂGE ==='],
        ['Tranche d\'âge', 'Nombre'],
        ...ageRows.map((row: any) => [row.tranche_age, row.nombre]),
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=statistiques_beneficiaires_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.status(400).json({ message: 'Format non supporté' });
    }
  } catch (error) {
    console.error('GET /api/beneficiaires/export failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
});

// Export des bénéficiaires détaillés
router.get('/api/beneficiaires/export-beneficiaires/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const format = req.params.format;
    const { saison, province, territoire, secteur, groupement, village, ptech } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    if (ptech) {
      whereClause += ' AND a.ptech = ?';
      params.push(ptech);
    }
    
    const [beneficiaires] = await getDbPool().query(`
      SELECT 
        a.farmer_id AS rna_id,
        a.nom_complet,
        a.sexe,
        a.age,
        a.province,
        a.territoire,
        a.secteur,
        a.groupement,
        a.village,
        a.saison,
        a.ptech,
        a.est_chef_menage,
        a.membre_deja_enregistre,
        a.a_recu_carte,
        COALESCE(dc.statut, 'non_distribuee') AS statut_carte,
        COALESCE(vs.total_kg, 0) AS semences_achetees_kg
      FROM agriculteurs a
      LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
      LEFT JOIN (
        SELECT rna_id, SUM(quantite_kg) AS total_kg
        FROM ventes_semences
        GROUP BY rna_id
      ) vs ON vs.rna_id = CAST(a.farmer_id AS TEXT)
      ${whereClause}
      ORDER BY a.province, a.territoire, a.village, a.nom_complet
    `, params);
    
    if (format === 'excel') {
      const csvRows = [
        ['RNA ID', 'Nom complet', 'Sexe', 'Âge', 'Province', 'Territoire', 'Secteur', 'Groupement', 'Village', 'Saison', 'Paquet technique', 'Chef de ménage', 'Membre déjà enregistré', 'A reçu carte', 'Statut carte', 'Semences achetées (kg)'],
        ...(beneficiaires as any[]).map(b => [
          b.rna_id,
          b.nom_complet,
          b.sexe === 'F' ? 'Femme' : 'Homme',
          b.age || '-',
          b.province,
          b.territoire,
          b.secteur,
          b.groupement,
          b.village,
          b.saison,
          b.ptech,
          b.est_chef_menage ? 'Oui' : 'Non',
          b.membre_deja_enregistre ? 'Oui' : 'Non',
          b.a_recu_carte ? 'Oui' : 'Non',
          b.statut_carte,
          b.semences_achetees_kg,
        ]),
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=beneficiaires_detail_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.status(400).json({ message: 'Format non supporté' });
    }
  } catch (error) {
    console.error('GET /api/beneficiaires/export-beneficiaires failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
});


export default router;
