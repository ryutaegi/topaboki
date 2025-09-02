import React, { useState, useEffect } from 'react';

interface RoomUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: number;
  jwtToken: string;
}

interface User {
  id: number;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  // 필요한 다른 사용자 정보 필드 추가
}

const RoomUsersModal: React.FC<RoomUsersModalProps> = ({ isOpen, onClose, roomId, jwtToken }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchUsersInRoom();
    }
  }, [isOpen, roomId, jwtToken]);

  const fetchUsersInRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://topaboki.kr/api/room/${roomId}/users`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '룸 사용자 목록을 가져오는데 실패했습니다.');
      }

      const data: User[] = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching users in room:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '500px',
        maxWidth: '90%',
        maxHeight: '80%',
        overflowY: 'auto',
      }}>
        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>룸 사용자 목록</h2>
        {loading && <p>사용자 목록을 불러오는 중...</p>}
        {error && <p style={{ color: 'red' }}>오류: {error}</p>}
        {!loading && !error && (
          users.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {users.map(user => (
                <li key={user.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{user.email || user.username || `${user.firstName} ${user.lastName}`}</span>
                  <span style={{ fontSize: '0.8em', color: '#666' }}>({user.role})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>이 룸에 가입된 사용자가 없습니다.</p>
          )
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomUsersModal;
