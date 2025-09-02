import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Box,
  CircularProgress,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GoogleIcon from '@mui/icons-material/Google';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';

// ... (interface definitions remain the same)
interface Room {
  id: number;
  name: string;
  password?: string;
}

interface UserInfo {
  id: number;
  email: string;
  role: string;
}

const HomePage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isJoinRoomModalOpen, setIsJoinRoomModalOpen] = useState(false);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    setIsLoggedIn(token);

    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(function (c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join(''),
        );
        setUserInfo(JSON.parse(jsonPayload));
      } catch (error) {
        console.error('Failed to decode JWT token:', error);
        setIsLoggedIn(null);
        localStorage.removeItem('jwt_token');
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userInfo) {
      setLoading(true);
      const fetchRooms = async () => {
        if (userInfo.role === 'admin') {
          await fetchMyRooms();
        } else {
          await fetchJoinedRooms();
        }
        setLoading(false);
      };
      fetchRooms();
    }
  }, [userInfo]);

  const fetchMyRooms = async () => {
    if (!isLoggedIn) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/room/my-rooms`, {
        headers: { Authorization: `Bearer ${isLoggedIn}` },
      });
      if (!response.ok) throw new Error('내 룸 목록을 가져오는데 실패했습니다.');
      const data: Room[] = await response.json();
      setMyRooms(data);
    } catch (error) {
      console.error('Error fetching my rooms:', error);
      alert('내 룸 목록을 가져오는데 실패했습니다.');
    }
  };

  const fetchJoinedRooms = async () => {
    if (!isLoggedIn) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/room/joined-rooms`, {
        headers: { Authorization: `Bearer ${isLoggedIn}` },
      });
      if (!response.ok) throw new Error('가입한 룸 목록을 가져오는데 실패했습니다.');
      const data: Room[] = await response.json();
      setJoinedRooms(data);
    } catch (error) {
      console.error('Error fetching joined rooms:', error);
      alert('가입한 룸 목록을 가져오는데 실패했습니다.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  const handleCreateRoom = async (roomName: string, roomPassword?: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${isLoggedIn}`,
        },
        body: JSON.stringify({ name: roomName, password: roomPassword }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '룸 개설 실패');
      }
      setIsCreateRoomModalOpen(false);
      fetchMyRooms();
    } catch (error: any) {
      alert('룸 개설에 실패했습니다: ' + error.message);
    }
  };

  const handleJoinRoom = async (roomId: number, password?: string) => {
    if (!isLoggedIn) return alert('로그인이 필요합니다.');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${isLoggedIn}`,
        },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '룸 가입 실패');
      }
      setIsJoinRoomModalOpen(false);
      fetchJoinedRooms();
    } catch (error: any) {
      alert('룸 가입에 실패했습니다: ' + error.message);
    }
  };

  const renderRooms = (rooms: Room[], title: string, actionButton: React.ReactNode) => (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          {title}
        </Typography>
        {actionButton}
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : rooms.length > 0 ? (
        <Grid container spacing={1}>
          {rooms.map((room) => (
            <Grid key={room.id} sx={{ xs: 12, sm: 6, md: 4, mr : 2 }}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea sx={{ height: '100%' }} onClick={() => navigate(`/room/${room.id}`)}>
                  <CardContent>
                    <Typography variant="h6" component="div">{room.name}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
          {title}이 없습니다.
        </Typography>
      )}
    </Paper>
  );

  if (!isLoggedIn) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(80vh - 100px)',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          AI 기반 장애인 보호작업장 직업훈련교육플랫폼
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
          훈련을 시작하고 작업을 효율적으로 관리하세요.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleLogin}
        >
          구글로 시작하기
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      {userInfo && userInfo.role === 'admin'
        ? renderRooms(myRooms, '내가 개설한 룸', 
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsCreateRoomModalOpen(true)}>
              룸 개설하기
            </Button>
          )
        : renderRooms(joinedRooms, '내가 가입한 룸', 
            <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => setIsJoinRoomModalOpen(true)}>
              룸 가입하기
            </Button>
          )}

      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onCreateRoom={handleCreateRoom}
      />

      {(!userInfo || userInfo.role !== 'admin') && (
        <JoinRoomModal
          isOpen={isJoinRoomModalOpen}
          onClose={() => setIsJoinRoomModalOpen(false)}
          onJoinRoom={handleJoinRoom}
          jwtToken={isLoggedIn || ''}
        />
      )}
    </Container>
  );
};

export default HomePage;
