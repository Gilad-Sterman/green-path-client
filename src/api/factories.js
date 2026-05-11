import client from './client';

export const getFactories    = (params)    => client.get('/factories', { params });
export const getFactory      = (id)        => client.get(`/factories/${id}`);
export const createFactory   = (data)      => client.post('/factories', data);
export const updateFactory   = (id, data)  => client.patch(`/factories/${id}`, data);
