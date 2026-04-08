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
import {
  Search,
  Description,
  Download,
  Email,
  Phone,
  OpenInNew,
  CheckCircle,
  ArrowForward,
  MenuBook,
  Quiz,
  OndemandVideo,
  ContactSupport,
  Assignment,
  BarChart,
  Warning,
  Settings,
  Schedule,
} from '@mui/icons-material';
import type { ArticleAide, FAQ, Tutoriel, ContactSupport as ContactSupportType } from '../../services/aide.service';

// Données mockées
const mockGuides: ArticleAide[] = [
  {
    id: 1,
    titre: 'Manuel d\'utilisation du système PNDA S&E',
    contenu: 'Guide complet pour prendre en main le système...',
    categorie: 'guide',
    tags: ['débutant', 'général'],
    date_creation: '2025-01-01',
    date_modification: '2026-03-15',
    auteur: 'UNCP',
  },
  {
    id: 2,
    titre: 'Guide de collecte de données terrain',
    contenu: 'Procédures pour la collecte des données...',
    categorie: 'guide',
    tags: ['collecte', 'terrain'],
    date_creation: '2025-02-10',
    date_modification: '2026-03-20',
    auteur: 'UNCP',
  },
  {
    id: 3,
    titre: 'Guide d\'utilisation du calculateur d\'indicateurs',
    contenu: 'Comment utiliser le calculateur d\'indicateurs...',
    categorie: 'guide',
    tags: ['indicateurs', 'calcul'],
    date_creation: '2025-03-01',
    date_modification: '2026-03-25',
    auteur: 'UNCP',
  },
];

const mockFAQ: FAQ[] = [
  { id: 1, question: 'Comment créer un compte utilisateur ?', reponse: 'La création de compte se fait par l\'administrateur...', categorie: 'compte', popularite: 45 },
  { id: 2, question: 'Comment synchroniser les données hors ligne ?', reponse: 'Cliquez sur le bouton "Synchroniser" en haut à droite...', categorie: 'collecte', popularite: 38 },
  { id: 3, question: 'Comment exporter un rapport ?', reponse: 'Dans la section Rapports, utilisez le bouton Exporter...', categorie: 'rapports', popularite: 32 },
  { id: 4, question: 'Comment traiter une plainte VBG ?', reponse: 'Les plaintes VBG sont confidentielles et traitées...', categorie: 'grm', popularite: 28 },
  { id: 5, question: 'Comment modifier un bénéficiaire ?', reponse: 'Dans la base de données bénéficiaires, cliquez sur Modifier...', categorie: 'beneficiaires', popularite: 25 },
  { id: 6, question: 'Que faire en cas d\'erreur technique ?', reponse: 'Contactez le support technique via le formulaire...', categorie: 'support', popularite: 20 },
];

const mockTutoriels: Tutoriel[] = [
  {
    id: 1,
    titre: 'Premiers pas avec le système',
    description: 'Découvrez les fonctionnalités principales du PNDA S&E',
    duree: '10 min',
    niveau: 'debutant',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    etapes: [
      { titre: 'Connexion', description: 'Utilisez vos identifiants fournis par l\'administrateur' },
      { titre: 'Navigation', description: 'Explorez les différents menus et tableaux de bord' },
      { titre: 'Première collecte', description: 'Apprenez à enregistrer vos premières données' },
    ],
  },
  {
    id: 2,
    titre: 'Collecte de données hors ligne',
    description: 'Utilisez l\'application mobile sans connexion internet',
    duree: '15 min',
    niveau: 'intermediaire',
    video_url: '',
    etapes: [
      { titre: 'Téléchargement', description: 'Installez l\'application PWA sur votre appareil' },
      { titre: 'Formulaires', description: 'Sélectionnez le formulaire approprié' },
      { titre: 'Synchronisation', description: 'Synchronisez vos données quand la connexion revient' },
    ],
  },
  {
    id: 3,
    titre: 'Analyse des indicateurs',
    description: 'Maîtrisez le calculateur d\'indicateurs et les tableaux de bord',
    duree: '20 min',
    niveau: 'avance',
    video_url: '',
    etapes: [
      { titre: 'Indicateurs IODP', description: 'Comprenez les objectifs de développement' },
      { titre: 'Calcul automatique', description: 'Utilisez le calculateur avec les formules' },
      { titre: 'Visualisation', description: 'Interprétez les graphiques et tendances' },
    ],
  },
];

