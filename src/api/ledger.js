import api from './client';

export const getLedgerBalance = (params) => api.get('/ledger/balance', { params });
export const getLedgerEntries = (params) => api.get('/ledger/entries', { params });
