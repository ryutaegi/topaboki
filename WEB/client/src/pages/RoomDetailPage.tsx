import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Alert,
  Box,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { Grid } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import ImageIcon from '@mui/icons-material/Image';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HomeIcon from '@mui/icons-material/Home';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DeleteIcon from '@mui/icons-material/Delete';

import { useNavigate } from 'react-router-dom';

import RoomSettingsModal from '../components/RoomSettingsModal';
import ClassificationImageUploadModal from '../components/ClassificationImageUploadModal';
import CustomCircularProgress from '../components/CircularProgress'; // Renamed to avoid conflict
import { type SimpleStep } from './WorkInstructionPage';

// ... (interfaces remain the same)
interface User {
  id: number;
  email: string;
  username: string;
}

interface Room {
  id: number;
  name: string;
  password?: string;
  steps: Record<string, SimpleStep[]>;
  users: User[];
  creator: User;
  normalImages: string[];
  abnormalImages: string[];
}

interface AnalysisResult {
  판단: string;
  이유: string;
}

const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const roomId = Number(id);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isClassificationModalOpen, setIsClassificationModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [allUserPoints, setAllUserPoints] = useState<Record<number, number>>({});
  const [isWorking, setIsWorking] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userJudgmentResult, setUserJudgmentResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ... (useEffect for fetching data remains largely the same)
  useEffect(() => {
    const fetchRoomDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          setError('로그인이 필요합니다.');
          setLoading(false);
          return;
        }

        const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!userResponse.ok) throw new Error('사용자 정보를 가져올 수 없습니다.');
        const userData = await userResponse.json();
        setCurrentUser(userData);

        const pointsResponse = await fetch(`${import.meta.env.VITE_API_URL}/user/${userData.id}/room/${roomId}/points`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (pointsResponse.ok) setUserPoints(await pointsResponse.json());

        const roomResponse = await fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!roomResponse.ok) {
          const errorData = await roomResponse.json();
          throw new Error(errorData.message || '룸 정보를 가져오는데 실패했습니다.');
        }
        const roomData: Room = await roomResponse.json();
        setRoom(roomData);

        if (userData.role === 'admin' && roomData.users) {
          const pointsPromises = roomData.users.map(user =>
            fetch(`${import.meta.env.VITE_API_URL}/user/${user.id}/room/${roomId}/points`, {
              headers: { 'Authorization': `Bearer ${token}` },
            }).then(res => res.ok ? res.json() : 0)
          );
          const points = await Promise.all(pointsPromises);
          const userPointsMap = roomData.users.reduce((acc, user, index) => {
            acc[user.id] = points[index];
            return acc;
          }, {} as Record<number, number>);
          setAllUserPoints(userPointsMap);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (roomId) fetchRoomDetails();
  }, [roomId]);

  // ... (useEffect for camera remains the same)
  useEffect(() => {
    if (isWorking) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("카메라를 시작할 수 없습니다:", err);
          setError("카메라를 시작할 수 없습니다. 권한을 확인해주세요.");
          setIsWorking(false);
        }
      };
      startCamera();

      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [isWorking]);

  // ... (handler functions remain the same, just simplified)
  const handleSettingsSave = () => window.location.reload();
  const handleClassificationImagesSave = () => {
    setIsClassificationModalOpen(false);
    window.location.reload();
  };
  const handleStartWork = () => setIsWorking(true);
  
  const handleStopWork = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsWorking(false);
    setAnalysisResult(null);
    setUserJudgmentResult(null);
  }, []);

  const handleCaptureAndAnalyze = useCallback(async (userJudgment: '정상' | '비정상') => { 
    if (!videoRef.current) return;

    setIsAnalyzing(true);
    setUserJudgmentResult(null);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          setError('로그인이 필요합니다.');
          setIsAnalyzing(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze?roomId=${roomId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('분석에 실패했습니다.');
        }

        const apiResult: AnalysisResult = await response.json();

        setAnalysisResult({
          판단: apiResult.판단,
          이유: apiResult.이유,
        });

        if (apiResult.판단 === userJudgment) {
          setUserJudgmentResult('정답');
          if (currentUser) {
            const newPoints = userPoints + 10;
            const updatePointsResponse = await fetch(`${import.meta.env.VITE_API_URL}/user/${currentUser.id}/room/${roomId}/points`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ points: newPoints }),
            });

            if (updatePointsResponse.ok) {
              setUserPoints(newPoints);
            }
          }
        } else if (apiResult.판단 === '정상' || apiResult.판단 === '비정상') {
          setUserJudgmentResult('오답');
        } else {
          setUserJudgmentResult('판독할 수 없음');
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsAnalyzing(false);
      }
    }, 'image/jpeg');
  }, [roomId, currentUser, userPoints]);

  const handleReturnToCamera = () => {
    setAnalysisResult(null);
    setUserJudgmentResult(null);
    setError(null);
  };

  const navigate = useNavigate();

  const handleDeleteRoom = async () => {
    if (!window.confirm('정말로 이 룸을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '룸 삭제에 실패했습니다.');
      }

      alert('룸이 성공적으로 삭제되었습니다.');
      navigate('/'); // Redirect to home page
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isWorking || isAnalyzing || analysisResult) return;

    switch (event.key.toLowerCase()) {
      case 'n':
        handleCaptureAndAnalyze('정상');
        break;
      case 'a':
        handleCaptureAndAnalyze('비정상');
        break;
      case 'x':
        handleStopWork();
        break;
      default:
        break;
    }
  }, [isWorking, isAnalyzing, analysisResult, handleCaptureAndAnalyze, handleStopWork]);

  useEffect(() => {
    if (isWorking) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWorking, handleKeyDown]);

  useEffect(() => {
    const handleRoomDetailKeyDown = (event: KeyboardEvent) => {
      if (isWorking) return; // 작업 모드가 아닐 때만 실행

      const key = event.key.toLowerCase();

      if (key === 'n') {
        const startWorkButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('작업 시작'));
        if (startWorkButton) {
          (startWorkButton as HTMLElement).click();
        }
      } else if (key === 'a') {
        const workInstructionLink = Array.from(document.querySelectorAll('a')).find(link => link.textContent?.includes('작업 방법'));
        if (workInstructionLink) {
          (workInstructionLink as HTMLElement).click();
        }
      }
    };

    document.addEventListener('keydown', handleRoomDetailKeyDown);

    return () => {
      document.removeEventListener('keydown', handleRoomDetailKeyDown);
    };
  }, [isWorking]); // isWorking 상태가 변경될 때마다 실행


  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  // This is the work mode UI, untouched for now
  if (isWorking) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'black' }}>
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
          <CustomCircularProgress points={userPoints} />
        </div>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            display: isAnalyzing || analysisResult || error ? 'none' : 'block' 
          }} 
        />
        
        {isAnalyzing && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '24px', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                분석 중...
            </div>
        )}

        {analysisResult && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', textAlign: 'center' }}>
                {userJudgmentResult === '정답' ? (
                    <Typography variant="h4" color="green" fontWeight={"bold"} gutterBottom>✅&ensp;정답입니다&ensp;✅</Typography>
                ) : userJudgmentResult === '오답' ? (
                    <>
                        <Typography variant="h4" color="red" fontWeight={"bold"} gutterBottom>❌&ensp;오답입니다&ensp;❌</Typography>
                        <Typography variant="body1" color="red">{analysisResult.이유}</Typography>
                        {room?.normalImages?.[0] && (
                          <div>
                            <Typography variant="body1" marginTop={"30px"} fontWeight={"bold"}>⬇️&ensp;이렇게 해주세요&ensp;⬇️</Typography>
                            <Box>
                                
                                <img 
                                    src={`${import.meta.env.VITE_API_URL}/${room.normalImages[0].startsWith('/') ? room.normalImages[0].substring(1) : room.normalImages[0]}`}
                                    alt="Normal Example" 
                                    style={{ maxWidth: '500px', maxHeight: '500px', border: '1px solid #ccc', borderRadius: '10px', marginTop: '8px' }}
                                />
                            </Box>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <Typography variant="h4" fontWeight={"bold"} gutterBottom>⚠️&ensp;{analysisResult.판단}&ensp;⚠️</Typography>
                        <Typography variant="body1" marginTop={"10px"}>{analysisResult.이유}</Typography>
                    </>
                )}
                <Button variant="outlined" onClick={handleReturnToCamera} sx={{ mt: 3 }}>카메라로 돌아가기</Button>
            </div>
        )}

        {error && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                <Alert severity="error">{error}</Alert>
                <Button variant="outlined" color="inherit" onClick={handleReturnToCamera} sx={{ mt: 2 }}>다시 시도</Button>
            </div>
        )}

        {!(analysisResult || isAnalyzing) && 
        <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '20px' }}>
          <Button variant="contained" color="success" size="large" onClick={() => handleCaptureAndAnalyze('정상')}>정상</Button>
          <Button variant="contained" color="warning" size="large" onClick={() => handleCaptureAndAnalyze('비정상')}>비정상</Button>
          <Button variant="contained" color="error" size="large" onClick={handleStopWork}>종료</Button>
        </div>
        }
       
      </div>
    );
  }

  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!room) return <Container sx={{ mt: 4 }}><Alert severity="info">룸을 찾을 수 없습니다.</Alert></Container>;

  const isCreator = currentUser?.id === room?.creator?.id;
  const canStartWork = (room?.normalImages?.length || 0) > 0 && (room?.abnormalImages?.length || 0) > 0;

  return (
    <Container sx={{ mt: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link component={RouterLink} underline="hover" color="inherit" to="/">
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          홈
        </Link>
        <Typography color="text.primary">{room.name}</Typography>
      </Breadcrumbs>

      <Grid container spacing={1}>
        <Grid sx={{ xs: 12, md: 8, width: "100%", display: 'flex',
        justifyContent: 'center', // 수평 가운데 정렬
        alignItems: 'center' }}>
          <Card sx={{ height: '100%', width:"100%"}}>
            <CardContent>
              <Typography variant="h4" component="h1" gutterBottom>
                {room.name}
              </Typography>
              {!isCreator && (
                <Chip label={`내 포인트: ${userPoints}점`} color="primary" />
              )}
              {!canStartWork && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  작업 시작을 위해 관리자가 정상 및 비정상 이미지를 최소 1장 이상 등록해야 합니다.
                </Alert>
              )}
            </CardContent>
            <CardActions sx={{ 
        justifyContent: 'center', // 수평 가운데 정렬
        alignItems: 'center' }}>
              <Button component={RouterLink} to={`/room/${roomId}/work-instruction`} startIcon={<HelpOutlineIcon />}>
                작업 방법
              </Button>
              <Button variant="contained" onClick={handleStartWork} disabled={!canStartWork} startIcon={<PlayArrowIcon />}>
                작업 시작
              </Button>
              {isCreator && (
                <>
                  <Button onClick={() => setIsSettingsModalOpen(true)} startIcon={<SettingsIcon />}>
                    룸 설정
                  </Button>
                  <Button onClick={() => setIsClassificationModalOpen(true)} startIcon={<ImageIcon />}>
                    분류 이미지 관리
                  </Button>
                  <Button onClick={handleDeleteRoom} color="error" startIcon={<DeleteIcon />}>
                    룸 삭제
                  </Button>
                </>
              )}
            </CardActions>
          </Card>
        </Grid>

        <Grid sx={{ xs: 12, md: 4 , mt: 3, minWidth : "45%"}}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>참여자 목록</Typography>
            <List>
              {room.users && room.users.length > 0 ? (
                room.users.map(user => (
                  <ListItem key={user.id} divider>
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={isCreator ? `${user.username} (${user.email})` : user.username} 
                      secondary={isCreator ? `${allUserPoints[user.id] || 0}점` : user.email} 
                    />
                  </ListItem>
                ))
              ) : (
                <Typography sx={{ p: 2, color: 'text.secondary' }}>참여자가 없습니다.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Modals are kept as they are, to be refactored next */}
      <RoomSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onSave={handleSettingsSave} roomId={roomId} currentSteps={room.steps || {}} users={room.users || []} />
      <ClassificationImageUploadModal
        isOpen={isClassificationModalOpen}
        onClose={() => setIsClassificationModalOpen(false)}
        onSave={handleClassificationImagesSave}
        roomId={roomId}
        currentNormalImages={room.normalImages || []}
        currentAbnormalImages={room.abnormalImages || []}
      />
    </Container>
  );
};

export default RoomDetailPage;