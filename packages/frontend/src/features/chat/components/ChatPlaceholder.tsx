import { MessageSquare } from 'lucide-react';

export default function ChatPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/20">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3 border border-blue-100">
        <MessageSquare className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">No Chat Selected</h3>
      <p className="text-xs text-slate-400 mt-1">Select an active operational context node thread from the sidebar list to get started.</p>
    </div>
  );
}