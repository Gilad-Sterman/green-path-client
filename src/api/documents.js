import api from './client';

export const analyzeDocument = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/documents/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadDocument = (file, meta = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(meta).forEach(([k, v]) => { if (v != null) formData.append(k, v); });
  return api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const listDocuments = (params) => api.get('/documents', { params });
export const getDocument   = (id)     => api.get(`/documents/${id}`);