const mockContact: ContactSupportType = {
  email: 'support@pnda.cd',
  telephone: '+243 123 456 789',
  horaires: 'Lundi - Vendredi, 8h00 - 17h00',
  urgence: '+243 999 888 777 (24h/24)',
};

type SearchResult = {
  type: 'guide' | 'faq' | 'tutoriel';
  titre: string;
  extrait: string;
};

export const AideDocumentation: React.FC = () => {
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
    // Charger les données
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setSearchResults([
        { type: 'guide', titre: 'Manuel d\'utilisation', extrait: 'Guide complet pour prendre en main le système...' },
        { type: 'faq', titre: 'Comment synchroniser les données ?', extrait: 'Cliquez sur le bouton "Synchroniser"...' },
        { type: 'tutoriel', titre: 'Premiers pas avec le système', extrait: 'Découvrez les fonctionnalités principales...' },
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendDemande = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
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
                  <Search />
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
        <Tab label="Guides" icon={<MenuBook />} iconPosition="start" />
        <Tab label="FAQ" icon={<Quiz />} iconPosition="start" />
        <Tab label="Tutoriels" icon={<OndemandVideo />} iconPosition="start" />
        <Tab label="Support" icon={<ContactSupport />} iconPosition="start" />
      </Tabs>

      {/* Onglet Guides */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {mockGuides.map((guide) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={guide.id}>
              <Card sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#E8F5E9' }}>
                      <Description sx={{ color: '#2E7D32' }} />
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
                  <Button size="small" startIcon={<OpenInNew />} onClick={() => { setSelectedGuide(guide); setGuideDialogOpen(true); }}>
                    Lire le guide
                  </Button>
                  <Button size="small" startIcon={<Download />}>
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
              {mockFAQ.map((faq) => (
                <Accordion key={faq.id} expanded={expandedFAQ === faq.id} onChange={() => setExpandedFAQ(expandedFAQ === faq.id ? false : faq.id)}>
                  <AccordionSummary expandIcon={<ArrowForward />}>
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
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#F1F8E9' }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Catégories FAQ
                </Typography>
                <List dense>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><Quiz fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Compte et connexion" />
                      <Chip label="3" size="small" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><Assignment fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Collecte de données" />
                      <Chip label="4" size="small" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><BarChart fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Indicateurs" />
                      <Chip label="2" size="small" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><Warning fontSize="small" /></ListItemIcon>
                      <ListItemText primary="GRM / Plaintes" />
                      <Chip label="2" size="small" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
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
          {mockTutoriels.map((tutoriel) => (
            <Grid size={{ xs: 12, md: 4 }} key={tutoriel.id}>
              <Card sx={{ borderRadius: 2, height: '100%', cursor: 'pointer' }} onClick={() => { setSelectedTutoriel(tutoriel); setTutorielDialogOpen(true); }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#E3F2FD' }}>
                      <OndemandVideo sx={{ color: '#1976D2' }} />
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
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Contactez-nous
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  <ListItem>
                    <ListItemIcon><Email sx={{ color: '#1976D2' }} /></ListItemIcon>
                    <ListItemText primary="Email" secondary={mockContact.email} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Phone sx={{ color: '#2E7D32' }} /></ListItemIcon>
                    <ListItemText primary="Téléphone" secondary={mockContact.telephone} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Schedule sx={{ color: '#FF8F00' }} /></ListItemIcon>
                    <ListItemText primary="Horaires" secondary={mockContact.horaires} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Warning sx={{ color: '#F44336' }} /></ListItemIcon>
                    <ListItemText primary="Urgence" secondary={mockContact.urgence} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 2 }}>
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
              <Button variant="contained" startIcon={<Download />} sx={{ bgcolor: '#2E7D32' }}>Télécharger PDF</Button>
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
            <Alert severity="success" icon={<CheckCircle />}>
              Votre demande a été envoyée avec succès ! Nous vous répondrons dans les plus brefs délais.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Vérifiez vos informations avant validation :
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
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