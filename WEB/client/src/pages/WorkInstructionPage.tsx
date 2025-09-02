import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RoomSettingsModal from '../components/RoomSettingsModal';

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface SimpleStep {
  imageUrls: string[];
  description: string;
}

export interface Room {
  id: number;
  name: string;
  password?: string;
  steps: Record<string, SimpleStep[]>;
  users: User[];
  creator: User;
}

const WorkInstructionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const roomId = Number(id);
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [displayedSteps, setDisplayedSteps] = useState<SimpleStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const lastPressTimeRef = useRef(0);

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

      const userResponse = await fetch('https://topaboki.kr/api/user/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!userResponse.ok) throw new Error('사용자 정보를 가져올 수 없습니다.');
      const userData = await userResponse.json();
      setCurrentUser(userData);

      const roomResponse = await fetch(`https://topaboki.kr/api/room/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!roomResponse.ok) {
        const errorData = await roomResponse.json();
        throw new Error(errorData.message || '룸 정보를 가져오는데 실패했습니다.');
      }
      const roomData: Room = await roomResponse.json();
      setRoom(roomData);

      const userSteps = roomData.steps[String(userData.id)];
      const defaultSteps = roomData.steps['default'];

      if (userSteps && userSteps.length > 0) {
        setDisplayedSteps(userSteps);
      } else if (defaultSteps && defaultSteps.length > 0) {
        setDisplayedSteps(defaultSteps);
      } else {
        setDisplayedSteps([]);
      }

    } catch (err: any) {
      console.error('Error fetching details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails();
    }
  }, [roomId]);

  const handleSpeak = useCallback(async () => {
    if (isSpeakingRef.current) return;

    const textToSpeak = displayedSteps[currentStep]?.description;
    if (!textToSpeak) return;

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    try {
      const response = await fetch('https://topaboki.kr/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToSpeak }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(error => {
          console.error("Audio play failed:", error);
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        });
      } else {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      }

    } catch (error) {
      console.error('Error in handleSpeak:', error);
      alert('음성 변환 중 오류가 발생했습니다.');
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    }
  }, [currentStep, displayedSteps]);

  useEffect(() => {
    if (displayedSteps.length > 0 && displayedSteps[currentStep]) {
      handleSpeak();
    }
  }, [currentStep, displayedSteps, handleSpeak]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'n') {
        const now = Date.now();
        if (now - lastPressTimeRef.current < 1000) {
          return;
        }
        lastPressTimeRef.current = now;

        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          if (button.textContent === '다음' || button.textContent === '나가기') {
            button.click();
            break;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const onAudioEnded = () => {
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  };

  const handleSaveSettings = () => {
    setIsSettingsModalOpen(false);
    fetchRoomDetails();
  };

  const handleNext = () => {
    if (displayedSteps && currentStep < displayedSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleExit = () => {
    navigate(`/room/${roomId}`);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>룸 정보를 불러오는 중...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>오류: {error}</div>;
  }

  if (!room) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>룸을 찾을 수 없습니다.</div>;
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>{room.name}: 작업 방법</h1>
      {displayedSteps.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            {(displayedSteps[currentStep].imageUrls || []).map((url, imgIndex) => (
              <img key={imgIndex} src={`https://topaboki.kr/api${url}`} alt={`Work Instruction ${currentStep + 1}-${imgIndex + 1}`} style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', maxHeight: '400px' }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '1.2rem' }}>{displayedSteps[currentStep].description}</p>
            <button onClick={handleSpeak} disabled={isSpeaking} style={{ padding: '8px 12px', fontSize: '1.5rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              {isSpeaking ? '... ' : '🔊'}
            </button>
          </div>
          {currentStep < displayedSteps.length - 1 ? (
            <button onClick={handleNext} style={{ padding: '10px 20px', fontSize: '1rem' }}>다음</button>
          ) : (
            <button onClick={handleExit} style={{ padding: '10px 20px', fontSize: '1rem' }}>나가기</button>
          )}
        </>
      ) : (
        <>
          <p>이 룸에는 작업 지시가 없습니다.</p>
          {currentUser?.id === room.creator.id && (
            <button onClick={() => setIsSettingsModalOpen(true)} style={{ marginTop: '10px', padding: '10px 20px' }}>작업 지시 추가</button>
          )}
          <button onClick={handleExit} style={{ marginTop: '10px', marginLeft: '10px', padding: '10px 20px' }}>나가기</button>
        </>
      )}

      <audio ref={audioRef} onEnded={onAudioEnded} />

      {room && currentUser?.id === room.creator.id && (
        <RoomSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onSave={handleSaveSettings}
          roomId={roomId}
          currentSteps={room.steps || { default: [] }}
          users={room.users || []}
        />
      )}
    </div>
  );
};

export default WorkInstructionPage;
