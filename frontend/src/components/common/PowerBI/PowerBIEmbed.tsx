// frontend/src/components/common/PowerBI/PowerBIEmbed.tsx
import * as pbi from 'powerbi-client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import GoogleIcon from '../GoogleIcon';
import { powerbiService } from '../../../services/powerbi.service';
import type { EmbedConfig } from '../../../services/powerbi.service';

const powerbiService_instance = new pbi.service.Service(
  pbi.factories.hpmFactory,
  pbi.factories.wpmpFactory,
  pbi.factories.routerFactory,
);

interface PowerBIEmbedProps {
  reportId: string;
  reportName?: string;
  height?: number | string;
  showToolbar?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const PowerBIEmbed: React.FC<PowerBIEmbedProps> = ({
  reportId,
  reportName,
  height = 600,
  showToolbar = true,
  onLoad,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const powerbiRef = useRef<pbi.Report | null>(null);

  // Effect 1 : charger la config d'embed au changement de reportId
  useEffect(() => {
    let cancelled = false;

    const loadEmbedConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        setEmbedConfig(null);

        const response = await powerbiService.getEmbedConfig(reportId);
        if (!cancelled) setEmbedConfig(response.data);
      } catch (err) {
        if (!cancelled) {
          setError('Rapport Power BI non configuré');
          console.warn('Power BI embed non disponible:', err);
          if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEmbedConfig();
    return () => { cancelled = true; };
  }, [reportId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2 : initialiser l'embed une fois la config disponible (corrige le bug de closure)
  useEffect(() => {
    if (!embedConfig || !embedContainerRef.current) return;

    const container = embedContainerRef.current;

    try {
      const embedConfiguration: pbi.IReportEmbedConfiguration = {
        type: 'report',
        id: embedConfig.reportId,
        embedUrl: embedConfig.embedUrl,
        accessToken: embedConfig.token,
        tokenType: pbi.models.TokenType.Embed,
        settings: {
          filterPaneEnabled: true,
          navContentPaneEnabled: true,
          background: pbi.models.BackgroundType.Transparent,
          layoutType: pbi.models.LayoutType.Master,
          panes: {
            filters: { expanded: false, visible: true },
            pageNavigation: { visible: true },
          },
        },
      };

      const report = powerbiService_instance.embed(container, embedConfiguration) as pbi.Report;
      powerbiRef.current = report;

      report.on('loaded', () => {
        if (onLoad) onLoad();
      });

      report.on('error', (event: pbi.service.ICustomEvent<pbi.models.IError>) => {
        const msg = event.detail?.message ?? 'Erreur inconnue';
        setError(`Erreur d'affichage: ${msg}`);
      });
    } catch (err) {
      console.error("Erreur d'initialisation Power BI:", err);
      setError("Erreur d'initialisation du rapport");
    }

    return () => {
      try { powerbiService_instance.reset(container); } catch { /* ignore */ }
      powerbiRef.current = null;
    };
  }, [embedConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      if (embedConfig) {
        await powerbiService.refreshDataset(embedConfig.reportId);
        setSnackbarMessage('Données en cours de rafraîchissement');
        setSnackbarOpen(true);
        powerbiRef.current?.refresh();
      }
    } catch {
      setSnackbarMessage('Erreur lors du rafraîchissement');
      setSnackbarOpen(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await powerbiService.exportToPDF(reportId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSnackbarMessage('Rapport exporté en PDF');
      setSnackbarOpen(true);
    } catch {
      setSnackbarMessage("Erreur lors de l'export PDF");
      setSnackbarOpen(true);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2, height, bgcolor: '#F1F8E9', borderRadius: 2 }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
        <Typography variant="body2" color="text.secondary">Chargement du rapport…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height, bgcolor: '#FAFAFA', borderRadius: 2, border: '1px dashed #DDD', p: 4, textAlign: 'center' }}>
        <GoogleIcon name="bar_chart" size={64} sx={{ color: 'primary.main', opacity: 0.3, mb: 2 }} />
        {reportName && (
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
            {reportName}
          </Typography>
        )}
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>
          Rapport Power BI non disponible
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 440, mx: 'auto' }}>
          La connexion au service Power BI n'est pas configurée dans cet environnement.
          Les rapports seront disponibles une fois l'intégration Power BI activée côté serveur.
        </Typography>
        <Button variant="outlined" size="small" onClick={() => { setError(null); setLoading(true); setEmbedConfig(null); }}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {showToolbar && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, justifyContent: 'flex-end' }}>
          <Tooltip title="Rafraîchir les données">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <GoogleIcon name="refresh" size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exporter en PDF">
            <IconButton onClick={handleExportPDF}>
              <GoogleIcon name="picture_as_pdf" size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Plein écran">
            <IconButton>
              <GoogleIcon name="fullscreen" size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      )}

      <Paper
        ref={embedContainerRef}
        sx={{
          flex: 1,
          width: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#F1F8E9',
          position: 'relative',
        }}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};