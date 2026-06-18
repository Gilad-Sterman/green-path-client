import { useState, useEffect, useRef, useCallback } from 'react';

const useGeolocation = () => {
    const [state, setState] = useState({
        lat: null,
        lng: null,
        accuracy: null,
        status: 'pending',
        errorMessage: null,
    });

    const watchIdRef = useRef(null);

    const stopWatch = () => {
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    const startWatch = useCallback(() => {
        if (!navigator?.geolocation) {
            setState((s) => ({ ...s, status: 'unavailable', errorMessage: 'Geolocation not supported.' }));
            return;
        }

        setState((s) => ({ ...s, status: 'pending', errorMessage: null }));
        stopWatch();

        watchIdRef.current = navigator.geolocation.watchPosition(
            ({ coords }) => {
                setState({
                    lat: coords.latitude,
                    lng: coords.longitude,
                    accuracy: coords.accuracy,
                    status: 'granted',
                    errorMessage: null,
                });
            },
            (err) => {
                setState((s) => ({
                    ...s,
                    status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
                    errorMessage: err.code === err.PERMISSION_DENIED
                        ? 'שירותי המיקום לא אושרו.'
                        : 'לא ניתן לאתר מיקום.',
                }));
            },
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
        );
    }, []);

    useEffect(() => {
        startWatch();
        return stopWatch;
    }, [startWatch]);

    return { ...state, retry: startWatch };
};

export default useGeolocation;
