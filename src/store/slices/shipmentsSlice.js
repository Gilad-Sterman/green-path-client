import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getShipments, createShipment, updateShipmentStatus } from '../../api/shipments';
import { cache, CACHE_KEYS } from '../cache';

export const fetchShipments = createAsyncThunk(
  'shipments/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getShipments({ limit: 100, ...params });
      cache.set(CACHE_KEYS.SHIPMENTS);
      return data.data.shipments;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load shipments');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.SHIPMENTS);
    },
  }
);

export const createShipmentThunk = createAsyncThunk(
  'shipments/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await createShipment(body);
      cache.invalidate(CACHE_KEYS.SHIPMENTS);
      return data.data.shipment;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to create shipment');
    }
  }
);

export const updateShipmentStatusThunk = createAsyncThunk(
  'shipments/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const { data } = await updateShipmentStatus(id, status);
      return data.data.shipment;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to update shipment status');
    }
  }
);

const shipmentsSlice = createSlice({
  name: 'shipments',
  initialState: { list: [], loading: false, error: null, lastFetched: null },
  reducers: {
    clearShipmentsError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const updateInList = (state, action) => {
      const idx = state.list.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    };

    builder
      .addCase(fetchShipments.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchShipments.fulfilled, (state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchShipments.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createShipmentThunk.fulfilled,       (state, action) => { state.list.unshift(action.payload); })
      .addCase(updateShipmentStatusThunk.fulfilled, updateInList);
  },
});

export const { clearShipmentsError } = shipmentsSlice.actions;
export default shipmentsSlice.reducer;
