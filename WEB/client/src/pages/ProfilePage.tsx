import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Paper,
  Grid,
  Avatar,
  Slider,
  FormControl,
  FormLabel,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ProfilePage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [workplace, setWorkplace] = useState<string>('');
  const [disabilityType, setDisabilityType] = useState<string>('');
  const [disabilityLevel, setDisabilityLevel] = useState<number>(1);
  const [role, setRole] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data } = response;
        setUsername(data.lastName + data.firstName || '');
        setEmail(data.email || '');
        setWorkplace(data.affiliation || '');
        setDisabilityType(data.disabilityType || '');
        setDisabilityLevel(parseInt(data.disabilityLevel, 10) || 1);
        setRole(data.role || 'user');
      } catch (err) {
        setError('프로필 정보를 가져오는 데 실패했습니다.');
        localStorage.removeItem('jwt_token');
        navigate('/');
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    const updateData: any = { username };
    if (role === 'admin') {
      updateData.affiliation = workplace;
    } else if (role === 'user') {
      updateData.disabilityType = disabilityType;
      updateData.disabilityLevel = disabilityLevel.toString();
    }

    try {
      await axios.put(`${API_URL}/user/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('프로필이 성공적으로 업데이트되었습니다.');
      setError('');
    } catch (err) {
      setError('프로필 업데이트에 실패했습니다.');
      setMessage('');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    try {
      await axios.delete(`${API_URL}/user/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.removeItem('jwt_token');
      navigate('/');
    } catch (err) {
      setError('계정 삭제에 실패했습니다.');
    }
  };

  return (
    <Container component="main">
      <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <AccountCircleIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            프로필 수정
          </Typography>
          {message && <Alert severity="success" sx={{ mt: 2, width: '100%' }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
          <Box component="form" noValidate sx={{ mt: 3 }}>
            <Grid container spacing={1.5}>
              <Grid sx={{ xs: 12, width : "100%", mt : 2 }}>
                <TextField
                  fullWidth
                  id="username"
                  label="사용자 이름"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Grid>
              <Grid sx={{ xs: 12, width : "100%", mt : 1 }}>
                <TextField
                  fullWidth
                  id="email"
                  label="이메일"
                  name="email"
                  value={email}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              {role === 'admin' && (
                <Grid sx={{ xs: 12, width: "100%", mt : 1 }}>
                  <TextField
                    fullWidth
                    name="workplace"
                    label="근무지"
                    id="workplace"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                  />
                </Grid>
              )}
              {role === 'user' && (
                <>
                  <Grid sx={{ xs: 12, width : '100%', mt : 1 }}>
                    <TextField
                      fullWidth
                      name="disabilityType"
                      label="장애 유형 및 특이사항"
                      id="disabilityType"
                      value={disabilityType}
                      onChange={(e) => setDisabilityType(e.target.value)}
                    />
                  </Grid>
                  <Grid sx={{ xs: 12, width : '99%', mt : 1}}>
                    <FormControl fullWidth >
                      <FormLabel htmlFor="disabilityLevel">장애 정도</FormLabel>
                      <Slider
                        id="disabilityLevel"
                        value={disabilityLevel}
                        onChange={(_, newValue) => setDisabilityLevel(newValue as number)}
                        aria-labelledby="disability-level-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={1}
                        max={10}
                        
                      />
                    </FormControl>
                  </Grid>
                </>
              )}
            </Grid>
            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 4, mb: 1}}
              onClick={handleUpdateProfile}
            >
              프로필 업데이트
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              sx={{ mb: 2 }}
              onClick={handleDeleteAccount}
            >
              계정 삭제
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;
