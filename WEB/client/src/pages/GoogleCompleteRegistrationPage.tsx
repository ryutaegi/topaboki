import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Box, Paper, Typography, Button } from '@mui/material';

interface JwtPayload {
  sub: number; // user ID
  isRegistrationComplete?: boolean;
}

const GoogleCompleteRegistrationPage: React.FC = () => {
  const [role, setRole] = useState('user');
  const [affiliation, setAffiliation] = useState('');
  const [disabilityType, setDisabilityType] = useState('');
  const [disabilityLevel, setDisabilityLevel] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    console.log('JWT Token!:', token);
    if (!token) {
      navigate('/login'); // 토큰 없으면 로그인 페이지로
      return;
    }
    localStorage.setItem('jwt_token', token);
    // 토큰 유효성 검사는 백엔드에서 이미 했으므로 여기서는 디코딩만
    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      if (decodedToken.isRegistrationComplete) {
        navigate('/'); // 이미 등록 완료되었으면 메인 페이지로
      }
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      navigate('/login');
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const token = localStorage.getItem('jwt_token');
    console.log(token)
    if (!token) {
      setMessage('Authentication token not found.');
      return;
    }

    try {
      const registrationData = {
        role,
        ...(role === 'admin' && { affiliation }),
        ...(role === 'user' && { disabilityType, disabilityLevel }),
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google/complete-registration`,
        registrationData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.access_token) {
        localStorage.setItem('jwt_token', response.data.access_token);
        setMessage('Registration complete!');
        navigate('/'); // 등록 완료 후 메인 페이지로 이동
      } else {
        setMessage(response.data.message || 'Registration failed.');
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        padding: '20px',
      }}
    >
      <Paper elevation={3} sx={{ padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          추가 정보를 입력해주세요
        </Typography>
        <form onSubmit={handleSubmit}>
          <div>
            <label>구분:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">사용자(장애인)</option>
              <option value="admin">관리자(사회복지사, 직업훈련교사)</option>
            </select>
          </div>

          {role === 'admin' && (
            <div>
              <label>근무지 :</label>
              <input type="text" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} required />
            </div>
          )}

          {role === 'user' && (
            <>
              <div>
                <label>장애 유형 및 특이사항:</label>
                <input type="text" value={disabilityType} onChange={(e) => setDisabilityType(e.target.value)} required />
              </div>
              <div>
                <label>장애 정도(심하지 않은 장애 ~ 심한 장애):</label>
                <input type="range" min={1} max={10} value={disabilityLevel} onChange={(e) => setDisabilityLevel(e.target.value)} required style={{ width: '100%' }} />
              </div>
            </>
          )}

          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }}>
            등록하기
          </Button>
        </form>
        {message && <Typography color="error" sx={{ mt: 2 }} align="center">{message}</Typography>}
      </Paper>
    </Box>
  );
};

export default GoogleCompleteRegistrationPage;
