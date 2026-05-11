import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sendOtp, verifyOtp, refreshToken, logout } from '../../api/auth';
import { getMe } from '../../api/users';

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const sendOtpThunk = createAsyncThunk(
  'auth/sendOtp',
  async (phone_number, { rejectWithValue }) => {
    try {
      await sendOtp(phone_number);
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to send OTP');
    }
  }
);

export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phone_number, code, remember_me }, { rejectWithValue }) => {
    try {
      const { data } = await verifyOtp(phone_number, code, remember_me);
      return data.data; // { accessToken, user }
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Verification failed');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await refreshToken();
      const { accessToken } = data.data;
      // Put token in store NOW so the /users/me call is authenticated
      dispatch(setAccessToken(accessToken));
      const meRes = await getMe();
      return { accessToken, user: meRes.data.data.user };
    } catch {
      return rejectWithValue('Not authenticated');
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logout();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  },
  reducers: {
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setAccessToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;
