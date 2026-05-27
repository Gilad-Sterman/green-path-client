import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getBatches, createBatch, completeBatch, cancelBatch, blockBatch, unblockBatch, failBatch } from '../../api/batches';
import { cache, CACHE_KEYS } from '../cache';

export const fetchBatches = createAsyncThunk(
  'batches/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getBatches({ limit: 100, ...params });
      cache.set(CACHE_KEYS.BATCHES);
      return data.data.batches;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load batches');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.BATCHES);
    },
  }
);

export const createBatchThunk = createAsyncThunk(
  'batches/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await createBatch(body);
      cache.invalidate(CACHE_KEYS.BATCHES);
      return data.data.batch;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to create batch');
    }
  }
);

export const completeBatchThunk = createAsyncThunk(
  'batches/complete',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await completeBatch(id);
      return data.data.batch;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to complete batch');
    }
  }
);

export const cancelBatchThunk = createAsyncThunk(
  'batches/cancel',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await cancelBatch(id);
      return data.data.batch;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to cancel batch');
    }
  }
);

export const blockBatchThunk = createAsyncThunk(
  'batches/block',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await blockBatch(id);
      return data.data.batch;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to block batch');
    }
  }
);

export const unblockBatchThunk = createAsyncThunk(
  'batches/unblock',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await unblockBatch(id);
      return data.data.batch;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to unblock batch');
    }
  }
);

export const failBatchThunk = createAsyncThunk(
  'batches/fail',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await failBatch(id);
      return data.data.batch;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fail batch');
    }
  }
);

const batchesSlice = createSlice({
  name: 'batches',
  initialState: { list: [], loading: false, error: null, lastFetched: null },
  reducers: {
    clearBatchesError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const updateInList = (state, action) => {
      const idx = state.list.findIndex((b) => b.id === action.payload.id);
      if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
    };

    builder
      .addCase(fetchBatches.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchBatches.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createBatchThunk.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(completeBatchThunk.fulfilled, updateInList)
      .addCase(cancelBatchThunk.fulfilled,   updateInList)
      .addCase(blockBatchThunk.fulfilled,    updateInList)
      .addCase(unblockBatchThunk.fulfilled,  updateInList)
      .addCase(failBatchThunk.fulfilled,     updateInList);
  },
});

export const { clearBatchesError } = batchesSlice.actions;
export default batchesSlice.reducer;
