import apiClient from './client.js';

export const fetchRetroIntakes = (params = {}) =>
  apiClient.get('/retro', { params });

export const fetchRetroIntakeById = (id) =>
  apiClient.get(`/retro/${id}`);

export const fetchRetroRecords = (id) =>
  apiClient.get(`/retro/${id}/records`);

export const previewRetroFile = (formData) =>
  apiClient.post('/retro/preview', formData);

export const importRetroFile = (formData) =>
  apiClient.post('/retro', formData);

export const downloadRetroTemplate = () =>
  apiClient.get('/retro/template', { responseType: 'blob' });

export const downloadErrorReport = (id) =>
  apiClient.get(`/retro/${id}/error-report`, { responseType: 'blob' });
