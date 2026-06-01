import client from './client';

export const getMe        = ()          => client.get('/users/me');
export const getUsers     = (params)    => client.get('/users', { params });
export const getUser      = (id)        => client.get(`/users/${id}`);
export const createUser   = (data)      => client.post('/users', data);
export const updateUser   = (id, data)  => client.patch(`/users/${id}`, data);
export const deactivateUser  = (id)      => client.patch(`/users/${id}/deactivate`);
export const reactivateUser  = (id)      => client.patch(`/users/${id}/reactivate`);
export const deleteUser      = (id)      => client.delete(`/users/${id}`);
