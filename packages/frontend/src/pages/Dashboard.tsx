import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users as UsersIcon, HardDrive } from 'lucide-react';

const chartData = [
  { time: '00:00', load: 30 },
  { time: '04:00', load: 45 },
  { time: '08:00', load: 35 },
  { time: '12:00', load: 85 },
  { time: '16:00', load: 60 },
  { time: '20:00', load: 50 },
  { time: '24:00', load: 70 },
];

export default function Dashboard() {

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Users</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">1,248</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><UsersIcon className="w-6 h-6" /></div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ingestion Rate</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">99.98%</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Activity className="w-6 h-6" /></div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Memory allocation</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">4.2 GB</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><HardDrive className="w-6 h-6" /></div>
        </div>
      </div>

      {/* Interactive Recharts Container */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">System Processing Load (24h)</h3>
          <p className="text-xs text-slate-400">Live hardware telemetry generated via Recharts component</p>
        </div>
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                itemStyle={{ color: '#60a5fa' }}
              />
              <Area type="monotone" dataKey="load" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}