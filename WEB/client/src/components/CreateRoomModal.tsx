
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomName: string, roomPassword?: string) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreateRoom }) => {
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const handleSubmit = () => {
    if (roomName.trim()) {
      onCreateRoom(roomName, roomPassword);
      setRoomName('');
      setRoomPassword('');
      onClose(); // Close modal on successful submission
    } else {
      alert('룸 이름을 입력해주세요.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} PaperProps={{ component: 'form', onSubmit: (e: React.FormEvent) => { e.preventDefault(); handleSubmit(); } }}>
      <DialogTitle>새 룸 개설</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          새로운 작업을 위한 룸을 만듭니다. 다른 사용자를 초대하여 함께 작업할 수 있습니다.
        </DialogContentText>
        <TextField
          autoFocus
          required
          margin="dense"
          id="roomName"
          label="룸 이름"
          type="text"
          fullWidth
          variant="standard"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <TextField
          margin="dense"
          id="roomPassword"
          label="비밀번호 (선택 사항)"
          type="password"
          fullWidth
          variant="standard"
          value={roomPassword}
          onChange={(e) => setRoomPassword(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button type="submit">개설</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateRoomModal;
