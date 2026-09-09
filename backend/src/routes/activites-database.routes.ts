/**
 * Routes : Activités Database Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getDbPool,
} from '../db';
import type { RowDataPacket } from '../db/types';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';

const router = Router();

// ==================== ACTIVITÉS DATABASE ROUTES ====================

// Obtenir toutes les activités avec pagination et filtres
router.get('/api/activites-database', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : '';
    const type = req.query.type ? String(req.query.type) : '';
    const statut = req.query.statut ? String(req.query.statut) : '';
    const province = scopeProvince(req) ?? '';
    const page = Math.max(Number(req.query.page ?? 0), 0);
    const limit = Math.max(Number(req.query.limit ?? 10), 1);
    const offset = page * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (code LIKE ? OR titre LIKE ? OR description LIKE ? OR responsable LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    if (statut) {
      whereClause += ' AND statut = ?';
      params.push(statut);
    }
    if (province) {
      whereClause += ' AND province = ?';
      params.push(province);
    }

    // Compter le total
    const [countRows] = await getDbPool().query(
      `SELECT COUNT(*) AS total FROM activites ${whereClause}`,
      params
    );
    const total = Number((countRows as any[])[0]?.total ?? 0);

    // Récupérer les données
    const [rows] = await getDbPool().query(
      `SELECT 
        id, code, titre, description, type, composante, statut, priorite,
        date_debut, date_fin, lieu, province, territoire, commune, village,
        responsable, responsable_contact, equipe,
        participants_prevus, participants_reels,
        budget_prevu, budget_reel,
        objectifs, resultats_attendus, resultats_obtenus,
        difficultes, lecons_apprises, documents, photos,
        created_by, beneficiaires_cibles, beneficiaires_atteints, taux_execution,
        created_at, updated_at
      FROM activites
      ${whereClause}
      ORDER BY date_debut DESC, id DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Transformer les données JSON
    const activites = (rows as any[]).map(row => ({
      ...row,
      objectifs: row.objectifs ? JSON.parse(row.objectifs) : [],
      resultats_attendus: row.resultats_attendus ? JSON.parse(row.resultats_attendus) : [],
      documents: row.documents ? JSON.parse(row.documents) : [],
      photos: row.photos ? JSON.parse(row.photos) : [],
      equipe: row.equipe ? JSON.parse(row.equipe) : [],
    }));

    res.json({ data: activites, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET /api/activites-database failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des activités' });
  }
});

// Obtenir les statistiques des activités
router.get('/api/activites-database/stats', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (_req: Request, res: Response) => {
  try {
    const [typeRows] = await getDbPool().query(
      `SELECT type, COUNT(*) AS total FROM activites GROUP BY type`
    );
    
    const [statutRows] = await getDbPool().query(
      `SELECT statut, COUNT(*) AS total FROM activites GROUP BY statut`
    );
    
    const [provinceRows] = await getDbPool().query(
      `SELECT province, COUNT(*) AS total FROM activites GROUP BY province`
    );
    
    const [monthRows] = await getDbPool().query(
      `SELECT to_char(date_debut, 'YYYY-MM') AS mois, COUNT(*) AS total
       FROM activites
       WHERE date_debut IS NOT NULL
       GROUP BY to_char(date_debut, 'YYYY-MM')
       ORDER BY mois DESC
       LIMIT 6`
    );
    
    const [budgetRows] = await getDbPool().query<RowDataPacket[]>(
      `SELECT 
        SUM(budget_prevu) AS budget_total,
        SUM(budget_reel) AS budget_depense,
        SUM(participants_reels) AS participants_total,
        AVG(taux_execution) AS taux_realisation
      FROM activites`
    );
    
    const parType: Record<string, number> = {};
    (typeRows as any[]).forEach(row => { parType[row.type] = row.total; });
    
    const parStatut: Record<string, number> = {};
    (statutRows as any[]).forEach(row => { parStatut[row.statut] = row.total; });
    
    const parProvince: Record<string, number> = {};
    (provinceRows as any[]).forEach(row => { parProvince[row.province] = row.total; });
    
    const parMois = (monthRows as any[]).map(row => ({
      mois: new Date(row.mois).toLocaleString('fr-FR', { month: 'short' }),
      total: row.total
    })).reverse();
    
    const budget = budgetRows[0] ?? {};
    
    res.json({
      total: (typeRows as any[]).reduce((acc, row) => acc + row.total, 0),
      par_type: parType,
      par_statut: parStatut,
      par_province: parProvince,
      par_mois: parMois,
      budget_total: budget?.budget_total || 0,
      budget_depense: budget?.budget_depense || 0,
      participants_total: budget?.participants_total || 0,
      taux_realisation: Math.round(budget?.taux_realisation || 0)
    });
  } catch (error) {
    console.error('GET /api/activites-database/stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques' });
  }
});

// Obtenir une activité par ID
router.get('/api/activites-database/:id(\\d+)', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [rows] = await getDbPool().query(
      `SELECT * FROM activites WHERE id = ?`,
      [req.params.id]
    );
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }
    
    const row = (rows as any[])[0];
    res.json({
      ...row,
      objectifs: row.objectifs ? JSON.parse(row.objectifs) : [],
      resultats_attendus: row.resultats_attendus ? JSON.parse(row.resultats_attendus) : [],
      documents: row.documents ? JSON.parse(row.documents) : [],
      photos: row.photos ? JSON.parse(row.photos) : [],
      equipe: row.equipe ? JSON.parse(row.equipe) : [],
    });
  } catch (error) {
    console.error('GET /api/activites-database/:id failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement de l\'activité' });
  }
});

// Créer une activité
router.post('/api/activites-database', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const {
      code, titre, description, type, composante, statut, priorite,
      date_debut, date_fin, lieu, province, territoire, commune, village,
      responsable, responsable_contact, equipe,
      participants_prevus, participants_reels,
      budget_prevu, budget_reel,
      objectifs, resultats_attendus, resultats_obtenus,
      difficultes, lecons_apprises, documents, photos,
      created_by, beneficiaires_cibles, beneficiaires_atteints, taux_execution
    } = req.body;
    
    // Générer un code si non fourni
    let finalCode = code;
    if (!finalCode) {
      const year = new Date().getFullYear();
      const [lastCode] = await getDbPool().query(
        `SELECT code FROM activites WHERE code LIKE 'ACT-${year}-%' ORDER BY code DESC LIMIT 1`
      );
      let nextNum = 1;
      if ((lastCode as any[]).length > 0) {
        const match = (lastCode as any[])[0].code.match(/\d+$/);
        if (match) nextNum = parseInt(match[0]) + 1;
      }
      finalCode = `ACT-${year}-${String(nextNum).padStart(3, '0')}`;
    }
    
    const [result] = await getDbPool().query(
      `INSERT INTO activites (
        code, titre, description, type, composante, statut, priorite,
        date_debut, date_fin, lieu, province, territoire, commune, village,
        responsable, responsable_contact, equipe,
        participants_prevus, participants_reels,
        budget_prevu, budget_reel,
        objectifs, resultats_attendus, resultats_obtenus,
        difficultes, lecons_apprises, documents, photos,
        created_by, beneficiaires_cibles, beneficiaires_atteints, taux_execution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalCode, titre, description, type, composante, statut || 'planifiee', priorite || 'moyenne',
        date_debut, date_fin, lieu, province, territoire, commune, village,
        responsable, responsable_contact, equipe ? JSON.stringify(equipe) : null,
        participants_prevus || 0, participants_reels || null,
        budget_prevu || 0, budget_reel || null,
        objectifs ? JSON.stringify(objectifs) : null,
        resultats_attendus ? JSON.stringify(resultats_attendus) : null,
        resultats_obtenus, difficultes, lecons_apprises,
        documents ? JSON.stringify(documents) : null,
        photos ? JSON.stringify(photos) : null,
        created_by, beneficiaires_cibles || 0, beneficiaires_atteints || 0, taux_execution || 0
      ]
    );
    
    res.status(201).json({ id: (result as any).insertId, code: finalCode });
  } catch (error) {
    console.error('POST /api/activites-database failed', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'activité' });
  }
});

// Mettre à jour une activité
router.put('/api/activites-database/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    
    const allowedFields = [
      'titre', 'description', 'type', 'composante', 'statut', 'priorite',
      'date_debut', 'date_fin', 'lieu', 'province', 'territoire', 'commune', 'village',
      'responsable', 'responsable_contact', 'participants_prevus', 'participants_reels',
      'budget_prevu', 'budget_reel', 'resultats_obtenus', 'difficultes', 'lecons_apprises',
      'created_by', 'beneficiaires_cibles', 'beneficiaires_atteints', 'taux_execution'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    
    // Champs JSON
    if (updates.objectifs !== undefined) {
      fields.push('objectifs = ?');
      values.push(JSON.stringify(updates.objectifs));
    }
    if (updates.resultats_attendus !== undefined) {
      fields.push('resultats_attendus = ?');
      values.push(JSON.stringify(updates.resultats_attendus));
    }
    if (updates.equipe !== undefined) {
      fields.push('equipe = ?');
      values.push(JSON.stringify(updates.equipe));
    }
    if (updates.documents !== undefined) {
      fields.push('documents = ?');
      values.push(JSON.stringify(updates.documents));
    }
    if (updates.photos !== undefined) {
      fields.push('photos = ?');
      values.push(JSON.stringify(updates.photos));
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }
    
    values.push(id);
    await getDbPool().query(
      `UPDATE activites SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/activites-database/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'activité' });
  }
});

// Supprimer une activité
router.delete('/api/activites-database/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const [result] = await getDbPool().query('DELETE FROM activites WHERE id = ?', [req.params.id]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }
    res.json({ message: 'Activité supprimée avec succès' });
  } catch (error) {
    console.error('DELETE /api/activites-database/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});

export default router;
