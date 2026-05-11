import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import factoriesReducer from './slices/factoriesSlice';
import usersReducer     from './slices/usersSlice';

const store = configureStore({
  reducer: {
    auth:      authReducer,
    factories: factoriesReducer,
    users:     usersReducer,
  },
});

export default store;
