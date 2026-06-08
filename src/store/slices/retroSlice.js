import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as retroApi from '../../api/retro.js';

export const fetchRetroIntakes = createAsyncThunk(
  'retro/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await retroApi.fetchRetroIntakes(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load retro intakes.');
    }
  }
);

export const fetchRetroIntakeById = createAsyncThunk(
  'retro/fetchById',
  async ({ id }, { rejectWithValue }) => {
    try {
      const [batchRes, recordsRes] = await Promise.all([
        retroApi.fetchRetroIntakeById(id),
        retroApi.fetchRetroRecords(id),
      ]);
      return {
        batch:   batchRes.data.data.batch,
        records: recordsRes.data.data.records,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load batch detail.');
    }
  }
);

export const importRetroFile = createAsyncThunk(
  'retro/import',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await retroApi.importRetroFile(formData);
      return res.data.data;
    } catch (err) {
      const serverError = err.response?.data?.error;
      return rejectWithValue(serverError || { message: 'Import failed. Please try again.' });
    }
  }
);

const retroSlice = createSlice({
  name: 'retro',
  initialState: {
    batches:        [],
    selectedBatch:  null,
    records:        [],
    importResult:   null,
    loading:        false,
    detailLoading:  false,
    importLoading:  false,
    error:          null,
  },
  reducers: {
    clearImportResult: (state) => {
      state.importResult = null;
    },
    clearSelectedBatch: (state) => {
      state.selectedBatch = null;
      state.records       = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRetroIntakes.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchRetroIntakes.fulfilled, (state, action) => {
        state.loading = false;
        state.batches = action.payload.batches || [];
      })
      .addCase(fetchRetroIntakes.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      .addCase(fetchRetroIntakeById.pending, (state) => {
        state.detailLoading = true;
        state.error         = null;
      })
      .addCase(fetchRetroIntakeById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selectedBatch = action.payload.batch;
        state.records       = action.payload.records;
      })
      .addCase(fetchRetroIntakeById.rejected, (state, action) => {
        state.detailLoading = false;
        state.error         = action.payload;
      })

      .addCase(importRetroFile.pending, (state) => {
        state.importLoading = true;
        state.importResult  = null;
        state.error         = null;
      })
      .addCase(importRetroFile.fulfilled, (state, action) => {
        state.importLoading = false;
        state.importResult  = { success: true, ...action.payload };
        if (action.payload.batch) {
          state.batches = [action.payload.batch, ...state.batches];
        }
      })
      .addCase(importRetroFile.rejected, (state, action) => {
        state.importLoading = false;
        const payload = action.payload;
        if (payload?.code === 'no-valid-records') {
          state.importResult = {
            success:       false,
            validCount:    payload.details?.validCount    || 0,
            rejectedCount: payload.details?.rejectedCount || 0,
            errors:        payload.details?.errors        || [],
            batch:         null,
          };
        } else {
          state.error = payload?.message || 'Import failed.';
        }
      });
  },
});

export const { clearImportResult, clearSelectedBatch, clearError } = retroSlice.actions;
export default retroSlice.reducer;
