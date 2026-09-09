/**
 * Routes : Power Bi Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  buildPowerBIEmbedUrl,
  findPowerBIReport,
  generatePowerBIEmbedToken,
  getPowerBIDashboardById,
  getPowerBIDashboards,
  getPowerBIReportById,
  getPowerBIReports,
  getPowerBIReportsByCategory,
  getProvinceClassement,
  getProvinceComparaison,
  getProvinces,
  getProvincesContours,
  isDatabaseConnectivityError,
  setProvinceContour,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';

const router = Router();

// ==================== POWER BI ROUTES ====================
// Token d'embed mocké
const generateMockToken = (reportId: string) => {
  return {
    token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MTE4MDQ4MDB9.${reportId}`,
    expiration: new Date(Date.now() + 3600000).toISOString(),
  };
};

// A REMPLACER


router.get('/api/powerbi/reports', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getPowerBIReports());
  } catch (error) {
    console.error('GET /api/powerbi/reports failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des rapports Power BI' });
  }
});

router.get('/api/powerbi/reports/category/:category', authenticateToken, async (req, res) => {
  try {
    return res.json(await getPowerBIReportsByCategory(req.params.category));
  } catch (error) {
    console.error('GET /api/powerbi/reports/category/:category failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des rapports par catégorie' });
  }
});

router.get('/api/powerbi/dashboards', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getPowerBIDashboards());
  } catch (error) {
    console.error('GET /api/powerbi/dashboards failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des dashboards Power BI' });
  }
});

router.get('/api/powerbi/dashboards/:id', authenticateToken, async (req, res) => {
  try {
    const dashboard = await getPowerBIDashboardById(req.params.id);

    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard non trouvé' });
    }

    return res.json(dashboard);
  } catch (error) {
    console.error('GET /api/powerbi/dashboards/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du dashboard Power BI' });
  }
});

router.get('/api/powerbi/embed/:reportId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const requestedReportId = String(req.params.reportId ?? '').trim();

    if (!requestedReportId) {
      return res.status(400).json({ message: 'Identifiant de rapport manquant' });
    }

    const report = await findPowerBIReport(requestedReportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    const embedToken = await generatePowerBIEmbedToken(report.report_id, report.dataset_id);

    return res.json({
      reportId: report.report_id,
      reportName: report.name,
      embedUrl: buildPowerBIEmbedUrl(report.report_id),
      token: embedToken.token,
      expiration: embedToken.expiration,
      mode: 'embed',
    });
  } catch (error) {
    console.error('GET /api/powerbi/embed/:reportId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({
      message: "Erreur lors de la génération de la configuration d'embed",
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/api/powerbi/token/:reportId', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'partenaire'), async (req, res) => {
  try {
    const requestedReportId = String(req.params.reportId ?? '').trim();

    if (!requestedReportId) {
      return res.status(400).json({ message: 'Identifiant de rapport manquant' });
    }

    const report = await findPowerBIReport(requestedReportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    return res.json(await generatePowerBIEmbedToken(report.report_id, report.dataset_id));
  } catch (error) {
    console.error('POST /api/powerbi/token/:reportId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({
      message: 'Erreur lors de la génération du token Power BI',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/api/powerbi/refresh/:datasetId', authenticateToken, requireRole('super_admin', 'admin', 'uncp'), async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.datasetId);
    const datasetId = report?.datasetId ?? req.params.datasetId;

    return res.json({
      message: `Rafraîchissement du dataset ${datasetId} initié`,
      status: 'processing',
    });
  } catch (error) {
    console.error('POST /api/powerbi/refresh/:datasetId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du rafraîchissement du dataset Power BI' });
  }
});

router.post('/api/powerbi/export/:reportId', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'partenaire'), async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.reportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

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
BT /F1 24 Tf 100 700 Td (Rapport PNDA - ${report.reportId}) Tj ET
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
    res.setHeader('Content-Disposition', `attachment; filename=rapport_${report.reportId}.pdf`);
    return res.send(Buffer.from(pdfContent));
  } catch (error) {
    console.error('POST /api/powerbi/export/:reportId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: "Erreur lors de l'export du rapport Power BI" });
  }
});

router.post('/api/powerbi/export/:reportId/ppt', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'partenaire'), async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.reportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_${report.reportId}.pptx`);
    return res.send(Buffer.from('Mock PPT content'));
  } catch (error) {
    console.error('POST /api/powerbi/export/:reportId/ppt failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: "Erreur lors de l'export PPT du rapport Power BI" });
  }
});

router.get('/api/powerbi/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }
    return res.json(report);
  } catch (error) {
    console.error('GET /api/powerbi/reports/:reportId failed', error);   

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du rapport Power BI' });
  }
});

router.get('/api/powerbi/embed/:reportId', authenticateToken, async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    const token = generateMockToken(report.reportId);

    return res.json({
      reportId: report.reportId,
      reportName: report.name,
      embedUrl: report.embedUrl,
      token: token.token,
      expiration: token.expiration,
    });
  } catch (error) {
    console.error('GET /api/powerbi/embed/:reportId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la génération de la configuration d\'embed' });
  }
});




router.get('/api/provinces', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getProvinces());
  } catch (error) {
    console.error('GET /api/provinces failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des provinces' });
  }
});

router.get('/api/provinces/classement', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getProvinceClassement());
  } catch (error) {
    console.error('GET /api/provinces/classement failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du classement provincial' });
  }
});

router.get('/api/provinces/comparaison', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getProvinceComparaison());
  } catch (error) {
    console.error('GET /api/provinces/comparaison failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de la comparaison provinciale' });
  }
});

/**
 * Contours GeoJSON des provinces pour la cartographie (SIG).
 */
router.get('/api/provinces/contours', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getProvincesContours());
  } catch (error) {
    console.error('GET /api/provinces/contours failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des contours' });
  }
});

/**
 * Import du contour officiel d'une province (GeoJSON Polygon/MultiPolygon, WGS84).
 */
router.put('/api/provinces/:id/contour', authenticateToken, requireRole('super_admin', 'admin', 'uncp'), async (req, res) => {
  try {
    const geometry = req.body?.geometry;
    if (!geometry || typeof geometry !== 'object' || !['Polygon', 'MultiPolygon'].includes((geometry as { type?: string }).type ?? '')) {
      return res.status(400).json({ message: 'GeoJSON attendu : geometrie Polygon ou MultiPolygon (WGS84)' });
    }

    const ok = await setProvinceContour(String(req.params.id), geometry);
    if (!ok) {
      return res.status(404).json({ message: 'Province introuvable' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/provinces/:id/contour failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement du contour' });
  }
});


export default router;
