
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, ShirtIcon, GoogleIcon } from './icons';
import { useUser } from '../UserContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, signup } = useUser();

  const resetForm = () => {
      setEmail('');
      setPassword('');
      setName('');
      setReferralCode('');
      setError(null);
  };

  const handleModeSwitch = () => {
      setIsSignUp(!isSignUp);
      resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 600));

        if (isSignUp) {
            await signup(email, password, name, referralCode);
        } else {
            await login(email, password);
        }
        onClose();
        resetForm();
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Authentication failed');
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Simulated Google Login Data - No password needed for Google
        await login('demo.user@gmail.com', undefined, { 
            name: 'Demo User', 
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
            isGoogle: true
        });
        onClose();
    } catch (err) {
        setError('Google sign-in failed');
    } finally {
        setIsLoading(false);
    }
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
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-gray-500 text-sm mb-6 text-center">
                    {isSignUp ? 'Sign up to start your style journey.' : 'Sign in to access your wardrobe.'}
                </p>

                {error && (
                    <div className="w-full bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <div className="w-full space-y-4">
                    <button 
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        Continue with Google
                    </button>

                    <div className="flex items-center gap-4 w-full">
                        <div className="h-px bg-gray-200 flex-grow"></div>
                        <span className="text-xs text-gray-400 font-medium uppercase">or</span>
                        <div className="h-px bg-gray-200 flex-grow"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-3">
                        {isSignUp && (
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm"
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm"
                                disabled={isLoading}
                            />
                        </div>

                        {isSignUp && (
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Referral Code <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                                <input 
                                    type="text" 
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                    placeholder="FRIEND123"
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm uppercase placeholder:normal-case"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading || !email || !password || (isSignUp && !name)}
                            className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-sm shadow-md hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {isLoading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 w-full text-center">
                    <p className="text-sm text-gray-600">
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}
                        <button 
                            onClick={handleModeSwitch} 
                            className="ml-2 font-bold text-gray-900 hover:underline"
                            disabled={isLoading}
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
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
