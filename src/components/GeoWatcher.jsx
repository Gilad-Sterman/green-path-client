import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import useGeolocation from '../hooks/useGeolocation';
import { updateGeoPosition } from '../store/slices/geoSlice';

const GeoWatcher = () => {
  const dispatch = useDispatch();
  const geo      = useGeolocation();

  useEffect(() => {
    dispatch(updateGeoPosition({
      lat:          geo.lat,
      lng:          geo.lng,
      accuracy:     geo.accuracy,
      status:       geo.status,
      errorMessage: geo.errorMessage,
    }));
  }, [geo.lat, geo.lng, geo.accuracy, geo.status, geo.errorMessage, dispatch]);

  return null;
};

export default GeoWatcher;
