import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    __SWAYPALM_MOUNTED__?: boolean;
  }
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    try {
      registerSW({
        immediate: true,
        onRegisterError() {
          // Ignore SW registration restriction inside embedded iframes
        },
      });
    } catch {
      // Ignore restricted context
    }
  } else {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  window.__SWAYPALM_MOUNTED__ = true;
  createRoot(rootEl).render(<App />);
}
