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
  Tabs,
  Tab,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const LoginPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);

  // Email login state
  const [email, setEmail] = useState('');

  // Mobile OTP login state
  const [mobile, setMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState('');

  // Shared state
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await apiClient.sendOtp(mobile);
      setOtpSent(true);
      setSuccessMessage('OTP sent successfully! Check your phone.');
      if (response.otpCode) {
        setDevOtpCode(response.otpCode);
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
      await loginWithOtp(mobile, otpCode);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setError('');
    setSuccessMessage('');
    setOtpSent(false);
    setOtpCode('');
    setDevOtpCode('');
  };

  const handleChangeMobile = () => {
    setOtpSent(false);
    setOtpCode('');
    setDevOtpCode('');
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
        <Paper elevation={3} sx={{ padding: 3, width: '100%', maxWidth: 500 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Time Tracker
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
            Sign in to continue
          </Typography>

          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Email" />
            <Tab label="Mobile OTP" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {successMessage}
            </Alert>
          )}

          {/* Email Login Tab */}
          <TabPanel value={tabIndex} index={0}>
            <Box component="form" onSubmit={handleEmailSubmit}>
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
          </TabPanel>

          {/* Mobile OTP Login Tab */}
          <TabPanel value={tabIndex} index={1}>
            {!otpSent ? (
              <Box component="form" onSubmit={handleSendOtp}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="mobile"
                  label="Mobile Number"
                  name="mobile"
                  placeholder="+1234567890"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={isLoading}
                  helperText="Enter your mobile number with country code (e.g., +1234567890)"
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 2, mb: 1 }}
                  disabled={isLoading || !mobile}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Send OTP'}
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleVerifyOtp}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  OTP sent to <strong>{mobile}</strong>
                </Typography>

                {devOtpCode && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Development mode - OTP: <strong>{devOtpCode}</strong>
                  </Alert>
                )}

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="otpCode"
                  label="Enter OTP"
                  name="otpCode"
                  placeholder="123456"
                  autoFocus
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(val);
                  }}
                  disabled={isLoading}
                  inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                  helperText="Enter the 6-digit OTP sent to your mobile"
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 2, mb: 1 }}
                  disabled={isLoading || otpCode.length !== 6}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Verify & Log In'}
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  sx={{ mb: 1 }}
                  onClick={handleChangeMobile}
                  disabled={isLoading}
                >
                  Change Mobile Number
                </Button>
              </Box>
            )}
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
