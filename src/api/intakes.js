import client from './client';

export const getIntakes   = (params)     => client.get('/intakes', { params });
export const getIntake    = (id)         => client.get(`/intakes/${id}`);
export const createIntake = (body)       => client.post('/intakes', body);
export const updateIntake = (id, body)   => client.patch(`/intakes/${id}`, body);
