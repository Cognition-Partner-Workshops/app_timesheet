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
  Link,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import MrCooperLogo from '../components/MrCooperLogo';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await requestOtp(email);
      setOtpSent(true);
      setSuccessMessage('OTP sent successfully! Check your email.');
      // Store demo OTP for display (only for demo purposes)
      if (response._demo_otp) {
        setDemoOtp(response._demo_otp);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await verifyOtp(email, otp);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setOtpSent(false);
    setOtp('');
    setDemoOtp('');
    setError('');
    setSuccessMessage('');
  };

  return (
    <Container component="main" maxWidth="sm">
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        px: 2,
      }}
    >
      <Paper elevation={3} sx={{ padding: 4, width: '100%', maxWidth: 500 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <MrCooperLogo width={200} height={82} />
        </Box>
        <Typography component="h1" variant="h5" align="center" gutterBottom sx={{ fontWeight: 600, color: '#111111' }}>
          Time Tracker
        </Typography>

        {!otpSent ? (
          <>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email to receive a one-time password
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleRequestOtp}>
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
                {isLoading ? <CircularProgress size={24} /> : 'Send OTP'}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 1 }}>
              Enter the 6-digit OTP sent to <strong>{email}</strong>
            </Typography>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            {demoOtp && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Demo OTP:</strong> {demoOtp}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (In production, this would be sent via email only)
                </Typography>
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleVerifyOtp}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="otp"
                label="One-Time Password"
                name="otp"
                autoFocus
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(val);
                }}
                disabled={isLoading}
                inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                placeholder="Enter 6-digit OTP"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 1 }}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Verify OTP'}
              </Button>
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={handleBackToEmail}
                  sx={{ cursor: 'pointer' }}
                >
                  Back to email
                </Link>
                {' | '}
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={handleRequestOtp as unknown as React.MouseEventHandler}
                  sx={{ cursor: 'pointer' }}
                >
                  Resend OTP
                </Link>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Box>
    </Container>
  );
};

export default LoginPage;
