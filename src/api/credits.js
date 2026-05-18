import client from './client';

export const getCredits        = (params)      => client.get('/credits', { params });
export const getCreditsSummary = (params)      => client.get('/credits/summary', { params });
