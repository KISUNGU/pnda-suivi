// frontend/src/components/common/Forms/DynamicForm.tsx
import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
  Button,
  Typography,
  Grid,
  IconButton,
  CircularProgress,
} from '@mui/material';
import GoogleIcon from '../GoogleIcon';
import type { FormField, CollecteForm } from '../../../config/collecteForms';

interface DynamicFormProps {
  form: CollecteForm;
  onSubmit: (data: Record<string, any>, photos: string[]) => Promise<void>;
  onCancel?: () => void;
  initialData?: Record<string, any>;
  initialPhotos?: string[];
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  form,
  onSubmit,
  onCancel,
  initialData = {},
  initialPhotos = [],
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateField = (field: FormField, value: any): string => {
    if (field.required && (!value || value === '')) {
      return `${field.label} est requis`;
    }
    
    if (field.validation && value) {
      if (field.validation.min !== undefined && value < field.validation.min) {
        return `${field.label} doit être supérieur ou égal à ${field.validation.min}`;
      }
      if (field.validation.max !== undefined && value > field.validation.max) {
        return `${field.label} doit être inférieur ou égal à ${field.validation.max}`;
      }
      if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
        return field.validation.message || `${field.label} n'est pas valide`;
      }
    }
    
    return '';
  };

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    const field = form.fields.find(f => f.id === fieldId);
    if (field) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [fieldId]: error }));
    }
  };

  const handlePhotoCapture = (fieldId: string) => {
    // Simuler la capture de photo
    const fakePhoto = `data:image/jpeg;base64,photo_${fieldId}_${Date.now()}_${Math.random().toString(36)}`;
    setPhotos(prev => [...prev, fakePhoto]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    for (const field of form.fields) {
      const value = formData[field.id];
      const error = validateField(field, value);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      await onSubmit(formData, photos);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const error = errors[field.id];
    
    // Vérifier les dépendances
    if (field.dependsOn) {
      const dependValue = formData[field.dependsOn.field];
      if (dependValue !== field.dependsOn.value) {
        return null;
      }
    }
    
    switch (field.type) {
      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={field.label}
            value={value || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            error={!!error}
            helperText={error}
            required={field.required}
            placeholder={field.placeholder}
          />
        );
        
      case 'select':
        return (
          <FormControl fullWidth error={!!error} required={field.required}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              label={field.label}
            >
              <MenuItem value="">Sélectionner...</MenuItem>
              {field.options?.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
        
      case 'radio':
        return (
          <FormControl error={!!error} required={field.required}>
            <FormLabel>{field.label}</FormLabel>
            <RadioGroup
              value={value || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
            >
              {field.options?.map(opt => (
                <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
              ))}
            </RadioGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
        
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => handleChange(field.id, e.target.checked)}
              />
            }
            label={field.label}
          />
        );
        
      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            label={field.label}
            value={value || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            error={!!error}
            helperText={error}
            required={field.required}
            InputLabelProps={{ shrink: true }}
          />
        );
        
      case 'photo':
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {field.label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {photos.map((_photo, index) => (
                <Box key={index} sx={{ position: 'relative' }}>
                  <Box 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: '#F5F5F5', 
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #E0E0E0',
                    }}
                  >
                    <GoogleIcon name="photo_camera" size={32} sx={{ color: '#9E9E9E' }} />
                  </Box>
                  <IconButton 
                    size="small" 
                    sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'white' }}
                    onClick={() => handleRemovePhoto(index)}
                  >
                    <GoogleIcon name="close" size={14} />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<GoogleIcon name="add_a_photo" size={18} />}
                onClick={() => handlePhotoCapture(field.id)}
                sx={{ height: 80, minWidth: 80 }}
              >
                Prendre<br />photo
              </Button>
            </Box>
          </Box>
        );
        
      default:
        return (
          <TextField
            fullWidth
            type={field.type}
            label={field.label}
            value={value || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            error={!!error}
            helperText={error}
            required={field.required}
            placeholder={field.placeholder}
            InputProps={{
              inputProps: field.validation ? {
                min: field.validation.min,
                max: field.validation.max,
              } : {},
            }}
          />
        );
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GoogleIcon name={form.icon} size={28} sx={{ color: '#2E7D32' }} />
        {form.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {form.description}
      </Typography>
      
      <Grid container spacing={3}>
        {form.fields.map((field) => (
          <Grid size={{ xs: 12, md: field.type === 'textarea' ? 12 : 6 }} key={field.id}>
            {renderField(field)}
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ bgcolor: '#2E7D32' }}
        >
          {submitting ? <CircularProgress size={24} /> : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
};
