import client from './client';

export const getCustomers  = (params) => client.get('/customers', { params });
export const getCustomer   = (id)     => client.get(`/customers/${id}`);
export const createCustomer = (body)  => client.post('/customers', body);
export const updateCustomer = (id, body) => client.patch(`/customers/${id}`, body);
export const deactivateCustomer = (id)   => client.patch(`/customers/${id}/deactivate`);
export const reactivateCustomer = (id)   => client.patch(`/customers/${id}/reactivate`);
