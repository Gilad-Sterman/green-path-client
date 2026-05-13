import client from './client';

export const getProducts  = (params) => client.get('/products', { params });
export const getProduct   = (id)     => client.get(`/products/${id}`);
export const createProduct = (body)  => client.post('/products', body);
export const updateProduct = (id, body) => client.patch(`/products/${id}`, body);
export const deactivateProduct = (id)   => client.patch(`/products/${id}/deactivate`);
export const reactivateProduct = (id)   => client.patch(`/products/${id}/reactivate`);
