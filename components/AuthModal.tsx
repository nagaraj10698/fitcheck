
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, ShirtIcon } from './icons';
import { useUser } from '../UserContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
        login(email);
        setIsLoading(false);
        onClose();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="absolute top-4 right-4">
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <ShirtIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">Welcome to Fit Check</h2>
                <p className="text-gray-500 text-sm mb-8 text-center">
                    Sign in to save your wardrobe, track your history, and get free credits.
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading || !email}
                        className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-sm shadow-md hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Signing in...' : 'Continue with Email'}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 w-full text-center">
                    <p className="text-xs text-gray-400">
                        By clicking continue, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
                    </p>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
