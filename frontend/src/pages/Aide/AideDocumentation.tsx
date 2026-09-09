// frontend/src/pages/Aide/AideDocumentation.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Rating,
  Stack,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import aideService, { type ArticleAide, type FAQ, type Tutoriel, type ContactSupport as ContactSupportType } from '../../services/aide.service';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';

type SearchResult = {
  type: 'guide' | 'faq' | 'tutoriel';
  titre: string;
  extrait: string;
};

export const AideDocumentation: React.FC = () => {
  const [guides, setGuides] = useState<ArticleAide[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tutoriels, setTutoriels] = useState<Tutoriel[]>([]);
  const [contact, setContact] = useState<ContactSupportType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedGuide, setSelectedGuide] = useState<ArticleAide | null>(null);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [selectedTutoriel, setSelectedTutoriel] = useState<Tutoriel | null>(null);
  const [tutorielDialogOpen, setTutorielDialogOpen] = useState(false);
  const [demandeDialogOpen, setDemandeDialogOpen] = useState(false);
  const [demandeData, setDemandeData] = useState({ sujet: '', message: '', email: '' });
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | false>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [guidesRes, faqRes, tutorielsRes, contactRes] = await Promise.all([
          aideService.getGuides(),
          aideService.getFAQ(),
          aideService.getTutoriels(),
          aideService.getContactSupport(),
        ]);
        setGuides(guidesRes.data);
        setFaqs(faqRes.data);
        setTutoriels(tutorielsRes.data);
        setContact(contactRes.data);
      } catch (error) {
        console.error(error);
      }
    };
    loadData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await aideService.rechercher(searchQuery);
      setSearchResults(response.data as SearchResult[]);
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendDemande = async () => {
    try {
      await aideService.envoyerDemande(demandeData);
      setDemandeEnvoyee(true);
      setTimeout(() => {
        setDemandeDialogOpen(false);
        setDemandeEnvoyee(false);
        setDemandeData({ sujet: '', message: '', email: '' });
      }, 2000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          Aide et documentation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Guides, FAQ, tutoriels et support technique pour le système PNDA S&E
        </Typography>

        {/* Barre de recherche */}
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <TextField
            fullWidth
            placeholder="Rechercher dans l'aide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <GoogleIcon name="search" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button variant="contained" onClick={handleSearch} disabled={searching} sx={{ bgcolor: '#2E7D32' }}>
                    {searching ? <CircularProgress size={24} /> : 'Rechercher'}
                  </Button>
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {searchResults.length > 0 && (
          <Paper sx={{ mt: 2, p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Résultats de recherche
            </Typography>
            <Stack spacing={1.5}>
              {searchResults.map((result, index) => (
                <Box key={`${result.type}-${index}`}>
                  <Typography variant="body2" fontWeight={600}>{result.titre}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {result.type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {result.extrait}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>

      {/* Onglets */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Guides" icon={<GoogleIcon name="menu_book" />} iconPosition="start" />
        <Tab label="FAQ" icon={<GoogleIcon name="quiz" />} iconPosition="start" />
        <Tab label="Tutoriels" icon={<GoogleIcon name="ondemand_video" />} iconPosition="start" />
        <Tab label="Support" icon={<GoogleIcon name="contact_support" />} iconPosition="start" />
      </Tabs>

      {/* Onglet Guides */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {guides.map((guide) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={guide.id}>
              <Card sx={{ ...moduleGridStyles.statCard, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'action.hover' }}>
                      <GoogleIcon name="description" sx={{ color: '#2E7D32' }} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{guide.titre}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Mis à jour le {new Date(guide.date_modification).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {guide.contenu}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {guide.tags.map((tag, idx) => (
                      <Chip key={idx} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<GoogleIcon name="open_in_new" size={20} />} onClick={() => { setSelectedGuide(guide); setGuideDialogOpen(true); }}>
                    Lire le guide
                  </Button>
                  <Button size="small" startIcon={<GoogleIcon name="download" size={20} />}>
                    Télécharger PDF
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Onglet FAQ */}
      {tabValue === 1 && (
        <Box>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              {faqs.map((faq) => (
                <Accordion key={faq.id} expanded={expandedFAQ === faq.id} onChange={() => setExpandedFAQ(expandedFAQ === faq.id ? false : faq.id)}>
                  <AccordionSummary expandIcon={<GoogleIcon name="chevron_right" />}>
                    <Typography variant="subtitle1" fontWeight={500}>{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {faq.reponse}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">Cet article vous a-t-il été utile ?</Typography>
                      <Rating size="small" defaultValue={faq.popularite / 10} precision={0.5} readOnly />
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ ...moduleGridStyles.sectionPanel, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Catégories FAQ
                </Typography>
                <List dense>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><GoogleIcon name="quiz" size={20} /></ListItemIcon>
                      <ListItemText primary="Compte et connexion" />
                      <Chip label="3" size="small" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><GoogleIcon name="assignment" size={20} /></ListItemIcon>
                      <ListItemText primary="Collecte de données" />
                      <Chip label="4" size="small" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><GoogleIcon name="bar_chart" size={20} /></ListItemIcon>
                      <ListItemText primary="Indicateurs" />
                      <Chip label="2" size="small" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><GoogleIcon name="warning" size={20} /></ListItemIcon>
                      <ListItemText primary="GRM / Plaintes" />
                      <Chip label="2" size="small" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><GoogleIcon name="settings" size={20} /></ListItemIcon>
                      <ListItemText primary="Support technique" />
                      <Chip label="3" size="small" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Onglet Tutoriels */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {tutoriels.map((tutoriel) => (
            <Grid size={{ xs: 12, md: 4 }} key={tutoriel.id}>
              <Card sx={{ ...moduleGridStyles.statCard, cursor: 'pointer' }} onClick={() => { setSelectedTutoriel(tutoriel); setTutorielDialogOpen(true); }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(57, 135, 229, 0.14)' }}>
                      <GoogleIcon name="ondemand_video" sx={{ color: '#1976D2' }} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{tutoriel.titre}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip label={tutoriel.duree} size="small" variant="outlined" />
                        <Chip 
                          label={tutoriel.niveau === 'debutant' ? 'Débutant' : tutoriel.niveau === 'intermediaire' ? 'Intermédiaire' : 'Avancé'} 
                          size="small" 
                          sx={{ bgcolor: tutoriel.niveau === 'debutant' ? '#E8F5E9' : tutoriel.niveau === 'intermediaire' ? '#FFF3E0' : '#FFEBEE' }}
                        />
                      </Stack>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {tutoriel.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Onglet Support */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={moduleGridStyles.statCard}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Contactez-nous
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  <ListItem>
                    <ListItemIcon><GoogleIcon name="email" sx={{ color: '#1976D2' }} /></ListItemIcon>
                    <ListItemText primary="Email" secondary={contact?.email} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><GoogleIcon name="phone" sx={{ color: '#2E7D32' }} /></ListItemIcon>
                    <ListItemText primary="Téléphone" secondary={contact?.telephone} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><GoogleIcon name="schedule" sx={{ color: '#FF8F00' }} /></ListItemIcon>
                    <ListItemText primary="Horaires" secondary={contact?.horaires} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><GoogleIcon name="warning" sx={{ color: '#F44336' }} /></ListItemIcon>
                    <ListItemText primary="Urgence" secondary={contact?.urgence} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={moduleGridStyles.statCard}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Envoyer une demande
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TextField
                  fullWidth
                  label="Votre email"
                  type="email"
                  margin="normal"
                  value={demandeData.email}
                  onChange={(e) => setDemandeData({ ...demandeData, email: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Sujet"
                  margin="normal"
                  value={demandeData.sujet}
                  onChange={(e) => setDemandeData({ ...demandeData, sujet: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  margin="normal"
                  value={demandeData.message}
                  onChange={(e) => setDemandeData({ ...demandeData, message: e.target.value })}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => setDemandeDialogOpen(true)}
                  sx={{ mt: 2, bgcolor: '#2E7D32' }}
                >
                  Envoyer
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialog Guide */}
      <Dialog open={guideDialogOpen} onClose={() => setGuideDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedGuide && (
          <>
            <DialogTitle>{selectedGuide.titre}</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" paragraph>
                Contenu détaillé du guide...
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setGuideDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" startIcon={<GoogleIcon name="download" size={20} />} sx={{ bgcolor: '#2E7D32' }}>Télécharger PDF</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog Tutoriel */}
      <Dialog open={tutorielDialogOpen} onClose={() => setTutorielDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedTutoriel && (
          <>
            <DialogTitle>{selectedTutoriel.titre}</DialogTitle>
            <DialogContent dividers>
              {selectedTutoriel.video_url && (
                <Box sx={{ mb: 3 }}>
                  <Box
                    component="iframe"
                    src={selectedTutoriel.video_url}
                    title={selectedTutoriel.titre}
                    sx={{ width: '100%', height: 315, border: 'none', borderRadius: 2 }}
                  />
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedTutoriel.description}
              </Typography>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Étapes ({selectedTutoriel.duree})
              </Typography>
              <Stepper orientation="vertical">
                {selectedTutoriel.etapes.map((etape, idx) => (
                  <Step key={idx} active={true} completed={true}>
                    <StepLabel>{etape.titre}</StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">{etape.description}</Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTutorielDialogOpen(false)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog Envoyer demande */}
      <Dialog open={demandeDialogOpen} onClose={() => setDemandeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmation d'envoi</DialogTitle>
        <DialogContent>
          {demandeEnvoyee ? (
            <Alert severity="success" icon={<GoogleIcon name="check_circle" />}>
              Votre demande a été envoyée avec succès ! Nous vous répondrons dans les plus brefs délais.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Vérifiez vos informations avant validation :
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="subtitle2">Email :</Typography>
                <Typography variant="body2" gutterBottom>{demandeData.email}</Typography>
                <Typography variant="subtitle2">Sujet :</Typography>
                <Typography variant="body2" gutterBottom>{demandeData.sujet}</Typography>
                <Typography variant="subtitle2">Message :</Typography>
                <Typography variant="body2">{demandeData.message}</Typography>
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!demandeEnvoyee && (
            <>
              <Button onClick={() => setDemandeDialogOpen(false)}>Annuler</Button>
              <Button variant="contained" onClick={handleSendDemande} sx={{ bgcolor: '#2E7D32' }}>
                Confirmer l'envoi
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AideDocumentation;