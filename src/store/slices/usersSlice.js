import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getUsers, createUser, deactivateUser, reactivateUser, deleteUser } from '../../api/users';
import { cache, CACHE_KEYS } from '../cache';

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (arg, { rejectWithValue }) => {
    const { force, ...params } = arg || {};
    try {
      const { data } = await getUsers(params);
      cache.set(CACHE_KEYS.USERS(params.factory_id));
      return data.data.users;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load users');
    }
  },
  {
    condition: (arg, { getState }) => {
      const { force, factory_id } = arg || {};
      if (force) return true;
      const { loadedFactoryId } = getState().users;
      const incoming = factory_id ?? null;
      if (String(loadedFactoryId) !== String(incoming)) return true;
      return !cache.isFresh(CACHE_KEYS.USERS(factory_id));
    },
  }
);

export const createUserThunk = createAsyncThunk(
  'users/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await createUser(body);
      return data.data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to create user');
    }
  }
);

export const deactivateUserThunk = createAsyncThunk(
  'users/deactivate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await deactivateUser(id);
      return data.data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to deactivate user');
    }
  }
);

export const reactivateUserThunk = createAsyncThunk(
  'users/reactivate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await reactivateUser(id);
      return data.data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to reactivate user');
    }
  }
);

export const deleteUserThunk = createAsyncThunk(
  'users/delete',
  async (id, { rejectWithValue }) => {
    try {
      await deleteUser(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to delete user');
    }
  }
);

const patchUser = (list, updated) => {
  const idx = list.findIndex((u) => u.id === updated.id);
  if (idx !== -1) list[idx] = { ...list[idx], ...updated };
};

const usersSlice = createSlice({
  name: 'users',
  initialState: { list: [], loading: false, error: null, lastFetched: null, loadedFactoryId: undefined },
  reducers: {
    clearUsersError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending,  (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchUsers.fulfilled,(state, action) => {
        state.loading         = false;
        state.list            = action.payload;
        state.lastFetched     = Date.now();
        state.loadedFactoryId = action.meta.arg?.factory_id ?? null;
      })
      .addCase(fetchUsers.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createUserThunk.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        // active_user_count in factories will be stale
        cache.invalidate(CACHE_KEYS.FACTORIES, CACHE_KEYS.USERS(null));
      })
      .addCase(deactivateUserThunk.fulfilled, (state, action) => {
        patchUser(state.list, action.payload);
        cache.invalidate(CACHE_KEYS.FACTORIES);
      })
      .addCase(reactivateUserThunk.fulfilled, (state, action) => {
        patchUser(state.list, action.payload);
        cache.invalidate(CACHE_KEYS.FACTORIES);
      })
      .addCase(deleteUserThunk.fulfilled, (state, action) => {
        state.list = state.list.filter((u) => u.id !== action.payload);
        cache.invalidate(CACHE_KEYS.FACTORIES);
      });
  },
});

export const { clearUsersError } = usersSlice.actions;
export default usersSlice.reducer;
