import { createSlice } from '@reduxjs/toolkit';

const geoSlice = createSlice({
  name: 'geo',
  initialState: {
    watcherActive: false,
    retryCount:    0,
    lat:           null,
    lng:           null,
    accuracy:      null,
    status:        'idle',
    errorMessage:  null,
  },
  reducers: {
    activateWatcher(state) {
      state.watcherActive = true;
    },
    retryWatcher(state) {
      state.watcherActive = true;
      state.retryCount   += 1;
    },
    updateGeoPosition(state, action) {
      const { lat, lng, accuracy, status, errorMessage } = action.payload;
      state.lat          = lat;
      state.lng          = lng;
      state.accuracy     = accuracy;
      state.status       = status;
      state.errorMessage = errorMessage;
    },
  },
});

export const { activateWatcher, retryWatcher, updateGeoPosition } = geoSlice.actions;
export default geoSlice.reducer;
