import api from './client';

export const getReportSummary   = (params) => api.get('/reports/summary',         { params });
export const getReportMonthly   = (params) => api.get('/reports/monthly',          { params });
export const getReportByType    = (params) => api.get('/reports/by-type',          { params });
export const getReportFactories = (params) => api.get('/reports/admin/factories',  { params });
export const downloadCreditsCSV = (params) =>
  api.get('/reports/credits/export', { params, responseType: 'blob' });
