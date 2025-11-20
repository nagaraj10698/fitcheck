/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { ShirtIcon, UserIcon, LogOutIcon, CreditCardIcon, GemIcon, ShieldCheckIcon } from './icons';
import { useUser } from '../UserContext';

interface HeaderProps {
  onOpenAuth: () => void;
  onOpenPricing: () => void;
  onOpenAdmin: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenAuth, onOpenPricing, onOpenAdmin }) => {
  const { user, gems, logout } = useUser();

  return (
    <header className="w-full py-4 px-4 md:px-8 bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => window.location.reload()}>
              <div className="bg-gray-900 p-2 rounded-lg">
                 <ShirtIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-serif font-bold tracking-wide text-gray-900 hidden sm:block">
                Fit Check
              </h1>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {user ? (
                <>
                    {/* Admin Access */}
                    {user.role === 'admin' && (
                        <button 
                            onClick={onOpenAdmin}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full hover:border-purple-300 hover:bg-purple-100 transition-all text-purple-700"
                            title="Admin Dashboard"
                        >
                            <ShieldCheckIcon className="w-4 h-4" />
                            <span className="text-xs font-bold hidden sm:inline">Admin</span>
                        </button>
                    )}

                    {/* Gem Balance */}
                    <button 
                        onClick={onOpenPricing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:border-blue-300 hover:bg-blue-50 transition-all group"
                        title="Add Gems"
                    >
                        <GemIcon className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-bold text-gray-700">{gems}</span>
                        <span className="text-xs font-medium text-gray-400 group-hover:text-blue-500">+</span>
                    </button>

                    {/* User Dropdown/Profile */}
                    <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-gray-900">{user.name}</p>
                        </div>
                        <div className="relative group">
                            <button className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors">
                                <UserIcon className="w-5 h-5" />
                            </button>
                            {/* Dropdown Menu */}
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
                                <div className="px-4 py-2 border-b border-gray-50 mb-2 md:hidden">
                                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                </div>
                                <button 
                                    onClick={onOpenPricing}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <CreditCardIcon className="w-4 h-4" /> Recharge Wallet
                                </button>
                                <button 
                                    onClick={logout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <LogOutIcon className="w-4 h-4" /> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onOpenPricing}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block"
                    >
                        Pricing
                    </button>
                    <button 
                        onClick={onOpenAuth}
                        className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        Sign In
                    </button>
                </div>
            )}
          </div>
      </div>
    </header>
  );
};

export default Header;