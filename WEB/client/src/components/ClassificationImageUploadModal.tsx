import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  Typography,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ClassificationImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  roomId: number;
  currentNormalImages: string[];
  currentAbnormalImages: string[];
}

const ClassificationImageUploadModal: React.FC<ClassificationImageUploadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  roomId,
  currentNormalImages,
  currentAbnormalImages,
}) => {
  const [normalImages, setNormalImages] = useState<string[]>([]);
  const [abnormalImages, setAbnormalImages] = useState<string[]>([]);
  const [newNormalFiles, setNewNormalFiles] = useState<File[]>([]);
  const [newAbnormalFiles, setNewAbnormalFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setNormalImages(currentNormalImages);
    setAbnormalImages(currentAbnormalImages);
  }, [currentNormalImages, currentAbnormalImages]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'normal' | 'abnormal') => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (type === 'normal') setNewNormalFiles(prev => [...prev, ...filesArray]);
      else setNewAbnormalFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveImage = (imageUrl: string, type: 'normal' | 'abnormal') => {
    if (type === 'normal') setNormalImages(prev => prev.filter(url => url !== imageUrl));
    else setAbnormalImages(prev => prev.filter(url => url !== imageUrl));
  };

  const handleRemoveNewFile = (fileName: string, type: 'normal' | 'abnormal') => {
    if (type === 'normal') setNewNormalFiles(prev => prev.filter(file => file.name !== fileName));
    else setNewAbnormalFiles(prev => prev.filter(file => file.name !== fileName));
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) return setError('로그인이 필요합니다.');
    setError('');

    try {
      const uploadAndCombine = async (type: 'normal' | 'abnormal', files: File[], existingUrls: string[]) => {
        let uploadedUrls: string[] = [];
        if (files.length > 0) {
          const formData = new FormData();
          files.forEach(file => formData.append('images', file));
          formData.append('type', type);
          const response = await fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}/upload-classification-images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });
          if (!response.ok) throw new Error(`${type === 'normal' ? '정상' : '비정상'} 이미지 업로드 실패`);
          const data = await response.json();
          uploadedUrls = data.imageUrls || [];
        }
        return [...existingUrls, ...uploadedUrls];
      };

      const finalNormalImages = await uploadAndCombine('normal', newNormalFiles, normalImages);
      const finalAbnormalImages = await uploadAndCombine('abnormal', newAbnormalFiles, abnormalImages);

      const updateResponse = await fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}/update-classification-images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ normalImages: finalNormalImages, abnormalImages: finalAbnormalImages }),
      });

      if (!updateResponse.ok) throw new Error('이미지 목록 업데이트 실패');

      setNewNormalFiles([]);
      setNewAbnormalFiles([]);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderImageGrid = (title: string, type: 'normal' | 'abnormal', existingUrls: string[], newFiles: File[]) => (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>{title} ({existingUrls.length + newFiles.length}/100)</Typography>
      <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} fullWidth>
        이미지 추가
        <input type="file" multiple hidden onChange={(e) => handleFileChange(e, type)} accept="image/*" />
      </Button>
      <ImageList sx={{ mt: 1, height: 450 }} cols={3} rowHeight={164}>
        {existingUrls.map((url) => (
          <ImageListItem key={url}>
            <img src={`${import.meta.env.VITE_API_URL}/${url.startsWith('/') ? url.substring(1) : url}`} alt={type} loading="lazy" />
            <ImageListItemBar
              position="top"
              actionIcon={<IconButton sx={{ color: 'white' }} onClick={() => handleRemoveImage(url, type)}><DeleteIcon /></IconButton>}
              actionPosition="right"
            />
          </ImageListItem>
        ))}
        {newFiles.map((file) => (
          <ImageListItem key={file.name}>
            <img src={URL.createObjectURL(file)} alt="New upload" loading="lazy" />
            <ImageListItemBar
              position="top"
              actionIcon={<IconButton sx={{ color: 'white' }} onClick={() => handleRemoveNewFile(file.name, type)}><DeleteIcon /></IconButton>}
              actionPosition="right"
            />
          </ImageListItem>
        ))}
      </ImageList>
    </Paper>
  );

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>분류 이미지 관리</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {renderImageGrid('정상 이미지', 'normal', normalImages, newNormalFiles)}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderImageGrid('비정상 이미지', 'abnormal', abnormalImages, newAbnormalFiles)}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSubmit} variant="contained">저장</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClassificationImageUploadModal;