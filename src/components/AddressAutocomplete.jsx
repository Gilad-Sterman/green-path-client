import { useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let scriptPromise = null;

const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&loading=async&language=he`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { scriptPromise = null; reject(new Error('Google Maps load failed')); };
    document.head.appendChild(script);
  });

  return scriptPromise;
};

const AddressAutocomplete = ({ onInputChange, onPlaceSelect, placeholder, required, disabled }) => {
  const containerRef      = useRef(null);
  const elementRef        = useRef(null);
  const onPlaceSelectRef  = useRef(onPlaceSelect);
  const onInputChangeRef  = useRef(onInputChange);
  const skipNextInputRef  = useRef(false);

  const [validated, setValidated] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => { onPlaceSelectRef.current = onPlaceSelect; }, [onPlaceSelect]);
  useEffect(() => { onInputChangeRef.current = onInputChange; }, [onInputChange]);

  useEffect(() => {
    if (!MAPS_API_KEY || !containerRef.current) return;
    let isMounted = true;

    loadGoogleMaps()
      .then(async () => {
        if (!isMounted || !containerRef.current) return;

        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');
        if (!isMounted || !containerRef.current) return;

        const el = new PlaceAutocompleteElement({
          componentRestrictions: { country: ['il'] },
          types: ['address'],
        });

        if (placeholder) el.setAttribute('placeholder', placeholder);
        if (disabled)     el.disabled = true;

        containerRef.current.appendChild(el);
        elementRef.current = el;

        el.addEventListener('gmp-select', async (event) => {
          skipNextInputRef.current = true;
          try {
            const place = event.placePrediction.toPlace();
            await place.fetchFields({ fields: ['formattedAddress', 'location'] });

            const address = place.formattedAddress;
            const lat     = place.location.lat();
            const lng     = place.location.lng();

            setValidated(true);
            onPlaceSelectRef.current({ address, lat, lng });
          } catch (err) {
            skipNextInputRef.current = false;
            console.error('[AddressAutocomplete] place fetch error:', err);
          }
        });

        el.addEventListener('input', () => {
          if (skipNextInputRef.current) {
            skipNextInputRef.current = false;
            return;
          }
          setValidated(false);
          onInputChangeRef.current(el.value || '');
        });
      })
      .catch(() => { if (isMounted) setLoadError(true); });

    return () => {
      isMounted = false;
      elementRef.current?.remove();
      elementRef.current = null;
    };
  }, []);

  return (
    <div className="address-autocomplete">
      <div className={`address-autocomplete__wrap${validated ? ' address-autocomplete__wrap--valid' : ''}`}>
        <div ref={containerRef} className="address-autocomplete__container" />
        {validated && <CheckCircle size={15} className="address-autocomplete__check" />}
      </div>
      {loadError && (
        <span className="field-hint field-hint--error">
          <AlertCircle size={12} /> שגיאה בטעינת Google Maps
        </span>
      )}
      {!MAPS_API_KEY && (
        <span className="field-hint field-hint--error">
          <AlertCircle size={12} /> מפתח Google Maps לא הוגדר (VITE_GOOGLE_MAPS_API_KEY)
        </span>
      )}
    </div>
  );
};

export default AddressAutocomplete;
