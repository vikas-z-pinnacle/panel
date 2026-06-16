import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.js';
import Header from './Header.js';
import Breadcrumbs from '../components/Breadcrumbs.js';

export default function AppLayout() {
  return (
    <div className="flex w-full h-full min-h-screen bg-slate-50">
      {/* Structural Sidebar Sub-Module */}
      <Sidebar />

      {/* Main Board Container Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Structural Header Sub-Module */}
        <Header />

        {/* UTILITY BAR CONTAINER: Houses breadcrumbs cleanly with identical inline padding */}
        <div className="px-8 pt-5">
          <Breadcrumbs />
        </div>

        {/* Inner Context Scroll Viewport Portals */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}