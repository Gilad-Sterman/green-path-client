import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getFlags, getFlagsSummary, resolveFlag, dismissFlag } from '../../api/flags';
import { cache, CACHE_KEYS } from '../cache';

export const fetchFlags = createAsyncThunk(
  'flags/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getFlags({ limit: 100, ...params });
      cache.set(CACHE_KEYS.FLAGS);
      return data.data.flags;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load flags');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.FLAGS);
    },
  }
);

export const fetchFlagsSummary = createAsyncThunk(
  'flags/fetchSummary',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getFlagsSummary(params);
      return data.data.summary;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load flags summary');
    }
  }
);

export const resolveFlagThunk = createAsyncThunk(
  'flags/resolve',
  async ({ id, resolution, resolution_note, document_id }, { rejectWithValue }) => {
    try {
      const { data } = await resolveFlag(id, { resolution, resolution_note, document_id });
      cache.invalidate(CACHE_KEYS.FLAGS);
      return data.data.flag;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to resolve flag');
    }
  }
);

export const dismissFlagThunk = createAsyncThunk(
  'flags/dismiss',
  async ({ id, resolution_note }, { rejectWithValue }) => {
    try {
      const { data } = await dismissFlag(id, { resolution_note });
      cache.invalidate(CACHE_KEYS.FLAGS);
      return data.data.flag;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to dismiss flag');
    }
  }
);

const flagsSlice = createSlice({
  name: 'flags',
  initialState: { list: [], summary: null, loading: false, error: null, lastFetched: null },
  reducers: {
    clearFlagsError:  (state) => { state.error = null; },
    invalidateFlags:  ()      => { cache.invalidate(CACHE_KEYS.FLAGS); },
  },
  extraReducers: (builder) => {
    const updateInList = (state, action) => {
      const idx = state.list.findIndex((f) => f.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    };

    builder
      .addCase(fetchFlags.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchFlags.fulfilled, (state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchFlags.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchFlagsSummary.fulfilled, (state, action) => { state.summary = action.payload; })
      .addCase(resolveFlagThunk.fulfilled, updateInList)
      .addCase(dismissFlagThunk.fulfilled, updateInList);
  },
});

export const { clearFlagsError, invalidateFlags } = flagsSlice.actions;
export default flagsSlice.reducer;
