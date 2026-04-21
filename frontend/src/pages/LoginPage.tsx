import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Box
        sx={{
          backgroundColor: '#063E27',
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Box
          component="img"
          src="/ksu-logo.png"
          alt="KSU Logo"
          sx={{ height: 48, width: 'auto' }}
        />
        <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
          King Saud University
        </Typography>
      </Box>

      <Container component="main" maxWidth="sm" sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%', py: 4 }}>
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              width: '100%',
              maxWidth: 500,
              mx: 'auto',
              borderTop: '4px solid #063E27',
            }}
          >
            <Typography component="h1" variant="h4" align="center" gutterBottom sx={{ color: '#063E27', fontWeight: 700 }}>
              Time Tracker
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email to log in
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              This app intentionally does not have a password field.
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 1 }}
                disabled={isLoading || !email}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Log In'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>

      <Box
        sx={{
          backgroundColor: '#063E27',
          py: 1.5,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          King Saud University &copy; {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
