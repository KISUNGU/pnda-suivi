/**
 * Routes : Distribution Cartes Routes
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
import {
  scopeProvince,
} from '../middleware/scope';
import type { CountRow } from '../types/app.types';

const router = Router();

// ==================== DISTRIBUTION CARTES ROUTES ====================

// Obtenir la liste des cartes
router.get('/api/cartes-agriculteurs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : '';
    const province = scopeProvince(req) ?? '';
    const statut = req.query.statut ? String(req.query.statut) : '';
    const page = Math.max(Number(req.query.page ?? 0), 0);
    const limit = Math.max(Number(req.query.limit ?? 10), 1);
    const offset = page * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (a.nom_complet LIKE ? OR CAST(a.farmer_id AS TEXT) LIKE ? OR dc.numero_carte LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }

    if (statut) {
      whereClause += ' AND COALESCE(dc.statut, "a_imprimer") = ?';
      params.push(statut);
    }

    // Compter le total
    const [countRows] = await getDbPool().query<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM agriculteurs a
       LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
       ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total ?? 0);

    // Récupérer les données
    const [rows] = await getDbPool().query<any[]>(
      `SELECT 
         a.id,
         CAST(a.farmer_id AS TEXT) AS rna_id,
         a.nom_complet,
         a.sexe,
         a.province,
         a.territoire,
         a.secteur,
         a.groupement,
         a.village,
         1 AS producteur_enregistre,
         COALESCE(dc.statut, 'a_imprimer') AS statut_carte,
         dc.numero_carte,
         dc.date_distribution,
         dc.agent_distribution,
         dc.observations
       FROM agriculteurs a
       LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
       ${whereClause}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const data = rows.map((row) => ({
      id: row.id,
      rna_id: row.rna_id,
      nom_complet: row.nom_complet,
      sexe: row.sexe,
      province: row.province || '',
      territoire: row.territoire || '',
      secteur: row.secteur || '',
      groupement: row.groupement || '',
      village: row.village || '',
      producteur_enregistre: Boolean(row.producteur_enregistre),
      statut_carte: row.statut_carte,
      numero_carte: row.numero_carte || undefined,
      date_distribution: row.date_distribution ? new Date(row.date_distribution).toISOString().split('T')[0] : undefined,
      agent_distribution: row.agent_distribution || undefined,
      observations: row.observations || undefined,
    }));

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET /api/cartes-agriculteurs failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des cartes' });
  }
});

// Obtenir les statistiques des cartes
router.get('/api/cartes-agriculteurs/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : '';
    const province = scopeProvince(req) ?? '';
    const statut = req.query.statut ? String(req.query.statut) : '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (a.nom_complet LIKE ? OR CAST(a.farmer_id AS TEXT) LIKE ? OR dc.numero_carte LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }

    if (statut) {
      whereClause += ' AND COALESCE(dc.statut, "a_imprimer") = ?';
      params.push(statut);
    }

    const [rows] = await getDbPool().query<any[]>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) AS producteurs_enregistres,
         SUM(CASE WHEN COALESCE(dc.statut, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS distribuees,
         SUM(CASE WHEN COALESCE(dc.statut, 'a_imprimer') = 'en_attente' THEN 1 ELSE 0 END) AS en_attente,
         SUM(CASE WHEN COALESCE(dc.statut, 'a_imprimer') = 'a_imprimer' THEN 1 ELSE 0 END) AS a_imprimer,
         COUNT(DISTINCT NULLIF(TRIM(a.province), '')) AS provinces
       FROM agriculteurs a
       LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
       ${whereClause}`,
      params
    );

    const stats = rows[0];
    res.json({
      total: Number(stats?.total ?? 0),
      producteurs_enregistres: Number(stats?.producteurs_enregistres ?? 0),
      distribuees: Number(stats?.distribuees ?? 0),
      en_attente: Number(stats?.en_attente ?? 0),
      a_imprimer: Number(stats?.a_imprimer ?? 0),
      provinces: Number(stats?.provinces ?? 0),
    });
  } catch (error) {
    console.error('GET /api/cartes-agriculteurs/stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques' });
  }
});

// Mettre à jour le statut d'une carte
router.put('/api/cartes-agriculteurs/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { numero_carte, date_distribution, agent_distribution, statut, observations } = req.body;

    // Vérifier si l'enregistrement existe
    const [existing] = await getDbPool().query<any[]>(
      'SELECT * FROM distribution_cartes WHERE rna_id = (SELECT CAST(farmer_id AS TEXT) FROM agriculteurs WHERE id = ?)',
      [id]
    );

    if (existing.length === 0) {
      // Créer un nouvel enregistrement
      const [agriculteur] = await getDbPool().query<any[]>(
        'SELECT CAST(farmer_id AS TEXT) AS rna_id FROM agriculteurs WHERE id = ?',
        [id]
      );
      
      if (agriculteur.length === 0) {
        return res.status(404).json({ message: 'Agriculteur non trouvé' });
      }

      await getDbPool().query(
        `INSERT INTO distribution_cartes (rna_id, numero_carte, date_distribution, agent_distribution, statut, observations)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [agriculteur[0].rna_id, numero_carte, date_distribution, agent_distribution, statut || 'a_imprimer', observations]
      );
    } else {
      // Mettre à jour l'enregistrement existant
      await getDbPool().query(
        `UPDATE distribution_cartes 
         SET numero_carte = COALESCE(?, numero_carte),
             date_distribution = COALESCE(?, date_distribution),
             agent_distribution = COALESCE(?, agent_distribution),
             statut = COALESCE(?, statut),
             observations = COALESCE(?, observations)
         WHERE rna_id = (SELECT CAST(farmer_id AS TEXT) FROM agriculteurs WHERE id = ?)`,
        [numero_carte, date_distribution, agent_distribution, statut, observations, id]
      );
    }

    res.json({ success: true, message: 'Carte mise à jour avec succès' });
  } catch (error) {
    console.error('PUT /api/cartes-agriculteurs/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la carte' });
  }
});

// Exporter les données
router.get('/api/cartes-agriculteurs/export/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const format = req.params.format;
    const search = req.query.search ? String(req.query.search) : '';
    const province = scopeProvince(req) ?? '';
    const statut = req.query.statut ? String(req.query.statut) : '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (a.nom_complet LIKE ? OR CAST(a.farmer_id AS TEXT) LIKE ? OR dc.numero_carte LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }

    if (statut) {
      whereClause += ' AND COALESCE(dc.statut, "a_imprimer") = ?';
      params.push(statut);
    }

    const [rows] = await getDbPool().query<any[]>(
      `SELECT 
         CAST(a.farmer_id AS TEXT) AS rna_id,
         a.nom_complet,
         a.sexe,
         a.province,
         a.territoire,
         a.secteur,
         a.groupement,
         a.village,
         COALESCE(dc.statut, 'a_imprimer') AS statut_carte,
         dc.numero_carte,
         dc.date_distribution,
         dc.agent_distribution
       FROM agriculteurs a
       LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
       ${whereClause}
       ORDER BY a.province, a.territoire, a.village, a.nom_complet`,
      params
    );

    if (format === 'excel') {
      const csvRows = [
        ['RNA ID', 'Nom complet', 'Sexe', 'Province', 'Territoire', 'Secteur', 'Groupement', 'Village', 'Statut carte', 'Numéro carte', 'Date distribution', 'Agent distribution'],
        ...rows.map(row => [
          row.rna_id,
          row.nom_complet,
          row.sexe === 'F' ? 'Femme' : 'Homme',
          row.province || '',
          row.territoire || '',
          row.secteur || '',
          row.groupement || '',
          row.village || '',
          row.statut_carte === 'distribuee' ? 'Distribuée' : row.statut_carte === 'en_attente' ? 'En attente' : 'À imprimer',
          row.numero_carte || '',
          row.date_distribution ? new Date(row.date_distribution).toLocaleDateString('fr-FR') : '',
          row.agent_distribution || '',
        ]),
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=distribution_cartes_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\uFEFF' + csv);
    } else {
      res.status(400).json({ message: 'Format non supporté' });
    }
  } catch (error) {
    console.error('GET /api/cartes-agriculteurs/export failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
});


export default router;
