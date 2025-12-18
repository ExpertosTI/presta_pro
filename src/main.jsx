import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx'
import './index.css'

// Google OAuth Client IDs
const WEB_CLIENT_ID = '609647959676-ujoqo6p8qe10ehu3cro2i26ci8nnks8j.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '609647959676-doioouq2kam90n1qti3fv3spa1ii4atq.apps.googleusercontent.com';

// Detect Android platform (Capacitor)
const isAndroid = typeof window !== 'undefined' &&
  window.Capacitor &&
  window.Capacitor.getPlatform() === 'android';

// Use appropriate Client ID based on platform
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  (isAndroid ? ANDROID_CLIENT_ID : WEB_CLIENT_ID);

console.log('[Auth] Platform:', isAndroid ? 'Android' : 'Web', '| Client ID:', clientId.slice(0, 20) + '...');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)

