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
  const [tabValue, setTabValue] = useState(0);

  // Email login state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // OTP login state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');

  const { login, loginWithPhone, sendOtp } = useAuth();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);

    try {
      await login(email);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setEmailError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    setDemoOtp('');

    try {
      const result = await sendOtp(phone);
      setOtpSent(true);
      if (result.demo_otp) {
        setDemoOtp(result.demo_otp);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setOtpError(error.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);

    try {
      await loginWithPhone(phone, otp);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setOtpError(error.response?.data?.error || 'OTP verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChangePhone = () => {
    setOtpSent(false);
    setOtp('');
    setDemoOtp('');
    setOtpError('');
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
          Choose your login method
        </Typography>

        <Tabs
          value={tabValue}
          onChange={(_e, newValue: number) => setTabValue(newValue)}
          variant="fullWidth"
          sx={{ mb: 1 }}
        >
          <Tab label="Email" />
          <Tab label="Mobile OTP" />
        </Tabs>

        {/* Email Login Tab */}
        <TabPanel value={tabValue} index={0}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This app intentionally does not have a password field.
          </Alert>

          {emailError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {emailError}
            </Alert>
          )}

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
              disabled={emailLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2, mb: 1 }}
              disabled={emailLoading || !email}
            >
              {emailLoading ? <CircularProgress size={24} /> : 'Log In'}
            </Button>
          </Box>
        </TabPanel>

        {/* Mobile OTP Login Tab */}
        <TabPanel value={tabValue} index={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter your mobile number to receive a one-time password.
          </Alert>

          {otpError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {otpError}
            </Alert>
          )}

          {demoOtp && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Demo OTP: <strong>{demoOtp}</strong> (auto-filled below)
            </Alert>
          )}

          {!otpSent ? (
            <Box component="form" onSubmit={handleSendOtp}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="phone"
                label="Mobile Number"
                name="phone"
                placeholder="+1234567890"
                helperText="Enter with country code (e.g., +1234567890)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={otpLoading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 1 }}
                disabled={otpLoading || !phone}
              >
                {otpLoading ? <CircularProgress size={24} /> : 'Send OTP'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleVerifyOtp}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                OTP sent to <strong>{phone}</strong>
              </Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                id="otp"
                label="Enter OTP"
                name="otp"
                placeholder="123456"
                inputProps={{ maxLength: 6 }}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={otpLoading}
                autoFocus
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 1 }}
                disabled={otpLoading || otp.length !== 6}
              >
                {otpLoading ? <CircularProgress size={24} /> : 'Verify & Log In'}
              </Button>
              <Button
                fullWidth
                variant="text"
                size="small"
                onClick={handleChangePhone}
                disabled={otpLoading}
                sx={{ mt: 0.5 }}
              >
                Change Phone Number
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
