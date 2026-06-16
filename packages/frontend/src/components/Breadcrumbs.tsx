import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl w-fit shadow-sm">
      <Link to="/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        
        // Clean text formatting strings
        const formattedName = name.replace(/-/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());

        return (
          <div key={routeTo} className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-slate-300" />
            {isLast ? (
              <span className="text-slate-800 font-semibold tracking-wide bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                {formattedName}
              </span>
            ) : (
              <Link to={routeTo} className="hover:text-blue-600 transition-colors">
                {formattedName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}