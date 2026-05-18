import client from './client';

export const getFlags        = (params)       => client.get('/flags', { params });
export const getFlagsSummary = (params)       => client.get('/flags/summary', { params });
export const resolveFlag     = (id, body)     => client.post(`/flags/${id}/resolve`, body);
export const dismissFlag     = (id, body)     => client.post(`/flags/${id}/dismiss`, body);
