import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getIntakes, createIntake, updateIntake, addInternalWeighing } from '../../api/intakes';
import { cache, CACHE_KEYS } from '../cache';

export const fetchIntakes = createAsyncThunk(
  'intakes/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await getIntakes({ limit: 100, ...params });
      cache.set(CACHE_KEYS.INTAKES);
      return data.data.intakes;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load intakes');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.INTAKES);
    },
  }
);

export const createIntakeThunk = createAsyncThunk(
  'intakes/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await createIntake(body);
      cache.invalidate(CACHE_KEYS.INTAKES);
      return data.data.intake;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to create intake');
    }
  }
);

export const addWeighingThunk = createAsyncThunk(
  'intakes/addWeighing',
  async ({ intakeId, body }, { rejectWithValue }) => {
    try {
      const { data } = await addInternalWeighing(intakeId, body);
      cache.invalidate(CACHE_KEYS.FLAGS);
      return { intakeId, record: data.data.record };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'שגיאה בהוספת שקילה פנימית');
    }
  }
);

export const updateIntakeThunk = createAsyncThunk(
  'intakes/update',
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const { data } = await updateIntake(id, body);
      return data.data.intake;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to update intake');
    }
  }
);

const intakesSlice = createSlice({
  name: 'intakes',
  initialState: { list: [], loading: false, error: null, lastFetched: null },
  reducers: {
    clearIntakesError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const updateInList = (state, action) => {
      const idx = state.list.findIndex((i) => i.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    };

    builder
      .addCase(fetchIntakes.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchIntakes.fulfilled, (state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchIntakes.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createIntakeThunk.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(updateIntakeThunk.fulfilled, updateInList)
      .addCase(addWeighingThunk.fulfilled, (state, action) => {
        const { intakeId, record } = action.payload;
        const idx = state.list.findIndex((i) => i.id === intakeId);
        if (idx !== -1) {
          state.list[idx] = {
            ...state.list[idx],
            internal_weight_kg:    record.measured_weight,
            has_internal_weighing: true,
          };
        }
      });
  },
});

export const { clearIntakesError } = intakesSlice.actions;
export default intakesSlice.reducer;
