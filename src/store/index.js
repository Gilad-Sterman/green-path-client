import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { cache } from './cache';
import authReducer      from './slices/authSlice';
import factoriesReducer from './slices/factoriesSlice';
import usersReducer     from './slices/usersSlice';
import suppliersReducer from './slices/suppliersSlice';
import customersReducer from './slices/customersSlice';
import productsReducer  from './slices/productsSlice';
import intakesReducer   from './slices/intakesSlice';
import batchesReducer   from './slices/batchesSlice';
import shipmentsReducer from './slices/shipmentsSlice';
import creditsReducer   from './slices/creditsSlice';
import flagsReducer     from './slices/flagsSlice';

const combinedReducer = combineReducers({
  auth:      authReducer,
  factories: factoriesReducer,
  users:     usersReducer,
  suppliers: suppliersReducer,
  customers: customersReducer,
  products:  productsReducer,
  intakes:   intakesReducer,
  batches:   batchesReducer,
  shipments: shipmentsReducer,
  credits:   creditsReducer,
  flags:     flagsReducer,
});

const RESET_ACTIONS = new Set(['auth/logout/fulfilled', 'auth/clearAuth']);

const rootReducer = (state, action) => {
  if (RESET_ACTIONS.has(action.type)) {
    cache.clear();
    return combinedReducer(undefined, action);
  }
  return combinedReducer(state, action);
};

const store = configureStore({ reducer: rootReducer });

export default store;
