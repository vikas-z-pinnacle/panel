import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/hooks/useAuthStore.js';
import { useChatStore } from '../features/chat/hooks/useChatStore.js';
import { LayoutDashboard, Users, ShieldAlert, MessageSquare } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuthStore();
  const { isConnected } = useChatStore();
  const location = useLocation();
  const isAdminTier = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const linkClass = (path: string) => `
    flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors
    ${location.pathname.startsWith(path) 
      ? 'bg-blue-600 text-white' 
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
  `;

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 font-bold text-lg tracking-wide text-blue-400 flex gap-2">
        <ShieldAlert className="w-6 h-6" />
        <span>Panel</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        <Link to="/dashboard" className={linkClass('/dashboard')}>
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </div>
        </Link>

        {/* Real-time Operation Chat workspace link anchor */}
        <Link to="/chat" className={linkClass('/chat')}>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-500 animate-pulse'}`} />
        </Link>

        {isAdminTier && (
          <Link to="/accounts" className={linkClass('/accounts')}>
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>Accounts</span>
            </div>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-400">
        Clearance Level: <span className="font-semibold text-rose-400">{user?.role}</span>
      </div>
    </aside>
  );
}