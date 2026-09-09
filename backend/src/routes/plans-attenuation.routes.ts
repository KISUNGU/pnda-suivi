/**
 * Routes : Plans D'Atténuation Routes
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
import type { CountRow } from '../types/app.types';

const router = Router();

// ==================== PLANS D'ATTÉNUATION ROUTES ====================

// Obtenir tous les plans d'atténuation avec leurs actions
router.get('/api/plans-attenuation', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const [risques] = await getDbPool().query(`
      SELECT 
        id, code, nom, description, categorie, probabilite, impact, niveau, statut,
        plan_attenuation, responsable, date_identification, province, actions_prevues,
        indicateurs_surveillance, dernier_suivi
      FROM risques
      WHERE plan_attenuation IS NOT NULL AND plan_attenuation != ''
      ORDER BY 
        array_position(ARRAY['Critique', 'Élevé', 'Modéré', 'Faible'], niveau),
        date_identification DESC
    `);

    // Pour chaque risque, récupérer ses actions
    const result = await Promise.all((risques as any[]).map(async (risque) => {
      const [actions] = await getDbPool().query(`
        SELECT 
          id, id_risque, action, responsable, date_debut, date_fin, statut, resultat
        FROM risque_actions
        WHERE id_risque = ?
        ORDER BY date_fin ASC, statut ASC
      `, [risque.id]);
      
      return {
        ...risque,
        actions_prevues: risque.actions_prevues ? JSON.parse(risque.actions_prevues) : [],
        indicateurs_surveillance: risque.indicateurs_surveillance ? JSON.parse(risque.indicateurs_surveillance) : [],
        actions: actions
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('GET /api/plans-attenuation failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des plans d\'atténuation' });
  }
});

// Obtenir les statistiques des plans d'atténuation
router.get('/api/plans-attenuation/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const [totalActions] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN statut = 'realisee' THEN 1 ELSE 0 END) AS realisees,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) AS en_cours,
        SUM(CASE WHEN statut = 'prevue' THEN 1 ELSE 0 END) AS prevues,
        SUM(CASE WHEN statut = 'abandonnee' THEN 1 ELSE 0 END) AS abandonnees
      FROM risque_actions
    `);
    
    const [risquesAvecPlan] = await getDbPool().query<CountRow[]>(`
      SELECT COUNT(*) AS total
      FROM risques
      WHERE plan_attenuation IS NOT NULL AND plan_attenuation != ''
    `);

    res.json({
      ...(totalActions[0] ?? {}),
      risques_avec_plan: Number(risquesAvecPlan[0]?.total ?? 0),
    });
  } catch (error) {
    console.error('GET /api/plans-attenuation/stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques' });
  }
});

// Mettre à jour le plan d'atténuation d'un risque
router.put('/api/plans-attenuation/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { plan_attenuation, actions_prevues, indicateurs_surveillance } = req.body;
    
    await getDbPool().query(
      `UPDATE risques 
       SET plan_attenuation = COALESCE(?, plan_attenuation),
           actions_prevues = COALESCE(?, actions_prevues),
           indicateurs_surveillance = COALESCE(?, indicateurs_surveillance),
           updated_at = NOW()
       WHERE id = ?`,
      [
        plan_attenuation, 
        actions_prevues ? JSON.stringify(actions_prevues) : null,
        indicateurs_surveillance ? JSON.stringify(indicateurs_surveillance) : null,
        id
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/plans-attenuation/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du plan' });
  }
});

// Ajouter une action à un risque
router.post('/api/plans-attenuation/:id(\\d+)/actions', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const idRisque = Number(req.params.id);
    const { action, responsable, date_debut, date_fin, statut, resultat } = req.body;
    
    const [result] = await getDbPool().query(
      `INSERT INTO risque_actions (id_risque, action, responsable, date_debut, date_fin, statut, resultat)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idRisque, action, responsable, date_debut, date_fin, statut || 'prevue', resultat || null]
    );
    
    const [newAction] = await getDbPool().query(
      `SELECT * FROM risque_actions WHERE id = ?`,
      [(result as any).insertId]
    );
    
    res.status(201).json((newAction as any[])[0]);
  } catch (error) {
    console.error('POST /api/plans-attenuation/:id/actions failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'action' });
  }
});

// Mettre à jour une action
router.put('/api/plans-attenuation/actions/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { action, responsable, date_debut, date_fin, statut, resultat } = req.body;
    
    await getDbPool().query(
      `UPDATE risque_actions 
       SET action = COALESCE(?, action),
           responsable = COALESCE(?, responsable),
           date_debut = COALESCE(?, date_debut),
           date_fin = COALESCE(?, date_fin),
           statut = COALESCE(?, statut),
           resultat = COALESCE(?, resultat)
       WHERE id = ?`,
      [action, responsable, date_debut, date_fin, statut, resultat, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/plans-attenuation/actions/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'action' });
  }
});

// Supprimer une action
router.delete('/api/plans-attenuation/actions/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await getDbPool().query('DELETE FROM risque_actions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/plans-attenuation/actions/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'action' });
  }
});


export default router;
