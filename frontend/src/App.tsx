// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeModeProvider } from './context/ThemeModeContext';
import { store } from './store/store';
import { Layout } from './components/common/Layout/Layout';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { LoginPage } from './pages/Auth/LoginPage';
import { NationalDashboard } from './pages/Dashboard/NationalDashboard';
import { BeneficiaireList } from './pages/Beneficiaires/BeneficiaireList';
import { PlainteList } from './pages/GRM/PlainteList';
import { IODPList } from './pages/Indicateurs/IODPList';
import { IRList } from './pages/Indicateurs/IRList';
import { IndicateurDetail } from './pages/Indicateurs/IndicateurDetail';
import { RisqueList } from './pages/Risques/RisqueList';
import { CadreResultats } from './pages/CadreResultats/CadreResultats';
import { PowerBIReports } from './pages/Rapports/PowerBIReports';
import { CollecteMobile } from './pages/Collecte/CollecteMobile';
import { ProvincialDashboard } from './pages/Dashboard/ProvincialDashboard';
import { PartnerDashboard } from './pages/Dashboard/PartnerDashboard';
import { FournisseurList } from './pages/Beneficiaires/FournisseurList';
import { DistributionCartesPage } from './pages/Beneficiaires/DistributionCartesPage';
import { VentesSemencesPage } from './pages/Beneficiaires/VentesSemencesPage';
import { CartographiePage } from './pages/Outils/CartographiePage';
import { OrganisationList } from './pages/Beneficiaires/OrganisationList';
import { IndicateurCalculator } from './pages/Outils/Calculateur/IndicateurCalculator';
import { ConfigurationPage } from './pages/Admin/ConfigurationPage';
import { BeneficiaireDatabase } from './pages/Database/BeneficiaireDatabase';
import { ActivitesDatabase } from './pages/Database/ActivitesDatabase';
import { IndicateursDatabase } from './pages/Database/IndicateursDatabase';
import { Utilisateurs } from './pages/Admin/Utilisateurs';
import { EnvironnementVBG } from './pages/Indicateurs/EnvironnementVBG';
import { ProfilePage } from './pages/Profil/ProfilePage';
import { SuiviMissions } from './pages/Suivis/SuiviMissions';
import { ActivitesSuivi } from './pages/Suivis/ActivitesSuivi';
import { SuiviPTBA } from './pages/Suivis/SuiviPTBA';
import { DashboardAC } from './pages/AgentCollecteur/DashboardAC';
import { OTDashboard } from './pages/Dashboard/OTDashboard';
import { AideDocumentation } from './pages/Aide/AideDocumentation';
import { PlanAttenuation } from './pages/Risques/PlanAttenuation';
import { AlertesRisques } from './pages/Risques/AlertesRisques';
import { NotificationsPage } from './pages/Notifications/NotificationsPage';
import { BeneficiaireDashboard } from './pages/Beneficiaires/BeneficiaireDashboard';

// Rôles et page d'accueil par défaut
const DEFAULT_HOME: Record<string, string> = {
  super_admin: '/dashboard/national',
  admin: '/dashboard/national',
  uncp: '/dashboard/national',
  upep: '/dashboard/provincial',
  ot: '/dashboard/ot',
  partenaire: '/dashboard/partenaires',
};

const getStoredUser = () => {
  try {
    const s = localStorage.getItem('user');
    return s ? (JSON.parse(s) as { role: string }) : null;
  } catch {
    return null;
  }
};

// Composant de protection des routes avec contrôle par rôle
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  roles?: string[];
}> = ({ children, roles }) => {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const home = DEFAULT_HOME[user.role] ?? '/dashboard/provincial';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

// Redirection intelligente depuis "/"
const HomeRedirect: React.FC = () => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  const home = DEFAULT_HOME[user.role] ?? '/dashboard/provincial';
  return <Navigate to={home} replace />;
};

function App() {
  return (
    <Provider store={store}>
      <ThemeModeProvider>
        <BrowserRouter>
          <AuthProvider>
            <NotificationsProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Redirection accueil selon rôle */}
                <Route path="/" element={<HomeRedirect />} />

                {/* admin + uncp uniquement */}
                <Route path="/dashboard/national" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp']}>
                    <Layout><NationalDashboard /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/utilisateurs" element={
                  <ProtectedRoute roles={['super_admin']}>
                    <Layout><Utilisateurs /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/configurations" element={
                  <ProtectedRoute roles={['super_admin']}>
                    <Layout><ConfigurationPage /></Layout>
                  </ProtectedRoute>
                } />

                {/* admin + uncp + upep */}
                <Route path="/dashboard/provincial" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><ProvincialDashboard /></Layout>
                  </ProtectedRoute>
                } />

                {/* ot uniquement */}
                <Route path="/dashboard/ot" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><OTDashboard /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/indicateurs/iodp" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot', 'partenaire']}>
                    <Layout><IODPList /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/indicateurs/ir" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot', 'partenaire']}>
                    <Layout><IRList /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/indicateurs/cadre" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot', 'partenaire']}>
                    <Layout><CadreResultats /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/indicateurs/environnement" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot', 'partenaire']}>
                    <Layout><EnvironnementVBG /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/indicateurs/:id" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot', 'partenaire']}>
                    <Layout><IndicateurDetail /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/beneficiaires/rna" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><BeneficiaireList /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/beneficiaires/organisations" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><OrganisationList /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/beneficiaires/fournisseurs" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><FournisseurList /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/beneficiaires/cartes" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><DistributionCartesPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/beneficiaires/ventes-semences" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><VentesSemencesPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/suivi/missions" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><SuiviMissions /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/suivi/activites" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><ActivitesSuivi /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/suivi/ptba" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot', 'partenaire']}>
                    <Layout><SuiviPTBA /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/risques/registre" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><RisqueList /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/risques/plan" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><PlanAttenuation /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/risques/alertes" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><AlertesRisques /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/database/plaintes" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><PlainteList /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/database/beneficiaires" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><BeneficiaireDatabase /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/database/activites" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><ActivitesDatabase /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/database/indicateurs" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><IndicateursDatabase /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/outils/calculateur" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><IndicateurCalculator /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/outils/collecte" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><CollecteMobile /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/outils/cartographie" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><CartographiePage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/rapports" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'partenaire']}>
                    <Layout><PowerBIReports /></Layout>
                  </ProtectedRoute>
                } />

                {/* Partenaires */}
                <Route path="/dashboard/partenaires" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'partenaire']}>
                    <Layout><PartnerDashboard /></Layout>
                  </ProtectedRoute>
                } />

                {/* Agent collecteur */}
                <Route path="/agent/dashboard" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep', 'ot']}>
                    <Layout><DashboardAC /></Layout>
                  </ProtectedRoute>
                } />

                {/* Accessible a tous les authentifies */}
                <Route path="/profil" element={
                  <ProtectedRoute>
                    <Layout><ProfilePage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Layout><NotificationsPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/aide" element={
                  <ProtectedRoute>
                    <Layout>
                      <AideDocumentation />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/beneficiaires/dashboard" element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'uncp', 'upep']}>
                    <Layout><BeneficiaireDashboard /></Layout>
                  </ProtectedRoute>
                } />
                {/* Fallback */}
                <Route path="*" element={<HomeRedirect />} />
              </Routes>
            </NotificationsProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeModeProvider>
    </Provider>
  );
}

export default App;
