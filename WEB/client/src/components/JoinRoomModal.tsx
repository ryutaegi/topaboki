import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomId: number, password?: string) => void;
  jwtToken: string;
}

interface Room {
  id: number;
  name: string;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onJoinRoom, jwtToken }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [passwords, setPasswords] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAllRooms();
    }
  }, [isOpen]);

  const fetchAllRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://topaboki.kr/api/room/all', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '룸 목록을 가져오는데 실패했습니다.');
      }
      const data: Room[] = await response.json();
      setRooms(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (roomId: number, value: string) => {
    setPasswords((prev) => ({ ...prev, [roomId]: value }));
  };

  const handleJoinClick = (roomId: number) => {
    onJoinRoom(roomId, passwords[roomId]);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>룸 가입하기</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : rooms.length > 0 ? (
          <List>
            {rooms.map((room) => (
              <ListItem
                key={room.id}
                divider
                secondaryAction={
                  <Box component="form" sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onSubmit={(e) => { e.preventDefault(); handleJoinClick(room.id); }}>
                    <TextField
                      size="small"
                      variant="outlined"
                      type="password"
                      placeholder="비밀번호 (필요시)"
                      value={passwords[room.id] || ''}
                      onChange={(e) => handlePasswordChange(room.id, e.target.value)}
                    />
                    <IconButton type="submit" color="primary" edge="end">
                      <SendIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText primary={room.name} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
            현재 참여할 수 있는 룸이 없습니다.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default JoinRoomModal;
