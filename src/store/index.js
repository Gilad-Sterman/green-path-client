import { configureStore } from '@reduxjs/toolkit';
import authReducer      from './slices/authSlice';
import factoriesReducer from './slices/factoriesSlice';
import usersReducer     from './slices/usersSlice';
import suppliersReducer from './slices/suppliersSlice';
import customersReducer from './slices/customersSlice';
import productsReducer  from './slices/productsSlice';
import intakesReducer  from './slices/intakesSlice';
import batchesReducer  from './slices/batchesSlice';

const store = configureStore({
  reducer: {
    auth:      authReducer,
    factories: factoriesReducer,
    users:     usersReducer,
    suppliers: suppliersReducer,
    customers: customersReducer,
    products:  productsReducer,
    intakes:   intakesReducer,
    batches:   batchesReducer,
  },
});

export default store;
