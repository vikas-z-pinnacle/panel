import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/hooks/useAuthStore.js';
import { api } from '../config/api.js';
import { ChevronDown, LogOut, User as UserIcon, Loader2 } from 'lucide-react';

export default function Header() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      // Execute explicit backend cache token teardown
      await api.post('/auth/logout');
    } catch (err) {
      console.error("Session could not be evicted from backend table storage gracefully.", err);
    } finally {
      // Always purge client state memory allocations regardless of net output
      clearAuth();
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">

      <div className="text-sm font-medium text-slate-500">
        {/* Header Content */}
      </div>

      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer focus:outline-none"
          disabled={isLoggingOut}
        >
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm uppercase">
            {user?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-900 leading-none">{user?.name}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wide uppercase">{user?.role}</div>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-[11px] text-slate-400 font-medium">Session identity target</p>
              <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>{isLoggingOut ? 'Terminating...' : 'Sign Out Session'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}