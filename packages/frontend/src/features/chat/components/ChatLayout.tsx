import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../../config/api.js';
import { Search, Loader2, Plus, MessageSquarePlus, Users, X, Check } from 'lucide-react';
import { useAuthStore } from '../../auth/hooks/useAuthStore.js';

interface RoomMeta {
  id: string;
  roomName: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
}

export default function ChatLayout() {
  const { user: currentUser } = useAuthStore();

  const [rooms, setRooms] = useState<RoomMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [systemUsers, setSystemUsers] = useState<UserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Group Chat specific UI state
  const [activeTab, setActiveTab] = useState<'dm' | 'group'>('dm');
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const navigate = useNavigate();

  const fetchRooms = () => {
    api.get('/chat/rooms')
      .then(res => setRooms(res.data.rooms || []))
      .catch(() => console.error('Failed to load chat channels.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const openNewChatModal = async () => {
    setIsModalOpen(true);
    // Reset modal state
    setActiveTab('dm');
    setGroupName('');
    setSelectedUserIds([]);
    setSearchQuery('');
    
    try {
      const res = await api.get('/users/all-users');
      setSystemUsers(res.data.users || []);
    } catch (err) {
      console.error('Could not populate system directory lists.');
    }
  };

  // Flow A: Create or fetch a DM Room
  const handleStartDM = async (targetUser: UserRecord) => {
    setCreating(true);
    try {
      const res = await api.post('/chat/rooms/dm', {
        targetUserId: targetUser.id,
        targetUserName: targetUser.name
      });
      closeAndNavigate(res.data.room.id);
    } catch (err) {
      console.error('Could not establish DM pipeline channel.');
    } finally {
      setCreating(false);
    }
  };

  // Flow B: Create a multi-user Group Room
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    setCreating(true);
    try {
      const res = await api.post('/chat/rooms/group', {
        name: groupName.trim(),
        userIds: selectedUserIds
      });
      closeAndNavigate(res.data.room.id);
    } catch (err) {
      console.error('Could not construct group room.');
    } finally {
      setCreating(false);
    }
  };

  const closeAndNavigate = (roomId: string) => {
    setIsModalOpen(false);
    fetchRooms();
    navigate(`/chat/${roomId}`);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Filter out the logged-in user so they can't select themselves
  const filteredUsers = systemUsers.filter(u => 
    u.id !== currentUser?.id && 
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-[calc(100vh-12rem)] relative">
      {/* SIDE PANEL */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Operations Chat</h2>
            <button 
              onClick={openNewChatModal}
              className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all rounded-lg cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>
          <div className="bg-slate-100 px-3 py-2 rounded-xl flex items-center gap-2 border border-slate-200">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search threads..." className="bg-transparent text-xs w-full focus:outline-none text-slate-800" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : rooms.length === 0 ? (
            <p className="text-center text-xs text-slate-400 pt-8">No conversation channels found.</p>
          ) : (
            rooms.map(room => (
              <NavLink
                key={room.id}
                to={`/chat/${room.id}`}
                className={({ isActive }) => `block p-3 rounded-xl transition-all ${isActive ? 'bg-blue-50 border border-blue-100 text-blue-900 font-medium' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                <div className="text-sm truncate">{room.roomName}</div>
              </NavLink>
            ))
          )}
        </div>
      </div>

      {/* CHAT VIEWPORT VIEW */}
      <div className="flex-1 flex flex-col bg-white">
        <Outlet />
      </div>

      {/* CREATION MODAL */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-xl flex flex-col max-h-[85%] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-slate-800 font-bold text-sm">New Conversation</span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switches */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 m-2 rounded-xl border">
              <button 
                onClick={() => setActiveTab('dm')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg cursor-pointer transition-all ${activeTab === 'dm' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Direct Message</span>
              </button>
              <button 
                onClick={() => setActiveTab('group')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg cursor-pointer transition-all ${activeTab === 'group' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Group Channel</span>
              </button>
            </div>

            {creating ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 gap-2 text-slate-500 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span>Building communications room record links...</span>
              </div>
            ) : (
              <>
                {/* GROUP SETUP INPUTS */}
                {activeTab === 'group' && (
                  <div className="px-4 py-2 space-y-2 border-b border-slate-100 bg-blue-50/30">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Group Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Project Operations Room"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* DIRECT SEARCH BOX */}
                <div className="p-3 border-b border-slate-100">
                  <input 
                    type="text" 
                    placeholder="Search teammates by name or email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:border-slate-300"
                  />
                </div>

                {/* USER DIRECTORY MEMBER CONTAINER */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[250px]">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-8">No teammates found.</p>
                  ) : (
                    filteredUsers.map(user => {
                      const isSelected = selectedUserIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => activeTab === 'dm' ? handleStartDM(user) : toggleUserSelection(user.id)}
                          className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer group ${isSelected ? 'bg-blue-50/60 border-blue-200' : 'bg-transparent border-transparent hover:bg-slate-50'}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{user.name}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{user.email}</span>
                          </div>
                          {activeTab === 'group' && (
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* GROUP SUBMIT ACTION BAR */}
                {activeTab === 'group' && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedUserIds.length} member{selectedUserIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={handleCreateGroup}
                      disabled={!groupName.trim() || selectedUserIds.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Create Group
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}