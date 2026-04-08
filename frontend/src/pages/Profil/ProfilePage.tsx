// frontend/src/pages/Profil/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';

const roleLabels: Record<string, string> = {
  admin: 'Administrateur système',
  uncp: 'UNCP - Coordinateur S&E',
  upep: 'UPEP - Coordinateur provincial',
  ot: 'Opérateur Technique',
  partenaire: 'Partenaire',
  invite: 'Invité',
};

const roleColors: Record<string, 'error' | 'success' | 'primary' | 'warning' | 'secondary' | 'default'> = {
  admin: 'error',
  uncp: 'success',
  upep: 'primary',
  ot: 'warning',
  partenaire: 'secondary',
  invite: 'default',
};

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Info form
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState('');
  const [infoError, setInfoError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (user) {
      setNom(user.nom);
      setPrenom(user.prenom);
      setTelephone(user.telephone ?? '');
    }
  }, [user]);

  const handleSaveInfo = async () => {
    setInfoLoading(true);
    setInfoSuccess('');
    setInfoError('');
    try {
      const updated = await authService.updateProfile({ nom, prenom, telephone });
      updateUser(updated);
      setInfoSuccess('Profil mis à jour avec succès.');
    } catch {
      setInfoError('Erreur lors de la mise à jour du profil.');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwSuccess('');
    setPwError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Veuillez remplir tous les champs.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setPwLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPwSuccess('Mot de passe modifié avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwError(msg ?? 'Erreur lors du changement de mot de passe.');
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;

  const initials = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Mon profil
      </Typography>

      {/* Identity card */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '1.75rem' }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              {user.prenom} {user.nom}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {user.email}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={roleLabels[user.role] ?? user.role}
                color={roleColors[user.role] ?? 'default'}
                size="small"
              />
              {user.province && (
                <Chip
                  icon={<GoogleIcon name="location_on" size={16} />}
                  label={user.province}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Edit info */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <GoogleIcon name="person" size={22} sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Informations personnelles
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {infoSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfoSuccess('')}>{infoSuccess}</Alert>}
          {infoError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setInfoError('')}>{infoError}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Prénom"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Nom"
              value={nom}
              onChange={e => setNom(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Email"
              value={user.email}
              fullWidth
              size="small"
              disabled
              helperText="L'email ne peut pas être modifié"
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="Téléphone"
              value={telephone}
              onChange={e => setTelephone(e.target.value)}
              fullWidth
              size="small"
              placeholder="+243 8X XXX XXXX"
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveInfo}
              disabled={infoLoading}
              startIcon={infoLoading ? <CircularProgress size={16} /> : <GoogleIcon name="save" size={18} />}
            >
              Enregistrer
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <GoogleIcon name="lock" size={22} sx={{ color: 'warning.main' }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Changer le mot de passe
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {pwSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPwSuccess('')}>{pwSuccess}</Alert>}
          {pwError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPwError('')}>{pwError}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
            <TextField
              label="Mot de passe actuel"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              fullWidth
              size="small"
              helperText="Minimum 6 caractères"
            />
            <TextField
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleChangePassword}
              disabled={pwLoading}
              startIcon={pwLoading ? <CircularProgress size={16} /> : <GoogleIcon name="key" size={18} />}
            >
              Changer le mot de passe
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
