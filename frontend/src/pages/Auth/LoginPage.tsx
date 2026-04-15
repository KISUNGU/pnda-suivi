// frontend/src/pages/Auth/LoginPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Container,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GoogleIcon from '../../components/common/GoogleIcon';
import { PndaLogo } from '../../components/common/PndaLogo';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard/national');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#F1F8E9',
        background: 'radial-gradient(circle at top, rgba(76, 175, 80, 0.12), transparent 38%), linear-gradient(180deg, #F7FBF2 0%, #EDF6E5 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, borderRadius: '10px', boxShadow: '0 24px 48px rgba(45, 80, 22, 0.12)' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <PndaLogo height={124} sx={{ maxWidth: '100%' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              PNDA S&E
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Système de Suivi-Évaluation
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <GoogleIcon name="visibility_off" size={24} /> : <GoogleIcon name="visibility" size={24} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                bgcolor: '#2E7D32',
                '&:hover': { bgcolor: '#1B5E20' },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Se connecter'}
            </Button>
          </form>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            Utilisez un compte existant dans la table utilisateur.<br />
            Plusieurs comptes importés utilisent encore le mot de passe initial password123.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};