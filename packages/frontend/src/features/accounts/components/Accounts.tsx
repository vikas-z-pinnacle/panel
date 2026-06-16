import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../config/api.js';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper 
} from '@tanstack/react-table';

interface AccountRecord {
  id: string;
  name: string;
  email: string;
  role: string;
}

const columnHelper = createColumnHelper<AccountRecord>();

const columns = [
  columnHelper.accessor('name', {
    header: () => 'User Profile Identity Name',
    cell: info => <span className="font-semibold text-slate-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor('email', {
    header: () => 'Communication Email Target',
    cell: info => <span className="text-slate-500">{info.getValue()}</span>,
  }),
  columnHelper.accessor('role', {
    header: () => 'Privilege Access Rank',
    cell: info => {
      const role = info.getValue();
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide border shadow-sm
          ${role === 'SUPER_ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-100' : ''}
          ${role === 'ADMIN' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
          ${role === 'USER' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
        `}>
          {role}
        </span>
      );
    },
  }),
];

export default function Accounts() {
  const [data, setData] = useState<AccountRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  // Core data request architecture matching database search specifications
  const fetchAccountsFromBackend = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users/accounts', {
        params: {
          search: searchQuery || undefined,
          role: roleFilter !== 'ALL' ? roleFilter : undefined
        }
      });
      setData(response.data.accounts || []);
    } catch (err: any) {
      setSystemMessage(err.response?.data?.error || 'Access Denied: Core connection failed.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter]);

  // Debounce or trigger fetch cycle on modification state updates
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAccountsFromBackend();
    }, 300); // 300ms network layout input optimization buffer

    return () => clearTimeout(delayDebounceFn);
  }, [fetchAccountsFromBackend]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounts</h1>
        </div>
        
        <button 
          onClick={() => alert('Routing handler redirect target: Dedicated sub-page component initialization.')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create One</span>
        </button>
      </div>

      {systemMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex justify-between items-center">
          <div>🚀 <span className="font-semibold">Node Status:</span> {systemMessage}</div>
          {isLoading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
        </div>
      )}

      {/* FILTER & SEARCH CONFIGURATION ROW INTERFACES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Real-time Data Search input */}
        <div className="md:col-span-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ..."
            className="w-full bg-transparent border-none text-sm text-slate-900 focus:outline-none placeholder-slate-400"
          />
        </div>

        {/* Dedicated Workspace Privilege Dropdown Filter Menu */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </div>
      </div>

      {/* TanStack Table Rendering Port */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-xs flex items-center justify-center z-10 transition-all">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {data.length === 0 && !isLoading && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            No records found.
          </div>
        )}
      </div>
    </div>
  );
}