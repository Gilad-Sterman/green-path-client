import client from './client';

export const getShipments      = (params)       => client.get('/shipments', { params });
export const getShipment       = (id)            => client.get(`/shipments/${id}`);
export const createShipment    = (body)          => client.post('/shipments', body);
export const updateShipmentStatus = (id, status) => client.patch(`/shipments/${id}/status`, { status });
