import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getProducts, createProduct, updateProduct, deactivateProduct, reactivateProduct } from '../../api/products';
import { cache, CACHE_KEYS } from '../cache';

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getProducts({ limit: 200 });
      cache.set(CACHE_KEYS.PRODUCTS);
      return data.data.products;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load products');
    }
  },
  {
    condition: (arg) => {
      if (arg?.force) return true;
      return !cache.isFresh(CACHE_KEYS.PRODUCTS);
    },
  }
);

export const createProductThunk = createAsyncThunk(
  'products/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await createProduct(body);
      cache.invalidate(CACHE_KEYS.PRODUCTS);
      return data.data.product;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to create product');
    }
  }
);

export const updateProductThunk = createAsyncThunk(
  'products/update',
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const { data } = await updateProduct(id, body);
      return data.data.product;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to update product');
    }
  }
);

export const deactivateProductThunk = createAsyncThunk(
  'products/deactivate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await deactivateProduct(id);
      return data.data.product;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to deactivate product');
    }
  }
);

export const reactivateProductThunk = createAsyncThunk(
  'products/reactivate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await reactivateProduct(id);
      return data.data.product;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to reactivate product');
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: { list: [], loading: false, error: null, lastFetched: null },
  reducers: {
    clearProductsError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const updateInList = (state, action) => {
      const idx = state.list.findIndex((p) => p.id === action.payload.id);
      if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
    };

    builder
      .addCase(fetchProducts.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading     = false;
        state.list        = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchProducts.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createProductThunk.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(updateProductThunk.fulfilled,     updateInList)
      .addCase(deactivateProductThunk.fulfilled,  updateInList)
      .addCase(reactivateProductThunk.fulfilled,  updateInList);
  },
});

export const { clearProductsError } = productsSlice.actions;
export default productsSlice.reducer;
