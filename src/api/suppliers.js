import client from './client';

export const getSuppliers  = (params) => client.get('/suppliers', { params });
export const getSupplier   = (id)     => client.get(`/suppliers/${id}`);
export const createSupplier = (body)  => client.post('/suppliers', body);
export const updateSupplier = (id, body) => client.patch(`/suppliers/${id}`, body);
export const deactivateSupplier = (id)   => client.patch(`/suppliers/${id}/deactivate`);
export const reactivateSupplier = (id)   => client.patch(`/suppliers/${id}/reactivate`);
