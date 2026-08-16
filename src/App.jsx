import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminPage from './pages/AdminPage';
import './styles/globals.css';

function AdminGuard({ children }) {
  // Real JWT presence check (not just a UI flag). The token itself is
  // verified server-side on every API call by JwtAuthGuard — if it's
  // missing, expired, or invalid, the API returns 401 and the axios
  // interceptor in api/index.js bounces back here automatically.
  const authed = !!localStorage.getItem('lumng_admin_token');
  return authed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/" element={<AdminGuard><AdminPage /></AdminGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
