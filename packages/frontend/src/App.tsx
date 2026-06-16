import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import LoginForm from './features/auth/components/LoginForm.js';
import { useAuthStore } from './features/auth/hooks/useAuthStore.js';
import { useChatStore } from './features/chat/hooks/useChatStore.js'; 
import { PublicRoute, RoleProtectedRoute } from './features/auth/components/AuthGuards.js';
import Dashboard from './pages/Dashboard.js';
import AppLayout from './layouts/AppLayout.js';
import Accounts from './features/accounts/components/Accounts.js';

// Chat components
import ChatLayout from './features/chat/components/ChatLayout.js';
import ChatViewport from './features/chat/components/ChatViewport.js';
import ChatPlaceholder from './features/chat/components/ChatPlaceholder.js';
 
const ALL_AUTHENTICATED: ('SUPER_ADMIN' | 'ADMIN' | 'USER')[] = ['USER', 'ADMIN', 'SUPER_ADMIN'];
const ELEVATED_ADMINS: ('SUPER_ADMIN' | 'ADMIN')[] = ['ADMIN', 'SUPER_ADMIN'];

export default function App() {
  const { isInitializing, accessToken, setAuth, clearAuth } = useAuthStore();
  const { initializeSocket, disconnectSocket } = useChatStore();

  useEffect(() => {
    const bootstrapAsync = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        useAuthStore.setState({ isInitializing: false });
        return;
      }
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await axios.post(`${baseUrl}/auth/refresh`, { refreshToken });
        const { accessToken, user: userData } = res.data;
        setAuth(userData, accessToken, refreshToken);
      } catch (err) {
        clearAuth();
      }
    };
    bootstrapAsync();
  }, [setAuth, clearAuth]);

  // Synchronize WebSocket state to authentication status
  useEffect(() => {
    if (accessToken) {
      initializeSocket(accessToken);
    } else {
      disconnectSocket();
    }
    return () => disconnectSocket();
  }, [accessToken, initializeSocket, disconnectSocket]);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h3>Restoring your secure session...</h3>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginForm />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route element={<RoleProtectedRoute allowedRoles={ALL_AUTHENTICATED} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Master-Detail Routing boundaries for Chat Workspace */}
            <Route path="/chat" element={<ChatLayout />}>
              <Route index element={<ChatPlaceholder />} />
              <Route path=":conversationId" element={<ChatViewport />} />
            </Route>
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={ELEVATED_ADMINS} />}>
            <Route path="/accounts" element={<Accounts />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}