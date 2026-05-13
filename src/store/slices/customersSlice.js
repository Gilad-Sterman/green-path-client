import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCustomers, createCustomer, updateCustomer, deactivateCustomer, reactivateCustomer } from '../../api/customers';
import { cache, CACHE_KEYS } from '../cache';

export const fetchCustomers = createAsyncThunk(
  'customers/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getCustomers({ limit: 200 });
      cache.set(CACHE_KEYS.CUSTOMERS);
      return data.data.customers;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load customers');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.CUSTOMERS);
    },
  }
);

export const createCustomerThunk = createAsyncThunk(
  'customers/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await createCustomer(body);
      cache.invalidate(CACHE_KEYS.CUSTOMERS);
      return data.data.customer;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to create customer');
    }
  }
);

export const updateCustomerThunk = createAsyncThunk(
  'customers/update',
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const { data } = await updateCustomer(id, body);
      return data.data.customer;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to update customer');
    }
  }
);

export const deactivateCustomerThunk = createAsyncThunk(
  'customers/deactivate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await deactivateCustomer(id);
      return data.data.customer;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to deactivate customer');
    }
  }
);

export const reactivateCustomerThunk = createAsyncThunk(
  'customers/reactivate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await reactivateCustomer(id);
      return data.data.customer;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to reactivate customer');
    }
  }
);

const customersSlice = createSlice({
  name: 'customers',
  initialState: { list: [], loading: false, error: null, lastFetched: null },
  reducers: {
    clearCustomersError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const updateInList = (state, action) => {
      const idx = state.list.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    };

    builder
      .addCase(fetchCustomers.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchCustomers.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createCustomerThunk.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(updateCustomerThunk.fulfilled,     updateInList)
      .addCase(deactivateCustomerThunk.fulfilled,  updateInList)
      .addCase(reactivateCustomerThunk.fulfilled,  updateInList);
  },
});

export const { clearCustomersError } = customersSlice.actions;
export default customersSlice.reducer;
