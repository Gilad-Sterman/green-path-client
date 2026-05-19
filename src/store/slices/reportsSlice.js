import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getReportSummary, getReportMonthly, getReportByType, getReportFactories } from '../../api/reports';

export const fetchReportSummary = createAsyncThunk(
  'reports/fetchSummary',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getReportSummary(params);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load summary');
    }
  }
);

export const fetchReportMonthly = createAsyncThunk(
  'reports/fetchMonthly',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getReportMonthly(params);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load monthly data');
    }
  }
);

export const fetchReportByType = createAsyncThunk(
  'reports/fetchByType',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getReportByType(params);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load type breakdown');
    }
  }
);

export const fetchReportFactories = createAsyncThunk(
  'reports/fetchFactories',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getReportFactories(params);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load factory data');
    }
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    summary:          null,  summaryLoading:    false,
    monthly:          [],    monthlyLoading:    false,
    byType:           [],    byTypeLoading:     false,
    factories:        [],    factoriesLoading:  false,
    error: null,
  },
  reducers: {
    clearReports: (state) => {
      state.summary = null;
      state.monthly = [];
      state.byType  = [];
      state.factories = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportSummary.pending,   (s) => { s.summaryLoading   = true;  s.error = null; })
      .addCase(fetchReportSummary.fulfilled, (s, a) => { s.summaryLoading = false; s.summary = a.payload; })
      .addCase(fetchReportSummary.rejected,  (s, a) => { s.summaryLoading = false; s.error = a.payload; })

      .addCase(fetchReportMonthly.pending,   (s) => { s.monthlyLoading   = true; })
      .addCase(fetchReportMonthly.fulfilled, (s, a) => { s.monthlyLoading = false; s.monthly = a.payload; })
      .addCase(fetchReportMonthly.rejected,  (s, a) => { s.monthlyLoading = false; s.error = a.payload; })

      .addCase(fetchReportByType.pending,    (s) => { s.byTypeLoading    = true; })
      .addCase(fetchReportByType.fulfilled,  (s, a) => { s.byTypeLoading  = false; s.byType = a.payload; })
      .addCase(fetchReportByType.rejected,   (s, a) => { s.byTypeLoading  = false; s.error = a.payload; })

      .addCase(fetchReportFactories.pending,   (s) => { s.factoriesLoading   = true; })
      .addCase(fetchReportFactories.fulfilled, (s, a) => { s.factoriesLoading = false; s.factories = a.payload; })
      .addCase(fetchReportFactories.rejected,  (s, a) => { s.factoriesLoading = false; s.error = a.payload; });
  },
});

export const { clearReports } = reportsSlice.actions;
export default reportsSlice.reducer;
