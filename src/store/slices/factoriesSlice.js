import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getFactories, getFactory, createFactory, updateFactory, suspendFactory, unsuspendFactory } from '../../api/factories';
import { cache, CACHE_KEYS } from '../cache';

export const fetchFactories = createAsyncThunk(
  'factories/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getFactories();
      cache.set(CACHE_KEYS.FACTORIES);
      return data.data.factories;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load factories');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.FACTORIES);
    },
  }
);

export const fetchFactory = createAsyncThunk(
  'factories/fetchOne',
  async (arg, { rejectWithValue }) => {
    const id = typeof arg === 'string' ? arg : arg.id;
    try {
      const { data } = await getFactory(id);
      cache.set(CACHE_KEYS.FACTORY(id));
      return data.data.factory;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load factory');
    }
  },
  {
    condition: (arg, { getState }) => {
      const id    = typeof arg === 'string' ? arg : arg?.id;
      const force = typeof arg === 'object' && arg?.force === true;
      if (force || !id) return true;
      const current = getState().factories.current;
      if (!current || String(current.id) !== String(id)) return true;
      return !cache.isFresh(CACHE_KEYS.FACTORY(id));
    },
  }
);

export const createFactoryThunk = createAsyncThunk(
  'factories/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await createFactory(body);
      return data.data.factory; // service returns { factory, manager, factory_id, admin_user_id }
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to create factory');
    }
  }
);

export const updateFactoryThunk = createAsyncThunk(
  'factories/update',
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const { data } = await updateFactory(id, body);
      return data.data.factory;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to update factory');
    }
  }
);

export const suspendFactoryThunk = createAsyncThunk(
  'factories/suspend',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const { data } = await suspendFactory(id, reason);
      return data.data.factory;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to suspend factory');
    }
  }
);

export const unsuspendFactoryThunk = createAsyncThunk(
  'factories/unsuspend',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await unsuspendFactory(id);
      return data.data.factory;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to unsuspend factory');
    }
  }
);

const factoriesSlice = createSlice({
  name: 'factories',
  initialState: {
    list:        [],
    current:     null,
    loading:     false,
    error:       null,
    lastFetched: null,
  },
  reducers: {
    clearFactoriesError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFactories.pending,  (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchFactories.fulfilled,(state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchFactories.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })
      .addCase(fetchFactory.pending,  (state) => { state.loading = true;  state.error = null; state.current = null; })
      .addCase(fetchFactory.fulfilled,(state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(fetchFactory.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createFactoryThunk.fulfilled, (state, action) => {
        if (action.payload) state.list.unshift(action.payload);
        cache.invalidate(CACHE_KEYS.FACTORIES);
      })
      .addCase(updateFactoryThunk.fulfilled, (state, action) => {
        const idx = state.list.findIndex((f) => f.id === action.payload?.id);
        if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
      })
      .addCase(suspendFactoryThunk.fulfilled, (state, action) => {
        const idx = state.list.findIndex((f) => f.id === action.payload?.id);
        if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
        if (state.current?.id === action.payload?.id) state.current = { ...state.current, ...action.payload };
        cache.invalidate(CACHE_KEYS.FACTORIES);
        cache.invalidate(CACHE_KEYS.FACTORY(action.payload.id));
      })
      .addCase(unsuspendFactoryThunk.fulfilled, (state, action) => {
        const idx = state.list.findIndex((f) => f.id === action.payload?.id);
        if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
        if (state.current?.id === action.payload?.id) state.current = { ...state.current, ...action.payload };
        cache.invalidate(CACHE_KEYS.FACTORIES);
        cache.invalidate(CACHE_KEYS.FACTORY(action.payload.id));
      });
  },
});

export const { clearFactoriesError } = factoriesSlice.actions;
export default factoriesSlice.reducer;
