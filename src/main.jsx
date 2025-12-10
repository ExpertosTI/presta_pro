import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx'
import './index.css'

// Hardcode Google Client ID as fallback - env var interpolation fails in Docker
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '609647959676-ujoqo6p8qe10ehu3cro2i26ci8nnks8j.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
