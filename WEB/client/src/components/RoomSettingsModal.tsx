import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  TextField,
  IconButton,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

import type { User } from '../pages/WorkInstructionPage';

interface SimpleStep {
  imageUrls: string[];
  description: string;
}

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  roomId: number;
  currentSteps: Record<string, SimpleStep[]>;
  users: User[];
}

function TabPanel(props: { children?: React.ReactNode; index: any; value: any }) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({ isOpen, onClose, onSave, roomId, currentSteps, users }) => {
  const [localSteps, setLocalSteps] = useState<Record<string, SimpleStep[]>>({});
  const [tabValue, setTabValue] = useState<string>('default');
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const initialSteps = (currentSteps && typeof currentSteps === 'object' && !Array.isArray(currentSteps)) ? currentSteps : { default: [] };
    setLocalSteps(initialSteps);
  }, [currentSteps]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  const getCurrentUserSteps = () => localSteps[tabValue] || [];

  const handleGenerateDescription = async (userId: number) => {
    setLoadingUserId(userId);
    setError('');
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}/users/${userId}/generate-description`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('AI 설명 생성에 실패했습니다.');
      const data = await response.json();
      const descriptions = data.description.split('\n').map((line: string) => line.replace(/^\d+\. /, ''));
      const newStepsForUser = descriptions.map((desc: string, index: number) => ({
        imageUrls: (localSteps[String(userId)]?.[index]?.imageUrls) || (localSteps['default']?.[index]?.imageUrls) || [],
        description: desc,
      }));
      setLocalSteps(prev => ({ ...prev, [String(userId)]: newStepsForUser }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleStepChange = (index: number, field: 'description', value: string) => {
    const newSteps = [...getCurrentUserSteps()];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setLocalSteps(prev => ({ ...prev, [tabValue]: newSteps }));
  };

  const handleImageUpload = async (index: number, files: FileList) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('images', file));
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('이미지 업로드에 실패했습니다.');
      const data = await response.json();
      const newSteps = [...getCurrentUserSteps()];
      newSteps[index].imageUrls.push(...data.imageUrls);
      setLocalSteps(prev => ({ ...prev, [tabValue]: newSteps }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveImage = (stepIndex: number, imageUrl: string) => {
    const newSteps = [...getCurrentUserSteps()];
    newSteps[stepIndex].imageUrls = newSteps[stepIndex].imageUrls.filter(url => url !== imageUrl);
    setLocalSteps(prev => ({ ...prev, [tabValue]: newSteps }));
  };

  const handleAddStep = () => {
    const newSteps = [...getCurrentUserSteps(), { imageUrls: [], description: '' }];
    setLocalSteps(prev => ({ ...prev, [tabValue]: newSteps }));
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = getCurrentUserSteps().filter((_, i) => i !== index);
    setLocalSteps(prev => ({ ...prev, [tabValue]: newSteps }));
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('jwt_token');
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ steps: localSteps }),
      });
      onSave();
      onClose();
    } catch (err) {
      setError('저장에 실패했습니다.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>룸 설정 수정</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable">
            <Tab label="기본 설정" value="default" />
            {users?.map(user => <Tab label={user.username} value={String(user.id)} key={user.id} />)}
          </Tabs>
        </Box>

        {['default', ...users.map(u => String(u.id))].map(id => (
          <TabPanel value={tabValue} index={id} key={id}>
            {id !== 'default' && (
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  startIcon={loadingUserId === Number(id) ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
                  onClick={() => handleGenerateDescription(Number(id))}
                  disabled={loadingUserId !== null}
                >
                  AI 설명문 생성
                </Button>
              </Box>
            )}
            {getCurrentUserSteps().map((step, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2, border: '1px solid #eee' }}>
                <Grid container spacing={2} direction="column" justifyContent="center">
                  <Grid sx={{ xs: 12 }}>
                    <Typography variant="subtitle1">단계 {index + 1}</Typography>
                  </Grid>
                  <Grid sx={{ xs: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {step.imageUrls.length > 0 && (
                      <ImageList variant="quilted" cols={4} sx={{ width: '95%' }}>
                        {step.imageUrls.map((url, imgIndex) => (
                          <ImageListItem key={imgIndex}>
                            <img src={`${import.meta.env.VITE_API_URL}${url}`} alt={`Step ${index + 1}`} loading="lazy" />
                            <ImageListItemBar
                              position="top"
                              actionIcon={<IconButton onClick={() => handleRemoveImage(index, url)} size="small" sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.3)' }}><DeleteIcon fontSize="small" /></IconButton>}
                              actionPosition="right"
                            />
                          </ImageListItem>
                        ))}
                      </ImageList>
                    )}
                     <Button component="label" variant="outlined" startIcon={<UploadIcon />} sx={{ mt: 1 }}>
                        이미지 업로드
                        <input type="file" multiple hidden onChange={(e) => e.target.files && handleImageUpload(index, e.target.files)} />
                      </Button>
                  </Grid>
                  <Grid sx={{ xs: 12, mt : 3, display: 'flex', justifyContent: 'center'}}>
                    <TextField
                      multiline
                      rows={3}
                      label="단계 설명"
                      value={step.description}
                      onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                      sx={{ width: '95%' }}
                    />
                  </Grid>
                  <Grid sx={{ xs: 12, textAlign: 'right' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => handleRemoveStep(index)}>
                      단계 삭제
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            ))}
            <Button startIcon={<AddIcon />} onClick={handleAddStep} variant="contained">단계 추가</Button>
          </TabPanel>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSubmit} variant="contained">저장</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoomSettingsModal;