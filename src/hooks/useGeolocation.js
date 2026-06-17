import { useState, useEffect, useRef } from 'react';

/**
 * Wraps navigator.geolocation.watchPosition so components always have the
 * latest coords without triggering a fresh prompt on every render.
 *
 * Returned shape:
 * {
 *   lat:           number | null,
 *   lng:           number | null,
 *   accuracy:      number | null,   // metres
 *   status:        'pending' | 'granted' | 'denied' | 'unavailable',
 *   errorMessage:  string | null,
 * }
 *
 * status values:
 *   'pending'     — waiting for the browser permission prompt / first fix
 *   'granted'     — coords are available
 *   'denied'      — user denied permission (PERMISSION_DENIED)
 *   'unavailable' — device/browser can't provide location, or timeout
 */
const useGeolocation = () => {
    const [state, setState] = useState({
        lat: null,
        lng: null,
        accuracy: null,
        status: 'pending',
        errorMessage: null,
    });

    const watchIdRef = useRef(null);

    useEffect(() => {
        if (!navigator?.geolocation) {
            setState((s) => ({
                ...s,
                status: 'unavailable',
                errorMessage: 'Geolocation is not supported by this browser.',
            }));
            return;
        }

        const onSuccess = ({ coords }) => {
            setState({
                lat: coords.latitude,
                lng: coords.longitude,
                accuracy: coords.accuracy,
                status: 'granted',
                errorMessage: null,
            });
        };

        const onError = (err) => {
            if (err.code === err.PERMISSION_DENIED) {
                setState((s) => ({
                    ...s,
                    status: 'denied',
                    errorMessage: 'שירותי המיקום לא אושרו.',
                }));
            } else {
                // POSITION_UNAVAILABLE or TIMEOUT
                setState((s) => ({
                    ...s,
                    status: 'unavailable',
                    errorMessage: 'לא ניתן לאתר מיקום.',
                }));
            }
        };

        const options = {
            enableHighAccuracy: true,
            timeout: 10_000,       // 10 s — after which onError fires with TIMEOUT
            maximumAge: 60_000,    // accept a cached position up to 1 min old
        };

        watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, options);

        return () => {
            if (watchIdRef.current != null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return state;
};

export default useGeolocation;
