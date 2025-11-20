/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { 
  XIcon, Trash2Icon, UploadCloudIcon, UserIcon, 
  ShirtIcon, PlusIcon, ShieldCheckIcon, ZapIcon, 
  GemIcon, LogOutIcon, LayoutGridIcon, FileTextIcon, EditIcon, MoreHorizontalIcon
} from './icons';
import { useUser } from '../UserContext';
import type { WardrobeItem, User } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

interface AdminDashboardProps {
  onLaunchApp: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLaunchApp }) => {
  const { 
      user, 
      logout,
      allUsers, 
      transactions,
      createUser,
      updateUser,
      deleteUser,
      adminAdjustGems,
      globalWardrobe, 
      addGlobalGarment, 
      removeGlobalGarment 
  } = useUser();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'wardrobe'>('overview');
  const [newGarmentName, setNewGarmentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // User Management State
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'user' as 'user'|'admin', gems: 50 });
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'user' as 'user'|'admin' });
  const [gemAdjustment, setGemAdjustment] = useState<number | ''>('');

  const stats = useMemo(() => {
      const totalUsers = allUsers.length;
      const totalGems = allUsers.reduce((acc, u) => acc + u.gems, 0);
      const totalItems = globalWardrobe.length;
      const totalTx = transactions.length;
      const totalPurchased = transactions
        .filter(t => t.type === 'credit')
        .reduce((acc, t) => acc + t.amount, 0);
      const totalUsed = transactions
        .filter(t => t.type === 'debit')
        .reduce((acc, t) => acc + t.amount, 0);
        
      return { totalUsers, totalGems, totalItems, totalTx, totalPurchased, totalUsed };
  }, [allUsers, globalWardrobe, transactions]);

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(tx => 
    tx.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tx.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setUploading(true);
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const newItem: WardrobeItem = {
                id: `global-${Date.now()}`,
                name: newGarmentName || file.name,
                url: reader.result as string
            };
            addGlobalGarment(newItem);
            setNewGarmentName('');
            setUploading(false);
        };
        reader.readAsDataURL(file);
    }
  };

  // Create User Handler
  const handleCreateUser = (e: React.FormEvent) => {
      e.preventDefault();
      try {
        createUser(newUserForm);
        setIsCreateUserOpen(false);
        setNewUserForm({ name: '', email: '', role: 'user', gems: 50 });
      } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to create user');
      }
  };

  // Edit User Handler
  const openEditUser = (u: User) => {
      setEditingUser(u);
      setEditForm({ name: u.name, email: u.email, role: u.role });
      setGemAdjustment('');
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;

      const updates: Partial<User> = {};
      if (editForm.name !== editingUser.name) updates.name = editForm.name;
      if (editForm.email !== editingUser.email) updates.email = editForm.email;
      if (editForm.role !== editingUser.role) updates.role = editForm.role;
      
      if (Object.keys(updates).length > 0) {
          updateUser(editingUser.id, updates);
      }

      if (gemAdjustment !== '' && gemAdjustment !== 0) {
          const amount = Number(gemAdjustment);
          adminAdjustGems(editingUser.id, amount, 'Admin Manual Adjustment');
      }

      setEditingUser(null);
  };
  
  const handleDeleteUser = () => {
      if (!editingUser) return;
      if (confirm(`Are you sure you want to permanently delete ${editingUser.name}?`)) {
          deleteUser(editingUser.id);
          setEditingUser(null);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-gray-800">
          <div className="bg-white/10 p-2 rounded-lg">
             <ShieldCheckIcon className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg tracking-wide">Fit Check</h1>
            <p className="text-xs text-gray-400">Admin Console</p>
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-2">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
                <LayoutGridIcon className="w-5 h-5" /> Overview
            </button>
            <button 
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
                <UserIcon className="w-5 h-5" /> Users & Wallets
            </button>
            <button 
                onClick={() => setActiveTab('transactions')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'transactions' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
                <FileTextIcon className="w-5 h-5" /> Transactions
            </button>
            <button 
                onClick={() => setActiveTab('wardrobe')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'wardrobe' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
                <ShirtIcon className="w-5 h-5" /> Global Wardrobe
            </button>
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
            <button 
                onClick={onLaunchApp}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
            >
                <ZapIcon className="w-5 h-5" /> Launch App
            </button>
            <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
            >
                <LogOutIcon className="w-5 h-5" /> Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto">
        <header className="bg-white border-b px-8 py-5 flex justify-between items-center sticky top-0 z-20">
            <h2 className="text-2xl font-serif font-bold text-gray-800 capitalize">
                {activeTab === 'overview' ? 'Dashboard Overview' : activeTab}
            </h2>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                    {user?.name.charAt(0).toUpperCase()}
                </div>
            </div>
        </header>

        <div className="p-8">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-500 text-sm font-medium">Total Users</span>
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><UserIcon className="w-5 h-5" /></div>
                        </div>
                        <span className="text-3xl font-bold text-gray-900">{stats.totalUsers}</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-500 text-sm font-medium">Total Transactions</span>
                            <div className="p-2 bg-green-50 rounded-lg text-green-600"><FileTextIcon className="w-5 h-5" /></div>
                        </div>
                        <span className="text-3xl font-bold text-gray-900">{stats.totalTx}</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-500 text-sm font-medium">Gems Purchased</span>
                            <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600"><GemIcon className="w-5 h-5" /></div>
                        </div>
                        <span className="text-3xl font-bold text-gray-900">{stats.totalPurchased.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-500 text-sm font-medium">Gems Consumed</span>
                            <div className="p-2 bg-red-50 rounded-lg text-red-600"><ZapIcon className="w-5 h-5" /></div>
                        </div>
                        <span className="text-3xl font-bold text-gray-900">{stats.totalUsed.toLocaleString()}</span>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">Registered Users</h3>
                        <div className="flex gap-3">
                            <input 
                                type="text" 
                                placeholder="Search users..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none w-64"
                            />
                            <button 
                                onClick={() => setIsCreateUserOpen(true)}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" /> Add User
                            </button>
                        </div>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Wallet Balance</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-gray-900">{u.name}</p>
                                            <p className="text-gray-500 text-xs">{u.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-mono font-medium text-gray-700">
                                            <GemIcon className="w-4 h-4 text-yellow-500" />
                                            {u.gems}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => openEditUser(u)}
                                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1 ml-auto"
                                        >
                                            <MoreHorizontalIcon className="w-4 h-4" /> Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <div className="p-12 text-center text-gray-400">No users found.</div>
                    )}
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
                        <input 
                            type="text" 
                            placeholder="Search details..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none w-64"
                        />
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                        {new Date(tx.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {tx.userEmail}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {tx.type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {tx.description}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono font-medium ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTransactions.length === 0 && (
                        <div className="p-12 text-center text-gray-400">No transactions found.</div>
                    )}
                </div>
            )}

            {activeTab === 'wardrobe' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Global Inventory</h3>
                            <p className="text-gray-500 text-sm">Items added here appear for all users.</p>
                        </div>
                        <div className="flex gap-3">
                            <input 
                                type="text" 
                                placeholder="New Item Name" 
                                value={newGarmentName}
                                onChange={(e) => setNewGarmentName(e.target.value)}
                                className="border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-64"
                            />
                            <label className={`bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-gray-800 flex items-center gap-2 transition-colors shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <PlusIcon className="w-4 h-4" />
                                {uploading ? 'Uploading...' : 'Add Item'}
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {globalWardrobe.map(item => (
                            <div key={item.id} className="relative group aspect-square border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                                    <p className="text-white text-xs font-bold mb-3 line-clamp-2">{item.name}</p>
                                    <button 
                                        onClick={() => removeGlobalGarment(item.id)}
                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform hover:scale-110"
                                        title="Delete Item"
                                    >
                                        <Trash2Icon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Create User Modal */}
        <AnimatePresence>
            {isCreateUserOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                         <div className="flex justify-between items-center p-5 border-b">
                            <h3 className="text-lg font-serif font-bold">Create New User</h3>
                            <button onClick={() => setIsCreateUserOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newUserForm.name}
                                    onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                                <input 
                                    type="email" 
                                    required
                                    value={newUserForm.email}
                                    onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role</label>
                                    <select 
                                        value={newUserForm.role}
                                        onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value as 'user'|'admin'})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Starting Gems</label>
                                    <input 
                                        type="number" 
                                        required
                                        min="0"
                                        value={newUserForm.gems}
                                        onChange={(e) => setNewUserForm({...newUserForm, gems: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 mt-2">
                                Create User
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Edit User Modal */}
        <AnimatePresence>
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="flex justify-between items-center p-5 border-b">
                            <h3 className="text-lg font-serif font-bold">Manage User</h3>
                            <button onClick={() => setEditingUser(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveUser} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                                <input 
                                    type="email" 
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role</label>
                                <select 
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({...editForm, role: e.target.value as 'user'|'admin'})}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-gray-600">Current Balance</span>
                                    <span className="text-lg font-bold text-gray-900 flex items-center gap-1">
                                        <GemIcon className="w-4 h-4 text-yellow-500" /> {editingUser.gems}
                                    </span>
                                </div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Add/Deduct Gems</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={gemAdjustment}
                                        onChange={(e) => setGemAdjustment(e.target.value ? parseInt(e.target.value) : '')}
                                        placeholder="e.g. 100 or -50"
                                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Enter a positive number to add credits, negative to deduct.</p>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={handleDeleteUser}
                                    className="flex-1 py-2.5 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 text-sm"
                                >
                                    Delete Account
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 text-sm shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;