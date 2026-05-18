import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCredits, getCreditsSummary } from '../../api/credits';
import { cache, CACHE_KEYS } from '../cache';

export const fetchCredits = createAsyncThunk(
  'credits/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getCredits({ limit: 100, ...params });
      cache.set(CACHE_KEYS.CREDITS);
      return data.data.credits;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load credits');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.CREDITS);
    },
  }
);

export const fetchCreditsSummary = createAsyncThunk(
  'credits/fetchSummary',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getCreditsSummary(params);
      return data.data.summary;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load credits summary');
    }
  }
);

const creditsSlice = createSlice({
  name: 'credits',
  initialState: { list: [], summary: null, loading: false, summaryLoading: false, error: null, lastFetched: null },
  reducers: {
    clearCreditsError: (state) => { state.error = null; },
    invalidateCredits: (state) => {
      cache.invalidate(CACHE_KEYS.CREDITS);
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCredits.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchCredits.fulfilled, (state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchCredits.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchCreditsSummary.pending,   (state) => { state.summaryLoading = true; })
      .addCase(fetchCreditsSummary.fulfilled, (state, action) => { state.summaryLoading = false; state.summary = action.payload; })
      .addCase(fetchCreditsSummary.rejected,  (state) => { state.summaryLoading = false; });
  },
});

export const { clearCreditsError, invalidateCredits } = creditsSlice.actions;
export default creditsSlice.reducer;
