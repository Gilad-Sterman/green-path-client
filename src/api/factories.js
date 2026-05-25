import client from './client';

export const getFactories    = (params)    => client.get('/factories', { params });
export const getFactory      = (id)        => client.get(`/factories/${id}`);
export const createFactory   = (data)      => client.post('/factories', data);
export const updateFactory   = (id, data)  => client.patch(`/factories/${id}`, data);
export const suspendFactory  = (id, reason) => client.post(`/factories/${id}/suspend`, { reason });
export const unsuspendFactory = (id)       => client.post(`/factories/${id}/unsuspend`);
