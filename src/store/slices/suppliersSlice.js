import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSuppliers, createSupplier, updateSupplier, deactivateSupplier, reactivateSupplier } from '../../api/suppliers';
import { cache, CACHE_KEYS } from '../cache';

export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getSuppliers({ is_active: undefined, limit: 200 });
      cache.set(CACHE_KEYS.SUPPLIERS);
      return data.data.suppliers;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load suppliers');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.SUPPLIERS);
    },
  }
);

export const createSupplierThunk = createAsyncThunk(
  'suppliers/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await createSupplier(body);
      cache.invalidate(CACHE_KEYS.SUPPLIERS);
      return data.data.supplier;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to create supplier');
    }
  }
);

export const updateSupplierThunk = createAsyncThunk(
  'suppliers/update',
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const { data } = await updateSupplier(id, body);
      return data.data.supplier;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to update supplier');
    }
  }
);

export const deactivateSupplierThunk = createAsyncThunk(
  'suppliers/deactivate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await deactivateSupplier(id);
      return data.data.supplier;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to deactivate supplier');
    }
  }
);

export const reactivateSupplierThunk = createAsyncThunk(
  'suppliers/reactivate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await reactivateSupplier(id);
      return data.data.supplier;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to reactivate supplier');
    }
  }
);

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState: { list: [], loading: false, error: null, lastFetched: null },
  reducers: {
    clearSuppliersError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const updateInList = (state, action) => {
      const idx = state.list.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    };

    builder
      .addCase(fetchSuppliers.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchSuppliers.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createSupplierThunk.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(updateSupplierThunk.fulfilled,     updateInList)
      .addCase(deactivateSupplierThunk.fulfilled,  updateInList)
      .addCase(reactivateSupplierThunk.fulfilled,  updateInList);
  },
});

export const { clearSuppliersError } = suppliersSlice.actions;
export default suppliersSlice.reducer;
