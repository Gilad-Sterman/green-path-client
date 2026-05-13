import client from './client';

export const getBatches      = (params) => client.get('/batches', { params });
export const getBatch        = (id)     => client.get(`/batches/${id}`);
export const createBatch     = (body)   => client.post('/batches', body);
export const completeBatch   = (id)     => client.patch(`/batches/${id}/complete`);
export const cancelBatch     = (id)     => client.patch(`/batches/${id}/cancel`);
