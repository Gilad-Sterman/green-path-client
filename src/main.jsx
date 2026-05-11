import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store/index.js';
import { injectStore } from './api/client.js';
import './assets/scss/main.scss';
import App from './App.jsx';

// Give the Axios interceptor access to the Redux store without circular imports
injectStore(store);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
