import client from './client';

export const sendOtp = (phone_number) =>
  client.post('/auth/send-otp', { phone_number });

export const verifyOtp = (phone_number, code, remember_me) =>
  client.post('/auth/verify-otp', { phone_number, code, remember_me });

export const refreshToken = () =>
  client.post('/auth/refresh');

export const logout = () =>
  client.post('/auth/logout');
